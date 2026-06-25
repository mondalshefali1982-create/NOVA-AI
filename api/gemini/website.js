const { callGemini, getBody, handleOptions, requirePost, sendError, setCors } = require("../_lib/gemini");

const WEBSITE_TIMEOUT_MS = 55000;
const WEBSITE_RETRIES = 0; // Disable retries so we don't exceed the 60s Vercel execution limit
const REQUIRED_PAGES = ["index", "about", "services", "contact"];

module.exports = async function handler(req, res) {
  const start = Date.now();
  console.log("Function started - website.js");
  console.log("STEP 1 request received");

  setCors(res);
  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  const body = getBody(req);
  const action = body.action || "generate";

  try {
    console.log("[Website Generator] Incoming request:", { action, type: body.type, pageMode: body.pageMode, promptLength: String(body.prompt || "").length });

    if (!["generate", "improve", "regenerate-section", "images"].includes(action)) {
      return res.status(400).json({ error: "Unsupported website generator action.", status: 400 });
    }

    if (action === "images") {
      console.log("[Website Generator] Handling images action");
      const result = addGeneratedImages(body.project);
      console.log("Function finished - website.js. Execution time:", Date.now() - start, "ms");
      return res.status(200).json(result);
    }

    const prompt = buildWebsitePrompt(body, action);
    console.log("[Website Generator] Built prompt. Length:", prompt.length, "chars");

    console.log("STEP 2 calling AI");
    const raw = await callWebsiteModel(prompt);
    console.log("STEP 3 AI response received", Date.now() - start, "ms");
    console.log("[Website Generator] Raw AI response received. Length:", raw.length, "chars");

    console.log("STEP 4 parsing");
    const project = parseWebsiteProject(raw);
    console.log("[Website Generator] Parsed project keys:", Object.keys(project));

    console.log("STEP 5 normalizing");
    const normalized = normalizeApiProject(project, body);

    // Ensure we don't return an empty page
    if (!normalized.html && !normalized.pages?.index) {
      console.warn("[Website Generator] Validation: html and pages.index both empty — using emergency fallback");
      normalized.html = createEmergencyFallbackPage(body.prompt || "website", body.type || "Landing Page");
      normalized.pages = normalized.pages || {};
      normalized.pages.index = normalized.html;
    }

    console.log("STEP 6 returning response");
    console.log("Function finished - website.js. Execution time:", Date.now() - start, "ms");
    return res.status(200).json(normalized);
  } catch (error) {
    console.error("[Website Generator] Handler caught error:", error.message);
    console.error("[Website Generator] Error stack:", error.stack);
    console.log("Function finished with error - website.js. Execution time:", Date.now() - start, "ms");
    
    // Catch timeouts, provider busy, or other generation errors and return the Emergency Fallback Project
    if (action === "generate" || action === "improve" || action === "regenerate-section") {
      console.warn("[Website Generator] Recovering from error — returning production emergency fallback project.");
      const promptText = body.prompt || (body.project?.prompt) || "website";
      const category = body.type || (body.project?.type) || "Landing Page";
      const fallbackHtml = createEmergencyFallbackPage(promptText, category);
      
      const fallbackProject = {
        name: promptText ? inferWebsiteProjectName(promptText, category) : "NOVA Website",
        html: fallbackHtml,
        css: "body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0a0a14; color: #e0e0ff; margin: 0; } .card { text-align: center; padding: 3rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; max-width: 500px; } h1 { font-size: 2rem; margin-bottom: 1rem; background: linear-gradient(135deg, #7c3aed, #2563eb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; } p { color: #a0a0c0; line-height: 1.6; } button { margin-top: 1.5rem; padding: 0.75rem 2rem; background: linear-gradient(135deg, #7c3aed, #2563eb); border: none; border-radius: 0.5rem; color: white; font-size: 1rem; cursor: pointer; }",
        js: "console.log('Emergency fallback loaded');",
        pages: {
          index: fallbackHtml
        },
        analysis: { uiQuality: 80, responsiveness: 85, accessibility: 80, seo: 80 }
      };
      
      const normalized = normalizeApiProject(fallbackProject, body);
      return res.status(200).json(normalized);
    }
    
    sendError(res, error);
  }
};

async function callWebsiteModel(prompt) {
  let lastError = null;

  for (let attempt = 1; attempt <= WEBSITE_RETRIES + 1; attempt += 1) {
    try {
      console.log(`[Website Generator] callWebsiteModel attempt ${attempt}/${WEBSITE_RETRIES + 1}`);

      const result = await withTimeout(
        callGemini(prompt, {
          systemInstruction: getWebsiteSystemInstruction(),
          // Step 3: Optimal maxOutputTokens is 3000 to prevent timeouts and lower token usage
          maxOutputTokens: 3000,
          temperature: 0.3,
          jsonMode: true
        }),
        WEBSITE_TIMEOUT_MS
      );

      if (!String(result || "").trim()) {
        const error = new Error("AI provider returned an empty response.");
        error.statusCode = 502;
        throw error;
      }

      console.log(`[Website Generator] callWebsiteModel attempt ${attempt} succeeded`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`[Website Generator] Attempt ${attempt} failed:`, error.message);

      // Step 7: Smart retry logic. Do not retry on timeouts, validation failures, or bad requests.
      const isTimeout = /timeout/i.test(error.message) || error.statusCode === 504;
      const isValidationError = /validation|empty|JSON|parse/i.test(error.message) || error.statusCode === 502;
      const isBadRequest = error.statusCode === 400;

      if (isTimeout || isValidationError || isBadRequest || attempt > WEBSITE_RETRIES) {
        console.log(`[Website Generator] Non-retryable error (${error.message}). Aborting retry loop.`);
        break;
      }

      const waitMs = 900 * attempt;
      console.log(`[Website Generator] Waiting ${waitMs}ms before retry...`);
      await wait(waitMs);
    }
  }

  const finalError = new Error(toFriendlyAiError(lastError));
  finalError.statusCode = lastError?.statusCode || 503;
  console.error("[Website Generator] All attempts exhausted. Final error:", finalError.message);
  throw finalError;
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error("Generation timeout. Retrying...");
        error.statusCode = 504;
        reject(error);
      }, timeoutMs);
    })
  ]);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toFriendlyAiError(error) {
  const message = String(error?.message || "");
  if (/timeout/i.test(message)) return "Generation timeout. Please try again.";
  if (/JSON|invalid|empty|parse/i.test(message)) return "AI provider returned invalid response. Please retry generation.";
  if (/OPENROUTER|GOOGLE|API_KEY|environment/i.test(message)) return "Website AI provider is not configured correctly.";
  if (/fetch|network|connection/i.test(message)) return "Connection issue detected. Please try again.";
  return message || "The website generator is temporarily unavailable. Please try again.";
}

function getWebsiteSystemInstruction() {
  return `You are NOVA AI's production AI Website Builder, comparable to Lovable, Bolt.new, v0, Framer AI and Webflow AI.

CRITICAL: You must return ONLY a single, valid JSON object.
Do NOT wrap the response in markdown code fences (like ```json).
Do NOT include any explanations, prose, or introductory/concluding remarks.
Do NOT include comments in the JSON.
Start your response with '{' and end with '}'.

The JSON object must strictly match this schema:
{
  "name": "short project name",
  "description": "short project description",
  "html": "complete index.html code",
  "css": "complete style.css code with premium styling, variables, and responsive design",
  "js": "complete script.js code with interactive features and animations",
  "pages": {
    "index": "complete index.html code",
    "about": "complete about.html code (or empty string in single-page mode)",
    "services": "complete services.html code (or empty string in single-page mode)",
    "contact": "complete contact.html code (or empty string in single-page mode)"
  }
}

Guidelines for Generation:
- Every page must be a complete, professional, and deployable HTML5 document (with DOCTYPE, html, head, body, and semantic tags).
- Do not use placeholder text or empty/short-cut sections. Include rich, realistic, copy-written text tailored to the user's business category.
- All HTML pages must reference 'style.css' and 'script.js' via <link> and <script> tags for exported ZIP compatibility.
- Ensure gorgeous, premium, agency-quality UI/UX with beautiful typography (e.g. Inter/Outfit via Google Fonts), perfect spacing, cards, and smooth micro-animations.
- Pages must include: a responsive Navigation Bar with mobile hamburger menu, Hero section, Features/Services, Testimonials, pricing tables, FAQ accordions, and a complete Footer.
- Include SEO meta tags and OpenGraph tags in each page.`;
}

function buildWebsitePrompt(body, action) {
  if (action === "improve") return buildImprovePrompt(body);
  if (action === "regenerate-section") return buildSectionPrompt(body);
  return buildGeneratePrompt(body);
}

function buildGeneratePrompt({ prompt = "", type = "Landing Page", pageMode = "single" }) {
  if (!prompt.trim()) {
    const error = new Error("Website description is required.");
    error.statusCode = 400;
    throw error;
  }

  const categoryGuide = getCategoryGuide(type, prompt);
  const pageInstruction = pageMode === "multi"
    ? `MULTI PAGE MODE:
- Generate pages.index, pages.about, pages.services and pages.contact.
- Each page must be a full HTML document with correct title, meta description, shared navigation and footer.
- Navigation links must use index.html, about.html, services.html and contact.html.
- Every page must reference style.css and script.js for exported ZIP compatibility.
- html must equal pages.index.`
    : `SINGLE PAGE MODE:
- Generate one complete index.html document in html and pages.index.
- Navigation should use smooth-scroll anchor links.
- The document must reference style.css and script.js for exported ZIP compatibility.`;

  return `Create a complete premium ${type}.

USER REQUEST:
${prompt}

AUTOMATIC PROMPT ENHANCEMENT:
Production-ready website, modern UI/UX, mobile-first responsive design, accessibility support, SEO-friendly structure, professional styling, high-quality realistic content, polished interactions and premium visual quality.

QUALITY BAR:
- Output must feel like a real deployable template from Framer, Webflow, v0 or a premium agency.
- Avoid generic beginner layouts, one-screen demos, empty sections, and weak placeholder copy.
- Use strong typography, clear hierarchy, premium spacing, rich cards, buttons, forms, nav, footer and realistic business content.
- Infer colors, branding, imagery direction and mood from the user prompt.

SIZE AND CONSTRAINTS:
- Maximum HTML: 250 lines per page.
- Maximum CSS: 250 lines.
- Maximum JS: 100 lines.
- Keep CSS and JS highly structured and clean.

Mandatory sections:
- Hero
- About
- Services
- Contact

CATEGORY PLAYBOOK:
${categoryGuide}

${pageInstruction}

RETURN THIS EXACT JSON STRUCTURE (no extra text, no markdown code fences, no comments, start with { and end with }):
{
  "name": "short project name",
  "description": "short project description",
  "html": "complete index.html code",
  "css": "complete style.css code with responsive breakpoints",
  "js": "complete script.js code",
  "pages": {
    "index": "complete index.html code",
    "about": "complete about.html code (or empty string in single-page mode)",
    "services": "complete services.html code (or empty string in single-page mode)",
    "contact": "complete contact.html code (or empty string in single-page mode)"
  }
}`;
}

function getCategoryGuide(type, prompt) {
  const value = `${type} ${prompt}`.toLowerCase();
  if (/gym|fitness|trainer|workout/.test(value)) {
    return "Gym/fitness: energetic hero, programs, trainers, transformations, memberships, timetable, testimonials, contact/trial CTA, bold contrast and action-focused copy.";
  }
  if (/cafe|coffee|restaurant|food|menu/.test(value)) {
    return "Cafe/restaurant: warm brand story, menu highlights, signature items, ambience gallery, reservations, opening hours, reviews and local contact details.";
  }
  if (/portfolio|personal|creator|developer|designer/.test(value)) {
    return "Portfolio: personal hero, selected work/case studies, services, process, skills, testimonials, resume/contact CTA and polished project cards.";
  }
  if (/e-?commerce|store|shop|product/.test(value)) {
    return "E-commerce: offer-led hero, product categories, best sellers, benefits, social proof, shipping/returns trust blocks, newsletter and product-card interactions.";
  }
  if (/saas|startup|ai|software/.test(value)) {
    return "SaaS/startup: conversion-focused hero, product visual, feature grid, integrations, workflow/process, pricing, testimonials, FAQ and signup CTAs.";
  }
  if (/education|course|school|academy|learn/.test(value)) {
    return "Education: outcomes-led hero, course catalog, instructors, learning path, success stats, pricing/enrollment, student stories, FAQ and admissions CTA.";
  }
  if (/blog|magazine|news/.test(value)) {
    return "Blog: editorial hero, categories, featured articles, author block, newsletter, popular posts, clean reading hierarchy and SEO-friendly article cards.";
  }
  return "Business/agency: premium hero, services, process, case-study style proof, stats, team, pricing or packages, testimonials, FAQ and contact form.";
}

function buildImprovePrompt({ instruction = "", project = {} }) {
  if (!instruction.trim()) {
    const error = new Error("Improvement instruction is required.");
    error.statusCode = 400;
    throw error;
  }

  return `Improve the existing website without rebuilding from scratch.

USER INSTRUCTION:
${instruction}

EXISTING PROJECT JSON:
${JSON.stringify(project)}

Rules:
- Preserve current brand intent, pages, navigation, content direction and functionality unless the instruction asks to change them.
- Upgrade the requested areas with premium layout, typography, spacing, components, responsive behavior and animations.
- Keep output complete and valid. Do not omit unchanged files.

Return ONLY valid JSON with name, html, pages, css, js and analysis. No markdown. No prose. Start with {.`;
}

function buildSectionPrompt({ section = "hero", project = {} }) {
  return `Regenerate only the ${section} section of this website. Do not rebuild the whole site.

EXISTING PROJECT JSON:
${JSON.stringify(project)}

Rules:
- Replace or improve only the ${section} section across the relevant HTML pages.
- Keep unrelated sections, navigation, forms, footer, pages and features intact.
- Add/update only the CSS and JS needed for the regenerated section.
- Make the section premium, realistic, responsive, accessible and visually stronger.

Return ONLY valid JSON with the full updated name, html, pages, css, js and analysis. No markdown. Start with {.`;
}

function addGeneratedImages(project = {}) {
  const promptBase = `${project.name || project.prompt || "premium website"} website`;
  const heroUrl = pollinationsUrl(`${promptBase} hero image, premium web design, cinematic, high quality`);
  const backgroundUrl = pollinationsUrl(`${promptBase} abstract background, modern, elegant, high quality`);
  const featureUrl = pollinationsUrl(`${promptBase} feature illustration, professional, polished`);

  const imageCss = `
:root {
  --nova-hero-image: url("${heroUrl}");
  --nova-bg-image: url("${backgroundUrl}");
  --nova-feature-image: url("${featureUrl}");
}
.hero::after, .hero-visual, .visual-card {
  background-image: var(--nova-hero-image);
  background-size: cover;
  background-position: center;
}
.feature-card:nth-child(1)::before, .service-card:nth-child(1)::before {
  background-image: var(--nova-feature-image);
  background-size: cover;
  background-position: center;
}
body::before {
  background-image: var(--nova-bg-image);
  background-size: cover;
  background-position: center;
}
`;

  return normalizeApiProject({
    ...project,
    css: `${project.css || ""}\n\n/* NOVA generated website images */\n${imageCss}`,
    analysis: project.analysis
  }, { project });
}

function pollinationsUrl(prompt) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
}

// =============================================================================
// Hardened Parser & Extraction Engine
// =============================================================================

function parseWebsiteProject(raw) {
  console.log("[Website Parser] Starting parse. Raw length:", raw.length);
  const text = String(raw || "").trim();

  // Strip markdown fences first to check if the content inside is raw HTML
  const stripped = stripMarkdownFences(text);

  // Check if response is raw HTML
  const isRawHtml = /^\s*<!DOCTYPE/i.test(stripped) || 
                     /^\s*<html/i.test(stripped) || 
                     (stripped.includes("<html") && stripped.includes("</html>")) || 
                     (stripped.includes("<body") && stripped.includes("</body>"));

  if (isRawHtml) {
    console.warn("[Website Parser] Raw response appears to be raw HTML. Skipping JSON parsing.");
    return { html: stripped, css: "", js: "", pages: { index: stripped }, name: "NOVA Website" };
  }

  // Step 1: Direct parse
  const direct = tryParseJson(text);
  if (direct && isValidProjectShape(direct)) {
    console.log("[Website Parser] SUCCESS: Direct JSON parse");
    return unwrapProject(direct);
  }

  // Step 2: Strip common markdown fences and try again
  if (stripped !== text) {
    const fromStripped = tryParseJson(stripped);
    if (fromStripped && isValidProjectShape(fromStripped)) {
      console.log("[Website Parser] SUCCESS: Parsed after stripping markdown fences");
      return unwrapProject(fromStripped);
    }
  }

  // Step 3: Extract first balanced JSON object
  const extracted = extractBalancedJson(text);
  if (extracted) {
    console.log("[Website Parser] Extracted JSON substring. Length:", extracted.length);
    const fromExtracted = tryParseJson(extracted);
    if (fromExtracted && isValidProjectShape(fromExtracted)) {
      console.log("[Website Parser] SUCCESS: Parsed from extracted JSON");
      return unwrapProject(fromExtracted);
    }
  }

  // Step 4: Try to repair truncated JSON
  const repairedDirect = repairTruncatedJson(text);
  if (repairedDirect) {
    const fromRepaired = tryParseJson(repairedDirect);
    if (fromRepaired && isValidProjectShape(fromRepaired)) {
      console.log("[Website Parser] SUCCESS: Parsed from repaired JSON (truncation recovery)");
      return unwrapProject(fromRepaired);
    }
  }

  if (extracted) {
    const repairedExtracted = repairTruncatedJson(extracted);
    if (repairedExtracted) {
      const fromRepairedExtracted = tryParseJson(repairedExtracted);
      if (fromRepairedExtracted && isValidProjectShape(fromRepairedExtracted)) {
        console.log("[Website Parser] SUCCESS: Parsed from repaired extracted JSON");
        return unwrapProject(fromRepairedExtracted);
      }
    }
  }

  // Step 5: Field-level regex extraction
  console.warn("[Website Parser] All JSON parse attempts failed. Attempting field-level extraction...");
  const extracted_fields = extractFieldsViaRegex(text);
  if (extracted_fields.html || extracted_fields.css) {
    console.log("[Website Parser] SUCCESS: Recovered fields via regex extraction:", Object.keys(extracted_fields).filter(k => extracted_fields[k]));
    return extracted_fields;
  }

  // Step 6: Last resort — check if text contains HTML at all
  if (/<html|<!DOCTYPE/i.test(text)) {
    console.warn("[Website Parser] Unparseable response contains HTML. Using as html field.");
    return { html: text, css: "", js: "", pages: { index: text }, name: "NOVA Website" };
  }

  // STEP 7: Emergency fallback
  console.error("[Website Parser] FAILED: Returning production emergency fallback project.");
  return {
    name: "Generated Website",
    html: "",
    css: "",
    js: "",
    pages: {}
  };
}

function isValidProjectShape(value) {
  if (!value || typeof value !== "object") return false;
  return (
    typeof value.html === "string" ||
    typeof value.css === "string" ||
    (value.pages && typeof value.pages === "object") ||
    typeof value.name === "string"
  );
}

function stripMarkdownFences(text) {
  return text
    .replace(/^```(?:json|html)?\s*\n?([\s\S]*?)\n?```\s*$/i, "$1")
    .replace(/^```(?:json|html)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function repairTruncatedJson(text) {
  let inString = false;
  let escaped = false;
  const stack = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (char === "\\") { escaped = true; continue; }
      if (char === '"') { inString = false; }
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === "{") stack.push("}");
    else if (char === "[") stack.push("]");
    else if (char === "}" || char === "]") stack.pop();
  }

  if (stack.length === 0) return text;

  const closing = stack.reverse().join("");
  return text + closing;
}

function extractFieldsViaRegex(text) {
  const result = { html: "", css: "", js: "", pages: {}, name: "NOVA Website" };

  const nameMatch = text.match(/"name"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (nameMatch) result.name = nameMatch[1];

  result.html = extractLargeStringField(text, "html") || "";
  result.css = extractLargeStringField(text, "css") || "";
  result.js = extractLargeStringField(text, "js") || "";

  const indexHtml = extractLargeStringField(text, "index") || result.html;
  if (indexHtml) result.pages.index = indexHtml;

  const aboutHtml = extractLargeStringField(text, "about") || "";
  if (aboutHtml) result.pages.about = aboutHtml;

  const servicesHtml = extractLargeStringField(text, "services") || "";
  if (servicesHtml) result.pages.services = servicesHtml;

  const contactHtml = extractLargeStringField(text, "contact") || "";
  if (contactHtml) result.pages.contact = contactHtml;

  return result;
}

function extractLargeStringField(text, fieldName) {
  const pattern = new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "s");
  const match = text.match(pattern);
  if (match) {
    try {
      return JSON.parse(`"${match[1]}"`);
    } catch {
      return match[1];
    }
  }
  return null;
}

function unwrapProject(value) {
  if (value?.json) return unwrapProject(value.json);
  if (value?.project && typeof value.project === "object") return unwrapProject(value.project);
  return value;
}

function tryParseJson(value) {
  try {
    const cleaned = stripMarkdownFences(String(value || ""));
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function extractBalancedJson(text) {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) { escaped = false; }
      else if (char === "\\") { escaped = true; }
      else if (char === '"') { inString = false; }
      continue;
    }
    if (char === '"') { inString = true; }
    else if (char === "{") { if (depth === 0) start = index; depth += 1; }
    else if (char === "}") { depth -= 1; if (depth === 0 && start >= 0) return text.slice(start, index + 1); }
  }

  return "";
}

// =============================================================================
// Style, Script, Image, and SVG Cleaners & Extractors
// =============================================================================

function cleanAndExtractProject(project) {
  const clean = { ...project };
  let accumulatedCss = String(clean.css || "");
  let accumulatedJs = String(clean.js || "");

  if (clean.html) {
    const res = extractStylesAndScripts(clean.html, accumulatedCss, accumulatedJs);
    clean.html = res.html;
    accumulatedCss = res.css;
    accumulatedJs = res.js;
  }

  if (clean.pages && typeof clean.pages === "object") {
    clean.pages = { ...clean.pages };
    for (const pageKey of Object.keys(clean.pages)) {
      if (clean.pages[pageKey]) {
        const res = extractStylesAndScripts(clean.pages[pageKey], accumulatedCss, accumulatedJs);
        clean.pages[pageKey] = res.html;
        accumulatedCss = res.css;
        accumulatedJs = res.js;
      }
    }
  }

  clean.css = accumulatedCss;
  clean.js = accumulatedJs;
  return clean;
}

function extractStylesAndScripts(htmlText, existingCss = "", existingJs = "") {
  let html = String(htmlText || "");
  let css = String(existingCss || "");
  let js = String(existingJs || "");

  // Extract <style> ... </style>
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  styleRegex.lastIndex = 0;
  while ((styleMatch = styleRegex.exec(html)) !== null) {
    const styleContent = styleMatch[1].trim();
    if (styleContent) {
      css = css ? css + "\n\n" + styleContent : styleContent;
    }
  }
  html = html.replace(styleRegex, "");

  // Extract <script> ... </script> (inline only, or references to script.js)
  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  const scriptBlocksToRemove = [];
  
  scriptRegex.lastIndex = 0;
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    const attrs = scriptMatch[1];
    const scriptContent = scriptMatch[2].trim();
    
    if (!/src\s*=\s*/i.test(attrs)) {
      if (scriptContent) {
        js = js ? js + "\n\n" + scriptContent : scriptContent;
      }
      scriptBlocksToRemove.push(scriptMatch[0]);
    } else {
      if (/script\.js/i.test(attrs)) {
        scriptBlocksToRemove.push(scriptMatch[0]);
      }
    }
  }
  
  scriptBlocksToRemove.forEach(block => {
    html = html.replace(block, "");
  });

  return { html, css, js };
}

function replaceWithPremiumImages(htmlText, cssText, category = "", promptText = "") {
  let html = String(htmlText || "");
  let css = String(cssText || "");
  const type = String(category || "website").toLowerCase();

  const curatedImages = {
    gym: [
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=800&auto=format&fit=crop"
    ],
    cafe: [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1498804103079-a6351b050096?q=80&w=800&auto=format&fit=crop"
    ],
    restaurant: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop"
    ],
    saas: [
      "https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop"
    ],
    portfolio: [
      "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1541462608141-2ff01dd914c0?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?q=80&w=600&auto=format&fit=crop"
    ],
    ecommerce: [
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop"
    ],
    business: [
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop"
    ]
  };

  let catKey = "business";
  for (const key of Object.keys(curatedImages)) {
    if (type.includes(key) || promptText.toLowerCase().includes(key)) {
      catKey = key;
      break;
    }
  }

  const stockList = curatedImages[catKey];
  let stockIndex = 0;

  const imgRegex = /<img([^>]+)src=["']([^"']*)["']([^>]*)/gi;
  html = html.replace(imgRegex, (match, before, src, after) => {
    const altMatch = (before + after).match(/alt=["']([^"']*)["']/i);
    const altText = altMatch ? altMatch[1].trim() : "";

    let newSrc = src;
    
    if (!src || src.includes("unsplash.com") || src.includes("placeholder") || src.startsWith("images/") || src.startsWith("assets/")) {
      if (altText && altText.length > 3) {
        newSrc = `https://image.pollinations.ai/prompt/${encodeURIComponent(altText + ", professional stock photo, high resolution, clean lighting")}`;
      } else {
        newSrc = stockList[stockIndex % stockList.length];
        stockIndex++;
      }
    }
    return `<img${before}src="${newSrc}"${after}`;
  });

  const bgRegex = /url\(["']?([^"')]*unsplash\.com[^"')]*)["']?\)/gi;
  html = html.replace(bgRegex, (match, url) => {
    const newSrc = stockList[0];
    return `url("${newSrc}")`;
  });

  css = css.replace(bgRegex, (match, url) => {
    const newSrc = stockList[0];
    return `url("${newSrc}")`;
  });

  return { html, css };
}

function repairSvgCode(htmlText) {
  let html = String(htmlText || "");

  const svgTagRegex = /<svg([^>]+)>/gi;
  html = html.replace(svgTagRegex, (match, attrs) => {
    let newAttrs = attrs;

    if (!/xmlns\s*=/i.test(newAttrs)) {
      newAttrs += ' xmlns="http://www.w3.org/2000/svg"';
    }

    newAttrs = newAttrs.replace(/\b(cx|cy)\s*=\s*["'][^"']*["']/gi, "");

    const widthMatch = newAttrs.match(/\bwidth\s*=\s*["']([^"']*)["']/i);
    const heightMatch = newAttrs.match(/\bheight\s*=\s*["']([^"']*)["']/i);
    const viewBoxMatch = newAttrs.match(/\bviewBox\s*=\s*["']([^"']*)["']/i);

    if (!viewBoxMatch && widthMatch && heightMatch) {
      const w = parseFloat(widthMatch[1]) || 24;
      const h = parseFloat(heightMatch[1]) || 24;
      newAttrs += ` viewBox="0 0 ${w} ${h}"`;
    } else if (!viewBoxMatch && !widthMatch && !heightMatch) {
      newAttrs += ' width="24" height="24" viewBox="0 0 24 24"';
    }

    return `<svg${newAttrs}>`;
  });

  return html;
}

// =============================================================================
// Project Normalizer
// =============================================================================

function normalizeApiProject(project, body = {}) {
  const source = project || {};
  const existing = body.project || {};
  const pageMode = source.pageMode || body.pageMode || existing.pageMode || "single";

  // 1. Run style/script extraction to clean HTML and aggregate CSS/JS
  const cleaned = cleanAndExtractProject(source);

  // 2. Map and normalize subpages
  const rawHtml = cleaned.html || cleaned.pages?.index || existing.html || existing.pages?.index || "";
  const pages = normalizePages(cleaned.pages || existing.pages, rawHtml, pageMode);
  let html = rawHtml || pages.index || "";

  let css = String(cleaned.css || existing.css || "");
  let js = String(cleaned.js || existing.js || "");

  // 3. Repair all image URLs and SVGs
  const promptText = body.prompt || existing.prompt || "";
  const category = body.type || existing.type || "Landing Page";

  // Index page repair
  const indexRepair = replaceWithPremiumImages(html, css, category, promptText);
  html = repairSvgCode(indexRepair.html);
  css = indexRepair.css;

  // Subpages repair
  const repairedPages = {};
  for (const [key, pageHtml] of Object.entries(pages)) {
    if (pageHtml) {
      const pageRepair = replaceWithPremiumImages(pageHtml, css, category, promptText);
      repairedPages[key] = repairSvgCode(pageRepair.html);
      css = pageRepair.css; // Accumulate any dynamic backgrounds from subpages
    } else {
      repairedPages[key] = "";
    }
  }

  console.log("[Website Normalizer] Final normalized and repaired project:", {
    htmlLength: html.length,
    cssLength: css.length,
    jsLength: js.length,
    pageKeys: Object.keys(repairedPages)
  });

  return {
    name: cleaned.name || existing.name || "NOVA Website",
    html: ensureExportReferences(html || repairedPages.index),
    pages: Object.fromEntries(
      Object.entries(repairedPages).map(([key, value]) => [key, ensureExportReferences(value)])
    ),
    css,
    js,
    analysis: normalizeAnalysis(cleaned.analysis || existing.analysis)
  };
}

function normalizePages(pages = {}, html = "", pageMode = "single") {
  const normalized = {
    index: pages.index || html || ""
  };

  if (pageMode === "multi" || pages.about || pages.services || pages.contact) {
    REQUIRED_PAGES.forEach((page) => {
      normalized[page] = pages[page] || (page === "index" ? normalized.index : createFallbackPage(page, normalized.index));
    });
  }

  return normalized;
}

function createFallbackPage(page, indexHtml) {
  const title = page.charAt(0).toUpperCase() + page.slice(1);
  const body = extractHtmlPart(indexHtml, "body") || "";
  const nav = body.match(/<nav[\s\S]*?<\/nav>/i)?.[0] || "";
  const footer = body.match(/<footer[\s\S]*?<\/footer>/i)?.[0] || "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${title} page for this NOVA generated website.">
  <title>${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  ${nav}
  <main class="page-shell section">
    <p class="eyebrow">${title}</p>
    <h1>${title}</h1>
    <p>This page continues the same premium website experience with focused ${title.toLowerCase()} content.</p>
  </main>
  ${footer}
  <script defer src="script.js"></script>
</body>
</html>`;
}

// FIX: Emergency fallback page when AI completely fails to return usable content
function createEmergencyFallbackPage(prompt, type) {
  const title = `${type} — ${prompt.slice(0, 40)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0a0a14; color: #e0e0ff; margin: 0; }
    .card { text-align: center; padding: 3rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; max-width: 500px; }
    h1 { font-size: 2rem; margin-bottom: 1rem; background: linear-gradient(135deg, #7c3aed, #2563eb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    p { color: #a0a0c0; line-height: 1.6; }
    .retry { margin-top: 1.5rem; padding: 0.75rem 2rem; background: linear-gradient(135deg, #7c3aed, #2563eb); border: none; border-radius: 0.5rem; color: white; font-size: 1rem; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h1>NOVA Website Generator</h1>
    <p>Your website is being generated. If this placeholder is visible, please click Regenerate to try again.</p>
    <p style="margin-top:0.5rem; font-size:0.85rem; opacity:0.6;">Prompt: "${prompt.slice(0, 80)}"</p>
    <button class="retry" onclick="history.back()">← Go Back & Retry</button>
  </div>
</body>
</html>`;
}

function extractHtmlPart(html, tagName) {
  const match = String(html || "").match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? match[1].trim() : "";
}

function ensureExportReferences(html = "") {
  let output = String(html || "");
  if (!output.trim()) return "";

  if (!/<link[^>]+href=["']style\.css["'][^>]*>/i.test(output)) {
    output = output.replace(/<\/head>/i, '  <link rel="stylesheet" href="style.css">\n</head>');
  }

  if (!/<script[^>]+src=["']script\.js["'][^>]*><\/script>/i.test(output)) {
    output = output.replace(/<\/body>/i, '  <script defer src="script.js"></script>\n</body>');
  }

  return output;
}

function normalizeAnalysis(analysis = {}) {
  return {
    uiQuality: clampScore(analysis.uiQuality || analysis.ui || 92),
    responsiveness: clampScore(analysis.responsiveness || 95),
    accessibility: clampScore(analysis.accessibility || 90),
    seo: clampScore(analysis.seo || 91)
  };
}

function clampScore(value) {
  const score = Number(value);
  if (Number.isNaN(score)) return 90;
  return Math.max(70, Math.min(100, Math.round(score)));
}

function inferWebsiteProjectName(prompt, type) {
  const words = String(prompt || type || "NOVA Website")
    .replace(/[^a-z0-9\s]/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);
  return words.length ? words.join(" ") : "NOVA Website";
}
