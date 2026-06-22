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
    const raw = await callGemini(prompt, {
      systemInstruction:
        systemInstruction: `
You are NOVA AI's premium AI website builder engine.

Return ONLY raw JSON.
Do not wrap JSON in markdown.
Do not use \`\`\`json.
Do not add explanations.
Output must begin with { and end with }.
`,
      maxOutputTokens: 3000
    });

    console.log("RAW RESPONSE:"); console.log(String(raw).slice(0, 3000));  const project = parseWebsiteProject(raw);  console.log("PARSED PROJECT:"); console.log(JSON.stringify(project).slice(0, 3000));

    if (!project?.html && !project?.pages?.index) {
      return res.status(502).json({
        error: "NOVA could not generate a valid website project. Please try again.",
        status: 502
      });
    }

    res.status(200).json(normalizeApiProject(project, body));
  } catch (error) {
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

  return `
Create a complete premium ${type}.
User request: ${prompt}
Page mode: ${pageMode === "multi" ? "Multi-page website" : "Single-page website"}

Automatically enhance the prompt with: Modern UI/UX, responsive design, mobile-first layout, professional styling, accessibility, SEO, production-ready code, high-quality realistic content, modern animations, and premium design quality.

The website must feel like a real deployable product built with Lovable, Bolt.new, v0, Framer, Webflow or a premium SaaS template. Avoid simple beginner websites.

Mandatory structure unless the user explicitly asks otherwise:
- Responsive navigation with smooth-scroll links
- Hero section with strong headline, subcopy, CTAs and premium visual composition
- About/story section
- Features or services section with rich cards
- Statistics/achievements section
- Team/trainers/staff/founders section when relevant
- Pricing/plans/menu/packages section when relevant
- Testimonials with realistic names and quotes
- FAQ section
- Contact form with accessible labels
- Footer with useful links

Design rules:
- Strong visual hierarchy, typography, spacing, button systems, cards, forms and navigation
- Modern hover effects, scroll reveal, smooth scrolling, FAQ toggles, contact form feedback
- Consistent color system inferred from the prompt
- No Lorem ipsum, no sample text, no empty sections
- Use semantic HTML5, CSS variables, responsive breakpoints, and organized vanilla JavaScript

${pageMode === "multi" ? `
Multi-page output required:
- pages.index for index.html
- pages.about for about.html
- pages.services for services.html
- pages.contact for contact.html
- shared css and js
- Navigation links must point to index.html, about.html, services.html, contact.html
` : `
Single-page output required:
- html for index.html
- css for style.css
- js for script.js
`}

Return only valid JSON:
{
  "name": "project name",
  "html": "index.html code for single page, or same as pages.index for multi page",
  "pages": {
    "index": "index.html code",
    "about": "about.html code",
    "services": "services.html code",
    "contact": "contact.html code"
  },
  "css": "style.css code",
  "js": "script.js code",
  "analysis": {
    "uiQuality": 92,
    "responsiveness": 95,
    "accessibility": 88,
    "seo": 90
  }
}`;
}

function buildImprovePrompt({ instruction = "", project = {} }) {
  if (!instruction.trim()) {
    const error = new Error("Improvement instruction is required.");
    error.statusCode = 400;
    throw error;
  }

  return `
Improve the existing website intelligently. Do not start from scratch.
Instruction: ${instruction}

Existing project JSON:
${JSON.stringify(project)}

Upgrade the current code while preserving the brand, content intent, working navigation, existing pages, and overall project structure. Improve only what the instruction asks for, plus polish UI quality where helpful.

Return the full updated project JSON with the same shape:
{
  "name": "project name",
  "html": "updated index.html",
  "pages": { "index": "index.html", "about": "about.html", "services": "services.html", "contact": "contact.html" },
  "css": "updated style.css",
  "js": "updated script.js",
  "analysis": { "uiQuality": 95, "responsiveness": 95, "accessibility": 90, "seo": 92 }
}`;
}

function buildSectionPrompt({ section = "hero", project = {} }) {
  return `
Regenerate only the ${section} section of the existing website. Do not rebuild the whole website.

Existing project JSON:
${JSON.stringify(project)}

Instructions:
- Replace or significantly improve only the ${section} section across relevant page HTML.
- Keep CSS and JS compatible, adding only styles/scripts needed for the regenerated section.
- Preserve all unrelated sections, pages, navigation, forms and existing functionality.
- Make the regenerated section premium, realistic, responsive, accessible and visually stronger.

Return the full updated project JSON with the same shape:
{
  "name": "project name",
  "html": "updated index.html",
  "pages": { "index": "index.html", "about": "about.html", "services": "services.html", "contact": "contact.html" },
  "css": "updated style.css",
  "js": "updated script.js",
  "analysis": { "uiQuality": 95, "responsiveness": 95, "accessibility": 90, "seo": 92 }
}`;
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
  try {
    const direct = safeJson(raw, null);

    if (direct) {

  // Gemini sometimes returns { "json": {...} }
  if (direct.json) {
    return direct.json;
  }

  // Gemini sometimes returns HTML inside a stringified JSON
  if (
    typeof direct.html === "string" &&
    direct.html.trim().startsWith("{")
  ) {
    const nested = safeJson(direct.html, null);
    if (nested) return nested;
  }

  return direct;
}

    const jsonMatch = String(raw || "").match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = safeJson(jsonMatch[0], null);

      if (parsed) return parsed;
    }

    return {
      html: String(raw || ""),
      css: "",
      js: ""
    };
  } catch (err) {
    console.error("Parse Error:", err);

    return {
      html: "",
      css: "",
      js: ""
    };
  }
}

function normalizeApiProject(project, body = {}) {
  const pages = project.pages || {};
  const html = project.html || pages.index || body.project?.html || "";

  return {
    name: project.name || body.project?.name || "NOVA Website",
    html,
    pages: {
      index: pages.index || html,
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
