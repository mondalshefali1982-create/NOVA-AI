const { callGemini, getBody, handleOptions, requirePost, sendError, setCors } = require("../_lib/gemini");

const WEBSITE_TIMEOUT_MS = 85000;
const WEBSITE_RETRIES = 2;
const REQUIRED_PAGES = ["index", "about", "services", "contact"];

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  try {
    const body = getBody(req);
    const action = body.action || "generate";

    if (!["generate", "improve", "regenerate-section", "images"].includes(action)) {
      return res.status(400).json({ error: "Unsupported website generator action.", status: 400 });
    }

    if (action === "images") {
      return res.status(200).json(addGeneratedImages(body.project));
    }

    const prompt = buildWebsitePrompt(body, action);
    const raw = await callWebsiteModel(prompt);
    const project = parseWebsiteProject(raw);
    const normalized = normalizeApiProject(project, body);

    if (!normalized.html && !normalized.pages.index) {
      return res.status(502).json({
        error: "AI provider returned invalid response. Please retry generation.",
        status: 502
      });
    }

    return res.status(200).json(normalized);
  } catch (error) {
    console.error("[Website Generator]", error.message);
    sendError(res, error);
  }
};

async function callWebsiteModel(prompt) {
  let lastError = null;

  for (let attempt = 1; attempt <= WEBSITE_RETRIES + 1; attempt += 1) {
    try {
      const result = await withTimeout(
        callGemini(prompt, {
          systemInstruction: getWebsiteSystemInstruction(),
          maxOutputTokens: 12000
        }),
        WEBSITE_TIMEOUT_MS
      );

      if (!String(result || "").trim()) {
        const error = new Error("AI provider returned an empty response.");
        error.statusCode = 502;
        throw error;
      }

      return result;
    } catch (error) {
      lastError = error;
      console.error(`[Website Generator] attempt ${attempt} failed:`, error.message);
      if (attempt <= WEBSITE_RETRIES) await wait(900 * attempt);
    }
  }

  const finalError = new Error(toFriendlyAiError(lastError));
  finalError.statusCode = lastError?.statusCode || 503;
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
  return `
You are NOVA AI's production AI Website Builder, comparable to Lovable, Bolt.new, v0, Framer AI and Webflow AI.

Return ONLY valid JSON. Do not use markdown fences, prose, comments outside JSON, or trailing commas.
Every generated file must be complete, deployable and professional. Never return placeholder skeletons.
Use semantic HTML5, SEO metadata, accessible labels, responsive CSS, CSS variables, premium spacing, real content and lightweight vanilla JavaScript.
`;
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
- Generate pages.index, pages.about, pages.services and pages.contact.
- Each page must be a full HTML document with correct title, meta description, shared navigation and footer.
- Navigation links must use index.html, about.html, services.html and contact.html.
- Every page must reference style.css and script.js for exported ZIP compatibility.
- html must equal pages.index.`
    : `
SINGLE PAGE MODE:
- Generate one complete index.html document in html and pages.index.
- Navigation should use smooth-scroll anchor links.
- The document must reference style.css and script.js for exported ZIP compatibility.`;

  return `
Create a complete premium ${type}.

USER REQUEST:
${prompt}

AUTOMATIC PROMPT ENHANCEMENT:
Production-ready website, modern UI/UX, mobile-first responsive design, accessibility support, SEO-friendly structure, professional styling, high-quality realistic content, smooth animations, polished interactions and premium visual quality.

QUALITY BAR:
- Output must feel like a real deployable template from Framer, Webflow, v0 or a premium agency.
- Avoid generic beginner layouts, one-screen demos, empty sections, Lorem ipsum, "sample text" and weak placeholder copy.
- Use strong typography, clear hierarchy, premium spacing, rich cards, buttons, forms, nav, footer and realistic business content.
- Include scroll reveal animations, hover states, FAQ interactions, mobile navigation and contact form feedback in script.js.
- Infer colors, branding, imagery direction and mood from the user prompt.

MANDATORY STRUCTURE UNLESS THE USER EXPLICITLY ASKS OTHERWISE:
1. Responsive navigation
2. Hero section
3. About/story section
4. Features or services section
5. Statistics section
6. Team/trainers/staff/founders section when relevant
7. Pricing/plans/menu/products section when relevant
8. Testimonials
9. FAQ
10. Contact form
11. Footer
12. Smooth navigation behavior

CATEGORY PLAYBOOK:
${categoryGuide}

${pageInstruction}

RETURN THIS EXACT JSON SHAPE:
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

  return `
Improve the existing website without rebuilding from scratch.

USER INSTRUCTION:
${instruction}

EXISTING PROJECT JSON:
${JSON.stringify(project)}

Rules:
- Preserve current brand intent, pages, navigation, content direction and functionality unless the instruction asks to change them.
- Upgrade the requested areas with premium layout, typography, spacing, components, responsive behavior and animations.
- Keep output complete and valid. Do not omit unchanged files.

Return only valid JSON with name, html, pages, css, js and analysis.`;
}

function buildSectionPrompt({ section = "hero", project = {} }) {
  return `
Regenerate only the ${section} section of this website. Do not rebuild the whole site.

EXISTING PROJECT JSON:
${JSON.stringify(project)}

Rules:
- Replace or improve only the ${section} section across the relevant HTML pages.
- Keep unrelated sections, navigation, forms, footer, pages and features intact.
- Add/update only the CSS and JS needed for the regenerated section.
- Make the section premium, realistic, responsive, accessible and visually stronger.

Return only valid JSON with the full updated name, html, pages, css, js and analysis.`;
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

function parseWebsiteProject(raw) {
  const text = String(raw || "").trim();
  const direct = tryParseJson(text);
  if (direct) return unwrapProject(direct);

  const extracted = extractBalancedJson(text);
  const parsed = extracted ? tryParseJson(extracted) : null;
  if (parsed) return unwrapProject(parsed);

  const error = new Error("AI provider returned invalid response.");
  error.statusCode = 502;
  throw error;
}

function unwrapProject(value) {
  if (value?.json) return unwrapProject(value.json);
  if (typeof value?.html === "string" && value.html.trim().startsWith("{")) {
    const nested = tryParseJson(value.html);
    if (nested) return unwrapProject(nested);
  }
  return value;
}

function tryParseJson(value) {
  try {
    return JSON.parse(String(value || "").replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
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
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
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

function normalizeApiProject(project, body = {}) {
  const source = project || {};
  const existing = body.project || {};
  const pageMode = source.pageMode || body.pageMode || existing.pageMode || "single";
  const pages = normalizePages(source.pages || existing.pages, source.html || existing.html || "", pageMode);
  const html = source.html || pages.index || existing.html || "";

  return {
    name: source.name || existing.name || "NOVA Website",
    html: ensureExportReferences(html || pages.index),
    pages: Object.fromEntries(
      Object.entries(pages).map(([key, value]) => [key, ensureExportReferences(value)])
    ),
    css: source.css || existing.css || "",
    js: source.js || existing.js || "",
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
