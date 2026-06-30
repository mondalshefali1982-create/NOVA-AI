const { callGemini, getBody, handleOptions, requirePost, sendError, setCors } = require("../_lib/gemini");

const WEBSITE_TIMEOUT_MS = 50000;
const WEBSITE_RETRIES = 0; // Set to 0 to save time and avoid hitting Vercel timeouts
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
    const parsed = parseWebsiteProject(raw);
    console.log("PARSED", parsed);

    console.log("STEP 5 normalizing");
    const normalized = normalizeApiProject(parsed, body);
    
    // Task 5: Log normalized HTML start (naming project to match exact log format required)
    const project = normalized;
    console.log("NORMALIZED HTML START", project.html.substring(0, 200));

    // Create minimal fallback HTML if both html and pages.index are empty
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

    // Bulletproof emergency recovery: return a valid emergency fallback project instead of crashing
    if (["generate", "improve", "regenerate-section"].includes(action)) {
      console.warn("[Website Generator] Recovery: returning beautiful Emergency Fallback Project instead of crash response");
      
      const fallbackPrompt = body.prompt || (body.project?.prompt) || "website";
      const fallbackType = body.type || (body.project?.type) || "Website";
      const fallbackName = (body.project?.name) || "NOVA Website";
      
      const emergencyProject = {
        name: fallbackName,
        html: createEmergencyFallbackPage(fallbackPrompt, fallbackType),
        css: "body { font-family: 'Inter', system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0b0f19; color: #e2e8f0; margin: 0; padding: 2rem; box-sizing: border-box; } .card { text-align: center; padding: 3rem; border: 1px solid rgba(255,255,255,0.08); border-radius: 1rem; max-width: 550px; background: rgba(17,24,39,0.7); backdrop-filter: blur(12px); box-shadow: 0 20px 50px rgba(0,0,0,0.3); } h1 { font-size: 2.2rem; margin-top: 0; background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; } p { color: #9ca3af; line-height: 1.6; margin: 1rem 0; } .btn { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 2rem; background: linear-gradient(135deg, #7c3aed, #2563eb); border: none; border-radius: 0.5rem; color: white; font-size: 1rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: transform 0.2s; } .btn:hover { transform: translateY(-2px); }",
        js: "console.log('Emergency fallback loaded');",
        pages: {
          index: createEmergencyFallbackPage(fallbackPrompt, fallbackType)
        },
        analysis: {
          uiQuality: 85,
          responsiveness: 90,
          accessibility: 88,
          seo: 85
        }
      };
      
      const normalized = normalizeApiProject(emergencyProject, body);
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
          maxOutputTokens: 8192, // Ensure the full website response is read from the Gemini API
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
        const error = new Error("Generation timeout.");
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

CRITICAL: Return ONLY valid JSON. No markdown fences. No prose. No comments outside JSON. No trailing commas. Start with { and end with }.
Every generated file must be complete, deployable and professional. Never return placeholder skeletons.
Use semantic HTML5, SEO metadata, accessible labels, responsive CSS, CSS variables, premium spacing, real content and lightweight vanilla JavaScript.`;
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
    ? `
MULTI PAGE MODE:
- Docs to generate: pages.index, pages.about, pages.services and pages.contact.
- Each page must be a full HTML document with correct title, meta description, shared navigation and footer.
- Navigation links must use index.html, about.html, services.html and contact.html.
- Every page must reference style.css and script.js for exported ZIP compatibility.
- html must equal pages.index.`
    : `
SINGLE PAGE MODE:
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
- Maximum HTML: 250 lines
- Maximum CSS: 250 lines
- Maximum JS: 100 lines
- Do not generate unnecessary animations.
- Do not generate excessive comments.
- Do not generate placeholder filler sections.

Mandatory structure:
- Hero
- About
- Services
- Contact

CATEGORY PLAYBOOK:
${categoryGuide}

${pageInstruction}

RETURN THIS EXACT JSON STRUCTURE (no extra text, no markdown):
{
  "name": "short project name",
  "html": "complete index.html code",
  "pages": {
    "index": "complete index.html code",
    "about": "complete about.html code or empty string in single mode",
    "services": "complete services.html code or empty string in single mode",
    "contact": "complete contact.html code or empty string in single mode"
  },
  "css": "complete style.css code with responsive breakpoints",
  "js": "complete script.js code",
  "analysis": {
    "uiQuality": 92,
    "responsiveness": 95,
    "accessibility": 90,
    "seo": 91
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

// Complete parser rewrite — resilient, never throws, always returns usable data
function parseWebsiteProject(raw) {
  const text = String(raw || "").trim();
  console.log("RAW AI", raw);
  console.log("[Website Parser] Raw Gemini response length:", text.length);

  let result = null;
  let parseErrorReason = "";

  // Helper to check if a parsed object is a valid website project structure
  const isObjValid = (obj) => {
    return obj && typeof obj === "object" && (
      typeof obj.html === "string" ||
      typeof obj.css === "string" ||
      (obj.pages && typeof obj.pages === "object") ||
      typeof obj.name === "string"
    );
  };

  // Step 1 & 2: Direct parse / Double parse
  try {
    let parsed = JSON.parse(text);
    if (typeof parsed === "string") {
      console.log("[Website Parser] Detected stringified JSON. Parsing second time...");
      parsed = JSON.parse(parsed);
    }
    if (isObjValid(parsed)) {
      console.log("[Website Parser] SUCCESS: Parsed JSON directly");
      result = unwrapProject(parsed);
    }
  } catch (e) {
    parseErrorReason += `Direct JSON parse failed: ${e.message}. `;
  }

  // Step 3: Markdown fence removal
  if (!result) {
    try {
      const stripped = stripMarkdownFences(text);
      if (stripped !== text) {
        let parsed = JSON.parse(stripped);
        if (typeof parsed === "string") {
          parsed = JSON.parse(parsed);
        }
        if (isObjValid(parsed)) {
          console.log("[Website Parser] SUCCESS: Parsed after stripping markdown fences");
          result = unwrapProject(parsed);
        }
      }
    } catch (e) {
      parseErrorReason += `Markdown fence parse failed: ${e.message}. `;
    }
  }

  // Step 4: Balanced JSON extraction
  if (!result) {
    try {
      const extracted = extractBalancedJson(text);
      if (extracted) {
        let parsed = JSON.parse(extracted);
        if (typeof parsed === "string") {
          parsed = JSON.parse(parsed);
        }
        if (isObjValid(parsed)) {
          console.log("[Website Parser] SUCCESS: Parsed from extracted balanced JSON");
          result = unwrapProject(parsed);
        }
      }
    } catch (e) {
      parseErrorReason += `Balanced JSON extract parse failed: ${e.message}. `;
    }
  }

  // Step 5: Truncated JSON recovery
  if (!result) {
    try {
      const repaired = repairTruncatedJson(text);
      if (repaired && repaired !== text) {
        let parsed = JSON.parse(repaired);
        if (typeof parsed === "string") {
          parsed = JSON.parse(parsed);
        }
        if (isObjValid(parsed)) {
          console.log("[Website Parser] SUCCESS: Parsed from repaired JSON");
          result = unwrapProject(parsed);
        }
      }
    } catch (e) {
      parseErrorReason += `Repaired JSON parse failed: ${e.message}. `;
    }
  }

  // Step 6: Field-level regex extraction
  if (!result) {
    console.warn("[Website Parser] JSON parsing failed. Trying field-level regex extraction...");
    try {
      const extractedFields = extractFieldsViaRegex(text);
      if (isObjValid(extractedFields) && (extractedFields.html || extractedFields.css)) {
        console.log("[Website Parser] SUCCESS: Extracted fields via regex");
        result = extractedFields;
      }
    } catch (e) {
      parseErrorReason += `Regex extraction failed: ${e.message}. `;
    }
  }

  // Step 7: Raw HTML parser (Case C)
  if (!result && (/<html|<!DOCTYPE/i.test(text))) {
    console.warn("[Website Parser] Raw response appears to be raw HTML. Parsing style/script blocks.");
    try {
      let css = "";
      const styleMatches = text.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      if (styleMatches) {
        css = styleMatches.map(m => m.replace(/<style[^>]*>|<\/style>/gi, "").trim()).join("\n\n");
      }
      let js = "";
      const scriptMatches = text.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
      if (scriptMatches) {
        js = scriptMatches.map(m => {
          if (/<script[^>]+src=/i.test(m)) return "";
          return m.replace(/<script[^>]*>|<\/script>/gi, "").trim();
        }).filter(Boolean).join("\n\n");
      }
      let cleanedHtml = text
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (m) => {
          if (/<script[^>]+src=/i.test(m)) return m;
          return "";
        });

      result = { html: cleanedHtml, css: css, js: js, pages: { index: cleanedHtml }, name: "NOVA Website" };
      console.log("[Website Parser] SUCCESS: Parsed raw HTML structure");
    } catch (e) {
      parseErrorReason += `Raw HTML parsing failed: ${e.message}. `;
    }
  }

  // Final check / unwrapping logic to ensure project.html is NOT a JSON string starting with {
  if (result) {
    result = ensureHtmlOnly(result);
  }

  // Task 3: Never allow project.html to contain JSON text.
  // Before returning, validate project.html.trim().startsWith("<") or project.html.includes("<html") or project.html.includes("<body").
  // If not, throw an error and print the raw AI response.
  if (result && typeof result.html === "string") {
    const cleanHtml = result.html.trim();
    const isValidHtml = cleanHtml.startsWith("<") || cleanHtml.includes("<html") || cleanHtml.includes("<body");
    if (!isValidHtml) {
      const errorMsg = `[Website Parser] VALIDATION ERROR: project.html does not contain valid HTML! Raw AI response was: ${text}`;
      console.error(errorMsg);
      parseErrorReason += "project.html validation failed (does not start with < or contain html/body tag).";
      result = null; // Mark as failed to trigger fallback or error throw
    }
  } else if (result && !result.html) {
    parseErrorReason += "project.html is empty or missing. ";
    result = null;
  }

  // Task 5: Add logging showing raw length, parsed HTML, CSS, JS lengths, and failure reason
  if (result) {
    console.log("[Website Parser] Parsed HTML length:", result.html ? result.html.length : 0);
    console.log("[Website Parser] Parsed CSS length:", result.css ? result.css.length : 0);
    console.log("[Website Parser] Parsed JS length:", result.js ? result.js.length : 0);
  } else {
    console.error("[Website Parser] Parsing failed. Reason:", parseErrorReason);
    throw new Error(`Failed to parse website generation response. Reason: ${parseErrorReason}`);
  }

  return result;
}

const parseWebsiteResponse = parseWebsiteProject;

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
    .replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i, "$1")
    .replace(/^```(?:json)?\s*/i, "")
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
  const repaired = text + closing;
  console.log(`[Website Parser] Repaired truncated JSON: added ${stack.length} closing chars: "${closing}"`);
  return repaired;
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
  const cleanText = text.trim();

  // Try standard JSON match
  const standardPattern = new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "s");
  const standardMatch = cleanText.match(standardPattern);
  if (standardMatch) {
    try { return JSON.parse(`"${standardMatch[1]}"`); } catch { return standardMatch[1]; }
  }

  // Try escaped quote match (e.g. \"html\": \"...\")
  const escapedPattern = new RegExp(`\\\\"${fieldName}\\\\"\\s*:\\s*\\\\"([\\s\\S]*?)\\\\"(?=\\s*(?:,?\\s*\\\\"[a-zA-Z0-9_]+\\\\"\\s*:|\\s*}))`, "i");
  const escapedMatch = cleanText.match(escapedPattern);
  if (escapedMatch) {
    const rawVal = escapedMatch[1];
    return rawVal.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  // Lax match up to next key or closing brace
  const laxPattern = new RegExp(`"${fieldName}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*(?:,\\s*"[a-zA-Z0-9_]+"\\s*:|\\s*}))`, "i");
  const laxMatch = cleanText.match(laxPattern);
  if (laxMatch) {
    const rawVal = laxMatch[1];
    return rawVal.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  return null;
}

function unwrapProject(value) {
  if (value?.json) return unwrapProject(value.json);
  if (value?.project && typeof value.project === "object") return unwrapProject(value.project);
  if (typeof value?.html === "string" && value.html.trim().startsWith("{")) {
    const nested = tryParseJson(value.html);
    if (nested) return unwrapProject(nested);
  }
  return value;
}

function ensureHtmlOnly(project) {
  if (!project) return project;

  const getHtmlString = (val) => {
    if (typeof val !== "string") return "";
    let trimmed = val.trim();
    // Strip leading/trailing double quotes if they wrap the entire HTML string
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      try {
        trimmed = JSON.parse(trimmed);
      } catch {
        trimmed = trimmed.slice(1, -1);
      }
      trimmed = trimmed.trim();
    }
    if (trimmed.startsWith("<") || trimmed.includes("<html") || trimmed.includes("<body")) {
      return trimmed;
    }
    if (trimmed.startsWith("{")) {
      const parsed = tryParseJson(trimmed);
      if (parsed) {
        if (typeof parsed === "string") {
          return getHtmlString(parsed);
        }
        if (typeof parsed === "object") {
          if (parsed.html && typeof parsed.html === "string") {
            return getHtmlString(parsed.html);
          }
          if (parsed.index && typeof parsed.index === "string") {
            return getHtmlString(parsed.index);
          }
          if (parsed.pages?.index && typeof parsed.pages.index === "string") {
            return getHtmlString(parsed.pages.index);
          }
        }
      }
    }
    return "";
  };

  if (project.html) {
    const extractedHtml = getHtmlString(project.html);
    if (extractedHtml) {
      project.html = extractedHtml;
    }
  }

  if (project.pages && project.pages.index) {
    const extractedIndex = getHtmlString(project.pages.index);
    if (extractedIndex) {
      project.pages.index = extractedIndex;
    }
  }

  if ((!project.html || !project.html.trim().startsWith("<")) && project.pages?.index) {
    const extractedIndex = getHtmlString(project.pages.index);
    if (extractedIndex && extractedIndex.trim().startsWith("<")) {
      project.html = extractedIndex;
    }
  }

  if ((!project.html || !project.html.trim().startsWith("<")) && project.index) {
    const extractedIndex = getHtmlString(project.index);
    if (extractedIndex && extractedIndex.trim().startsWith("<")) {
      project.html = extractedIndex;
    }
  }

  // Populate pages.index if HTML is clean
  if (project.html && project.html.trim().startsWith("<")) {
    project.pages = project.pages || {};
    project.pages.index = project.html;
  }

  return project;
}

// Decode escaped HTML strings to prevent text-only iframe rendering
function decodeHtmlEntities(str = "") {
  return String(str || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'");
}

function tryParseJson(value) {
  try {
    const cleaned = String(value || "")
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    let parsed = JSON.parse(cleaned);
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    return parsed;
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
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) return text.slice(start, index + 1);
    }
  }

  return "";
}

// =============================================================================
// Normalization
// =============================================================================

function normalizeApiProject(project, body = {}) {
  const source = project || {};
  const existing = body.project || {};
  const pageMode = source.pageMode || body.pageMode || existing.pageMode || "single";

  const rawHtml = decodeHtmlEntities(source.html || source.pages?.index || existing.html || existing.pages?.index || "").trim();

  // Task 4: Verify rawHtml is a string and starts with "<"
  if (typeof rawHtml !== "string" || !rawHtml.startsWith("<")) {
    console.error("[Website Normalizer] Validation failed: rawHtml is not a valid HTML string starting with <. Got:", rawHtml);
    throw new Error("Normalized API website HTML is invalid.");
  }

  const pages = normalizePages(source.pages || existing.pages, rawHtml, pageMode);
  const html = rawHtml || pages.index || "";

  const css = String(source.css || existing.css || "");
  const js = String(source.js || existing.js || "");

  const siteType = body.type || existing.type || "Landing Page";

  // Automatic asset & SVG repair filters
  const repairedPages = {};
  Object.entries(pages).forEach(([key, val]) => {
    repairedPages[key] = repairHtmlAssets(decodeHtmlEntities(val), siteType);
  });

  const repairedHtml = repairedPages.index || repairHtmlAssets(html, siteType);
  const repairedCss = repairCssImages(css, siteType);

  console.log("[Website Normalizer] Final normalized:", {
    htmlLength: repairedHtml.length,
    cssLength: repairedCss.length,
    jsLength: js.length,
    pageKeys: Object.keys(repairedPages)
  });

  return {
    name: source.name || existing.name || "NOVA Website",
    html: ensureExportReferences(repairedHtml),
    pages: Object.fromEntries(
      Object.entries(repairedPages).map(([key, value]) => [key, ensureExportReferences(value)])
    ),
    css: repairedCss,
    js,
    analysis: normalizeAnalysis(source.analysis || existing.analysis)
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

// Emergency fallback page when AI completely fails to return usable content
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
    responsiveness: clampScore(analysis.responsiveness || 94),
    accessibility: clampScore(analysis.accessibility || 90),
    seo: clampScore(analysis.seo || 91)
  };
}

function clampScore(value) {
  const score = Number(value);
  if (Number.isNaN(score)) return 90;
  return Math.max(70, Math.min(100, Math.round(score)));
}

// Automatic Stock Photo & Pollinations AI Image URL Repair Filter
function repairHtmlAssets(html = "", category = "") {
  let output = String(html || "");
  if (!output.trim()) return "";

  const cat = String(category || "").toLowerCase();
  
  // Curated list of gorgeous, high-resolution Unsplash photo IDs
  const stockImages = {
    gym: [
      "1517838277536-f5f99be501cd", // Gym workout
      "1534438327276-14e5300c3a48", // Gym equipment
      "1541534741688-6078c6bfb5c5", // Athlete
      "1571019614242-c5c5dee9f50b", // Dumbbells
      "1517838277536-f5f99be501cd"
    ],
    cafe: [
      "1501339847302-ac426a4a7cbb", // Cozy cafe
      "1495474472287-4d71bcdd2085", // Coffee cups
      "1554118811-1e0d58224f24", // Pastries
      "1447078806655-4087b7649776", // Flat white
      "1501339847302-ac426a4a7cbb"
    ],
    portfolio: [
      "1498050108023-c5249f4df085", // Laptop on desk
      "1507238691740-187a5b1d37b8", // UI designer workspace
      "1522202176988-66273c2fd55f", // Creative brainstorm
      "1507679799987-c73779587ccf", // Developer coding
      "1498050108023-c5249f4df085"
    ],
    ecommerce: [
      "1472851294608-062f824d296b", // Retail boutique
      "1483985988355-763728e1935b", // Fashion model
      "1441986300917-64674bd600d8", // Store shelf
      "1523381210434-271e8be1f52b", // Clothes hanger
      "1472851294608-062f824d296b"
    ],
    saas: [
      "1460925895917-afdab827c52f", // Analytics screen
      "1519389950473-47ba0277781c", // Modern tech team
      "1551434678-e076c223a692", // Digital agency office
      "1531403009284-440f080d1e12", // Mobile app design
      "1460925895917-afdab827c52f"
    ],
    education: [
      "1497633762265-9d179a990aa6", // Books stacked
      "1523050854058-8df90110c9f1", // University campus
      "1516321318423-f06f85e504b3", // Student learning
      "1434030216411-0b793f4b4173", // Study notes
      "1497633762265-9d179a990aa6"
    ],
    blog: [
      "1488190211105-8b0e65b80b4e", // Laptop & notebook
      "1499750310107-5fef28a66643", // Writing on notepad
      "1455390582262-044cdead277a", // Creative workspace
      "1486312338219-ce68d2c6f44d", // Coding at coffee shop
      "1488190211105-8b0e65b80b4e"
    ],
    business: [
      "1454165804606-c3d57bc86b40", // Business handshake
      "1557804506-669a67965ba0", // Modern office workspace
      "1521737711867-e3b97375f902", // Team collaboration
      "1486406146926-c627a92ad1ab", // Corporate high rise
      "1454165804606-c3d57bc86b40"
    ]
  };

  let key = "business";
  if (/gym|fitness|trainer|workout/.test(cat)) key = "gym";
  else if (/cafe|coffee|restaurant|food|menu/.test(cat)) key = "cafe";
  else if (/portfolio|personal|creator|developer|designer/.test(cat)) key = "portfolio";
  else if (/e-?commerce|store|shop|product/.test(cat)) key = "ecommerce";
  else if (/saas|startup|ai|software/.test(cat)) key = "saas";
  else if (/education|course|school|academy|learn/.test(cat)) key = "education";
  else if (/blog|magazine|news/.test(cat)) key = "blog";

  const images = stockImages[key];
  let imgIndex = 0;

  // 1. Repair <img> src attributes in HTML
  output = output.replace(/<img([^>]+)>/gi, (match, attrs) => {
    const srcMatch = attrs.match(/src=["']([^"']*)["']/i);
    const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
    const src = srcMatch ? srcMatch[1] : "";
    const alt = altMatch ? altMatch[1] : "";

    const isHallucinatedUnsplash = /unsplash\.com/i.test(src) && !/photo-/i.test(src);
    const isDummy = !src || /placeholder|dummy|example|svg|data:image/i.test(src) || isHallucinatedUnsplash;

    if (isDummy) {
      let newSrc = "";
      if (alt && alt.length > 3 && !/image|logo|photo/i.test(alt)) {
        newSrc = `https://image.pollinations.ai/prompt/${encodeURIComponent(alt + " stock photo, professional high quality web graphic")}`;
      } else {
        const photoId = images[imgIndex % images.length];
        imgIndex++;
        newSrc = `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=800&q=80`;
      }
      
      if (srcMatch) {
        return `<img${attrs.replace(/src=["']([^"']*)["']/i, `src="${newSrc}"`)}>`;
      } else {
        return `<img src="${newSrc}"${attrs}>`;
      }
    }
    return match;
  });

  // 2. Normalize and repair inline <svg> attributes
  output = output.replace(/<svg([^>]*?)>([\s\S]*?)<\/svg>/gi, (match, svgAttrs, svgContent) => {
    let cleanAttrs = String(svgAttrs || "");
    
    // Remove invalid root attributes
    const invalidAttrs = /\b(cx|cy|r|x1|y1|x2|y2|d|points|stroke-dasharray|stroke-dashoffset|transform-origin)\b\s*=\s*["'][^"']*["']/gi;
    cleanAttrs = cleanAttrs.replace(invalidAttrs, "").trim();

    // Ensure xmlns
    if (!/xmlns=/i.test(cleanAttrs)) {
      cleanAttrs += ' xmlns="http://www.w3.org/2000/svg"';
    }

    // Ensure viewBox
    if (!/viewBox=/i.test(cleanAttrs)) {
      const widthMatch = cleanAttrs.match(/width=["'](\d+)(px)?["']/i);
      const heightMatch = cleanAttrs.match(/height=["'](\d+)(px)?["']/i);
      if (widthMatch && heightMatch) {
        cleanAttrs += ` viewBox="0 0 ${widthMatch[1]} ${heightMatch[1]}"`;
      } else {
        cleanAttrs += ' viewBox="0 0 24 24"';
      }
    }

    return `<svg ${cleanAttrs}>${svgContent}</svg>`;
  });

  return output;
}

function repairCssImages(css = "", category = "") {
  let output = String(css || "");
  if (!output.trim()) return "";

  const cat = String(category || "").toLowerCase();
  
  const bgImages = {
    gym: "photo-1517838277536-f5f99be501cd",
    cafe: "photo-1501339847302-ac426a4a7cbb",
    portfolio: "photo-1507238691740-187a5b1d37b8",
    ecommerce: "photo-1472851294608-062f824d296b",
    saas: "photo-1460925895917-afdab827c52f",
    education: "photo-1523050854058-8df90110c9f1",
    blog: "photo-1488190211105-8b0e65b80b4e",
    business: "photo-1454165804606-c3d57bc86b40"
  };

  let key = "business";
  if (/gym|fitness|trainer|workout/.test(cat)) key = "gym";
  else if (/cafe|coffee|restaurant|food|menu/.test(cat)) key = "cafe";
  else if (/portfolio|personal|creator|developer|designer/.test(cat)) key = "portfolio";
  else if (/e-?commerce|store|shop|product/.test(cat)) key = "ecommerce";
  else if (/saas|startup|ai|software/.test(cat)) key = "saas";
  else if (/education|course|school|academy|learn/.test(cat)) key = "education";
  else if (/blog|magazine|news/.test(cat)) key = "blog";

  const photoId = bgImages[key];
  const replacementUrl = `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=1200&q=80`;

  // Replace background-image: url(...) containing placeholder/dummy/hallucinated links
  output = output.replace(/url\(["']?([^"')]+)["']?\)/gi, (match, url) => {
    if (!url || /placeholder|dummy|example|unsplash\.com\/photo-12345/i.test(url) || (url.includes("unsplash.com") && !url.includes("photo-"))) {
      return `url("${replacementUrl}")`;
    }
    return match;
  });

  return output;
}
