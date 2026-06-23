const { callGemini, getBody, handleOptions, requirePost, safeJson, sendError, setCors } = require("../_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  try {
    const body = getBody(req);
    const action = body.action || "generate";

    if (action === "images") {
      return res.status(200).json(addGeneratedImages(body.project));
    }

    const prompt = buildWebsitePrompt(body, action);

    // FIX: Pass maxOutputTokens so gemini.js uses the right limit (not default 2000)
    const raw = await callGemini(prompt, {
      systemInstruction:
        "You are NOVA AI's premium AI website builder. You generate complete, production-ready websites. Return ONLY valid JSON. No markdown fences, no explanations. Just a single JSON object.",
      responseMimeType: "application/json",
      maxOutputTokens: 8000,
      temperature: 0.6
    });

    const project = parseWebsiteProject(raw);

    if (!project?.html && !project?.pages?.index) {
      console.error("[website.js] Failed to parse project. Raw preview:", String(raw || "").slice(0, 300));
      return res.status(502).json({
        error: "NOVA could not generate a valid website project. Please try again.",
        status: 502
      });
    }

    res.status(200).json(normalizeApiProject(project, body));
  } catch (error) {
    console.error("[website.js] Handler error:", error.message);
    sendError(res, error);
  }
};

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

  const isMulti = pageMode === "multi";

  return `Create a complete, premium, real-world ${type} website.

User request: "${prompt}"

CRITICAL RULES - follow these exactly:
- Generate REAL, complete, production-ready code. Not demos, not placeholders.
- All content must be realistic and relevant to the user's request.
- NO Lorem ipsum, NO "sample text", NO empty sections.
- Use modern CSS with CSS variables, flexbox, grid.
- Use Google Fonts (embed the @import in CSS).
- Use modern JavaScript (ES6+, no jQuery).
- Make it fully responsive (mobile, tablet, desktop).
- Add smooth scroll, hover effects, animations.
- Use inline SVG icons instead of icon libraries.
- For images: use descriptive alt text, and use CSS gradients or colored placeholder divs — DO NOT use any external image URLs (no Unsplash, no Picsum, no placeholder.com). Instead use CSS background gradients to represent images.
- Navigation must work with anchor links for single-page, or .html file links for multi-page.

Design system:
- Strong hero section with gradient background, headline, subheadline, and 2 CTA buttons.
- Feature/services section with icon cards (use SVG inline icons).
- Stats section with animated counter numbers.
- Testimonials with realistic names, roles, and quotes.
- FAQ section with accordion toggle (pure JS).
- Contact form with validation feedback.
- Footer with navigation, social links, copyright.
- Consistent color scheme matching the brand/business type.

${isMulti ? `
MULTI-PAGE MODE:
Generate 4 complete separate HTML pages with shared CSS and JS.
- pages.index = full index.html (homepage with hero, features, stats, testimonials, FAQ, contact form)
- pages.about = full about.html (story, mission, team section, values)
- pages.services = full services.html (detailed services/offerings with pricing cards)
- pages.contact = full contact.html (contact form, map placeholder, contact info, FAQ)
- Each page must have the SAME navbar linking to: index.html, about.html, services.html, contact.html
- Each page must have the SAME footer
- html field = same as pages.index
` : `
SINGLE-PAGE MODE:
Generate one complete HTML file with all sections:
- html = complete index.html
- css = complete style.css (all styles)
- js = complete script.js (all JS including FAQ toggle, smooth scroll, form handling, counter animation)
`}

Return ONLY this JSON (no markdown, no extra text):
{
  "name": "short project name based on the request",
  "html": "COMPLETE index.html code here",
  "pages": {
    "index": "COMPLETE index.html code here",
    "about": "${isMulti ? "COMPLETE about.html code here" : ""}",
    "services": "${isMulti ? "COMPLETE services.html code here" : ""}",
    "contact": "${isMulti ? "COMPLETE contact.html code here" : ""}"
  },
  "css": "COMPLETE style.css code here with CSS variables, responsive breakpoints, animations",
  "js": "COMPLETE script.js code here with FAQ toggle, smooth scroll, form validation, counter animation",
  "analysis": {
    "uiQuality": 93,
    "responsiveness": 95,
    "accessibility": 88,
    "seo": 91
  }
}`;
}

function buildImprovePrompt({ instruction = "", project = {} }) {
  if (!instruction.trim()) {
    const error = new Error("Improvement instruction is required.");
    error.statusCode = 400;
    throw error;
  }

  return `Improve the existing website based on this instruction: "${instruction}"

Existing project (JSON):
${JSON.stringify(serializeForPrompt(project))}

Rules:
- Do NOT rebuild from scratch. Modify and improve only what the instruction asks for.
- Preserve all existing pages, content, navigation, brand, and working features.
- Improve CSS/JS quality where relevant.
- Keep the same JSON structure.

Return ONLY valid JSON (no markdown):
{
  "name": "project name",
  "html": "updated index.html",
  "pages": { "index": "...", "about": "...", "services": "...", "contact": "..." },
  "css": "updated style.css",
  "js": "updated script.js",
  "analysis": { "uiQuality": 95, "responsiveness": 95, "accessibility": 90, "seo": 92 }
}`;
}

function buildSectionPrompt({ section = "hero", project = {} }) {
  return `Regenerate only the "${section}" section of this website.

Existing project:
${JSON.stringify(serializeForPrompt(project))}

Rules:
- Only replace the ${section} section in the HTML. Keep everything else.
- Update CSS/JS only if needed for the new section.
- Make the new ${section} section premium, responsive, and realistic.

Return ONLY valid JSON (no markdown):
{
  "name": "project name",
  "html": "full updated index.html",
  "pages": { "index": "...", "about": "...", "services": "...", "contact": "..." },
  "css": "full updated style.css",
  "js": "full updated script.js",
  "analysis": { "uiQuality": 95, "responsiveness": 95, "accessibility": 90, "seo": 92 }
}`;
}

function serializeForPrompt(project) {
  // Trim large fields to avoid exceeding token limits in improve/section prompts
  return {
    name: project.name || "",
    html: truncate(project.html || project.pages?.index || "", 4000),
    css: truncate(project.css || "", 2000),
    js: truncate(project.js || "", 1000),
    pages: {
      index: truncate(project.pages?.index || project.html || "", 2000),
      about: truncate(project.pages?.about || "", 1500),
      services: truncate(project.pages?.services || "", 1500),
      contact: truncate(project.pages?.contact || "", 1500)
    }
  };
}

function truncate(str, maxLen) {
  if (!str) return "";
  return str.length > maxLen ? str.slice(0, maxLen) + "\n<!-- truncated -->" : str;
}

function addGeneratedImages(project = {}) {
  // FIX: Use Pollinations.ai (free, no auth needed) instead of Unsplash which returns 403/404
  const seed = Math.floor(Math.random() * 100000);
  const baseName = encodeURIComponent(
    (project.name || project.prompt || "premium website").slice(0, 60)
  );

  const heroUrl = `https://image.pollinations.ai/prompt/${baseName}%20hero%20scene%20cinematic%20high%20quality?width=1280&height=720&seed=${seed}&nologo=true`;
  const featureUrl = `https://image.pollinations.ai/prompt/${baseName}%20product%20feature%20illustration%20professional?width=800&height=600&seed=${seed + 1}&nologo=true`;
  const teamUrl = `https://image.pollinations.ai/prompt/professional%20team%20photo%20modern%20office%20business?width=800&height=600&seed=${seed + 2}&nologo=true`;

  const imageCss = `
/* NOVA AI Generated Website Images */
:root {
  --nova-hero-img: url("${heroUrl}");
  --nova-feature-img: url("${featureUrl}");
  --nova-team-img: url("${teamUrl}");
}
.hero-image, .hero-visual, .hero-bg, [class*="hero"]::after {
  background-image: var(--nova-hero-img);
  background-size: cover;
  background-position: center;
}
.feature-image, .feature-img, [class*="feature-card"]:first-child::before {
  background-image: var(--nova-feature-img);
  background-size: cover;
  background-position: center;
}
.team-image, .team-img, [class*="team"] img {
  content: url("${teamUrl}");
}
`;

  return normalizeApiProject(
    {
      ...project,
      css: (project.css || "") + "\n" + imageCss,
      analysis: project.analysis
    },
    { project }
  );
}

function parseWebsiteProject(raw) {
  if (!raw) return null;

  // Try direct JSON parse
  const direct = safeJson(raw, null);
  if (direct?.html || direct?.pages?.index) return direct;

  // Try extracting first complete JSON object
  const str = String(raw || "");
  const start = str.indexOf("{");
  const end = str.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const extracted = safeJson(str.slice(start, end + 1), null);
    if (extracted?.html || extracted?.pages?.index) return extracted;
  }

  console.error("[website.js] parseWebsiteProject: could not parse response");
  return null;
}

function normalizeApiProject(project, body = {}) {
  const pages = project.pages || {};
  const html = project.html || pages.index || body.project?.html || "";

  // FIX: For multi-page, ensure pages are properly set even if backend only fills some
  const pageMode = body.pageMode || project.pageMode || "single";

  return {
    name: project.name || body.project?.name || "NOVA Website",
    html,
    pageMode,
    pages: {
      index: pages.index || html || "",
      about: pages.about || "",
      services: pages.services || "",
      contact: pages.contact || ""
    },
    css: project.css || body.project?.css || "",
    js: project.js || body.project?.js || "",
    analysis: {
      uiQuality: Number(project.analysis?.uiQuality || 92),
      responsiveness: Number(project.analysis?.responsiveness || 94),
      accessibility: Number(project.analysis?.accessibility || 88),
      seo: Number(project.analysis?.seo || 90)
    }
  };
}
