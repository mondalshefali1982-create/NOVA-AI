const {
  callGemini,
  getBody,
  handleOptions,
  requirePost,
  safeJson,
  sendError,
  setCors
} = require("../_lib/gemini");

const TYPES = [
  "portfolio", "business", "restaurant", "cafe", "agency", "startup", "ai saas",
  "e-commerce", "gym", "photography", "education", "school", "college", "ngo",
  "hospital", "hotel", "real estate", "blog", "event", "travel", "corporate", "freelancer"
];

const IMAGE_TOPICS = {
  restaurant: ["italian-food", "chef", "restaurant-interior", "pasta"],
  cafe: ["coffee-shop", "latte", "cafe-interior", "pastry"],
  portfolio: ["designer-desk", "creative-workspace", "profile-portrait", "ui-design"],
  hospital: ["doctor", "clinic", "healthcare", "medical-team"],
  gym: ["fitness", "gym-equipment", "personal-trainer", "workout"],
  "real estate": ["luxury-apartment", "modern-building", "living-room", "city-view"],
  startup: ["startup-team", "software-dashboard", "office", "productivity"],
  "ai saas": ["ai-dashboard", "automation", "software-team", "data-visualization"],
  travel: ["destination", "hotel-resort", "mountains", "beach"],
  education: ["students", "classroom", "library", "online-learning"],
  default: ["modern-office", "team-work", "workspace", "city-business"]
};

function analyzePrompt(prompt = "", pageMode = "single") {
  const lower = prompt.toLowerCase();
  const matched = TYPES.find((type) => lower.includes(type)) || "custom";
  const type = matched === "e-commerce" ? "ecommerce" : matched;
  const audience = lower.includes("luxury") || lower.includes("premium") ? "premium customers" : "modern web visitors";
  const tone = lower.includes("playful") ? "playful" : lower.includes("corporate") ? "corporate" : lower.includes("minimal") ? "minimal" : "premium";
  return {
    websiteType: titleCase(type),
    industry: type,
    targetAudience: audience,
    tone,
    pageMode: pageMode === "multi" ? "multi" : "single",
    imageTopics: IMAGE_TOPICS[type] || IMAGE_TOPICS.default
  };
}

function titleCase(value) {
  return String(value || "custom website").replace(/\b\w/g, (char) => char.toUpperCase());
}

function imageUrl(topic, index) {
  return `https://source.unsplash.com/1200x900/?${encodeURIComponent(topic)}&sig=${index + 23}`;
}

function buildSystemPrompt() {
  return `You are NOVA AI's production website architect.
You do not echo or display the user's prompt.
You interpret intent and create a real, deployable website with distinct layout, copy, imagery, palette, sections, animations, and navigation for the detected industry.
Never reuse a generic template. A restaurant must look like a restaurant, a hospital like a hospital, a portfolio like a portfolio, a startup like a startup.
Return strict JSON only. No markdown fences. No prose outside JSON.`;
}

function buildUserPrompt(prompt, analysis) {
  const pageKeys = analysis.pageMode === "multi"
    ? ["index.html", "about.html", "services.html", "portfolio.html", "gallery.html", "contact.html", "privacy.html", "404.html"]
    : ["index.html"];
  const fileShape = [
    ...pageKeys.map((page) => `    "${page}": "complete semantic HTML document linking style.css and script.js"`),
    `    "style.css": "complete modern responsive CSS"`,
    `    "script.js": "modular valid JavaScript"`,
    `    "README.md": "deployment notes"`
  ].join(",\n");

  return `Original user intent, for analysis only:
${prompt}

Internal enhanced brief:
- Website type: ${analysis.websiteType}
- Industry: ${analysis.industry}
- Audience: ${analysis.targetAudience}
- Tone: ${analysis.tone}
- Page mode: ${analysis.pageMode}
- Use relevant image topics: ${analysis.imageTopics.join(", ")}
- Create unique section strategy, visual hierarchy, typography, color psychology, navigation, footer, interactions, and content.

Return JSON:
{
  "meta": {
    "name": "brand/project name inferred from request",
    "websiteType": "${analysis.websiteType}",
    "industry": "${analysis.industry}",
    "targetAudience": "...",
    "colorTheme": "...",
    "typography": "...",
    "style": "...",
    "sections": ["..."],
    "validation": {"html":true,"css":true,"javascript":true,"responsive":true,"links":true,"images":true}
  },
  "files": {
${fileShape}
  }
}

Rules:
- Do not include the raw prompt text anywhere in any generated page.
- No inline CSS. No inline JavaScript.
- Use semantic HTML5, accessible labels, SEO meta tags, smooth scrolling, responsive images with loading="lazy", hover states, animations, and keyboard-friendly navigation.
- Use royalty-free remote image URLs from source.unsplash.com relevant to the industry. Include meaningful alt text.
- If multi page, all navigation links must target real generated pages.
- Use maintainable comments only where helpful.
- Every page must be complete and production-looking.`;
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  try {
    const body = getBody(req);
    const prompt = String(body.prompt || "").trim().slice(0, 4000);
    const pageMode = body.pageMode === "multi" ? "multi" : "single";
    const regenerateNote = String(body.regenerateNote || "").trim();

    if (prompt.length < 12) {
      return res.status(400).json({ error: "Please describe the website you want to generate." });
    }

    const analysis = analyzePrompt(`${prompt} ${regenerateNote}`, pageMode);
    const raw = await callGemini(buildUserPrompt(prompt, analysis), {
      systemInstruction: buildSystemPrompt(),
      maxOutputTokens: pageMode === "multi" ? 16000 : 10000,
      temperature: 0.82,
      jsonMode: true
    });

    const project = normalizeProject(safeJson(raw, null), prompt, analysis);
    res.status(200).json(project);
  } catch (error) {
    sendError(res, error);
  }
};

function normalizeProject(parsed, prompt, analysis) {
  const fallback = buildFallbackProject(prompt, analysis);
  const files = parsed?.files && typeof parsed.files === "object" ? parsed.files : {};
  const normalizedFiles = {};
  const requiredPages = analysis.pageMode === "multi"
    ? ["index.html", "about.html", "services.html", "portfolio.html", "gallery.html", "contact.html", "privacy.html", "404.html"]
    : ["index.html"];

  requiredPages.forEach((page) => {
    normalizedFiles[page] = validateHtml(stripFence(files[page]), page, prompt) || fallback.files[page] || fallback.files["index.html"];
  });

  normalizedFiles["style.css"] = validateCss(stripFence(files["style.css"])) || fallback.files["style.css"];
  normalizedFiles["script.js"] = validateJs(stripFence(files["script.js"])) || fallback.files["script.js"];
  normalizedFiles["README.md"] = stripFence(files["README.md"]) || fallback.files["README.md"];

  return {
    meta: {
      ...fallback.meta,
      ...(parsed?.meta || {}),
      websiteType: parsed?.meta?.websiteType || analysis.websiteType,
      industry: parsed?.meta?.industry || analysis.industry,
      validation: validateProject(normalizedFiles)
    },
    files: normalizedFiles
  };
}

function stripFence(value = "") {
  return String(value)
    .replace(/^```(?:html|css|js|javascript|json|markdown)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function validateHtml(html, page, prompt) {
  if (!html || !/<!doctype html>/i.test(html) || !/<html[\s>]/i.test(html) || !/<body[\s>]/i.test(html)) return "";
  if (!/style\.css/i.test(html) || !/script\.js/i.test(html)) return "";
  const promptWords = String(prompt).toLowerCase().split(/\s+/).filter((word) => word.length > 6).slice(0, 10);
  const lowerHtml = html.toLowerCase();
  const echoed = promptWords.length >= 4 && promptWords.filter((word) => lowerHtml.includes(word)).length > 7;
  if (echoed && page === "index.html") return "";
  return html;
}

function validateCss(css) {
  if (!css || css.length < 800) return "";
  if (!/@media/i.test(css) || !/(grid|flex)/i.test(css)) return "";
  return css;
}

function validateJs(js) {
  if (!js) return "document.documentElement.classList.add('js-ready');";
  if (/<script/i.test(js)) return "";
  return js;
}

function validateProject(files) {
  const htmlFiles = Object.keys(files).filter((name) => name.endsWith(".html"));
  return {
    html: htmlFiles.every((name) => /<!doctype html>/i.test(files[name])),
    css: Boolean(files["style.css"] && /@media/i.test(files["style.css"])),
    javascript: Boolean(files["script.js"]),
    responsive: /@media/i.test(files["style.css"]),
    links: htmlFiles.every((name) => !/href="#"/i.test(files[name])),
    images: htmlFiles.some((name) => /<img/i.test(files[name]))
  };
}

function buildFallbackProject(prompt, analysis) {
  const config = getIndustryConfig(analysis.industry);
  const brand = inferBrand(prompt, config.brand);
  const pages = analysis.pageMode === "multi"
    ? ["index.html", "about.html", "services.html", "portfolio.html", "gallery.html", "contact.html", "privacy.html", "404.html"]
    : ["index.html"];
  const files = {};
  pages.forEach((page) => {
    files[page] = buildHtmlPage({ page, brand, config, analysis });
  });
  files["style.css"] = buildCss(config);
  files["script.js"] = buildJs();
  files["README.md"] = `# ${brand}\n\nGenerated by NOVA AI Website Generator.\n\n## Structure\n\n${pages.map((page) => `- ${page}`).join("\n")}\n- style.css\n- script.js\n- assets/\n\nDeploy this folder to Vercel, Netlify, GitHub Pages, or any static host.`;
  return {
    meta: {
      name: brand,
      websiteType: analysis.websiteType,
      industry: analysis.industry,
      targetAudience: analysis.targetAudience,
      colorTheme: config.theme,
      typography: config.font,
      style: config.style,
      sections: config.sections,
      validation: validateProject(files)
    },
    files
  };
}

function inferBrand(prompt, fallback) {
  const match = String(prompt).match(/(?:for|called|named)\s+([A-Z][A-Za-z0-9&'\-\s]{2,40})/);
  return (match?.[1] || fallback).replace(/[.?!].*$/, "").trim();
}

function getIndustryConfig(industry) {
  const configs = {
    restaurant: {
      brand: "Luma Osteria",
      theme: "olive black, tomato red, cream, and warm gold",
      font: "Playfair-style display with clean sans serif",
      style: "premium editorial restaurant experience",
      sections: ["Hero", "Signature Menu", "Chef Story", "Interior Gallery", "Reviews", "Reservations", "Footer"],
      nav: ["Menu", "Chef", "Gallery", "Reserve"],
      headline: "Handmade Italian dining with a candlelit city soul",
      subhead: "Seasonal pasta, wood-fired classics, and intimate hospitality crafted for long evenings.",
      cta: "Reserve a Table",
      cards: ["Truffle Tagliatelle", "Burrata Verde", "Tiramisu Classico"],
      topics: IMAGE_TOPICS.restaurant
    },
    cafe: {
      brand: "Ember & Bean",
      theme: "espresso, oat milk, sage, and copper",
      font: "Warm editorial serif with friendly sans serif",
      style: "cozy premium cafe website",
      sections: ["Hero", "Menu", "Roastery Story", "Pastry Gallery", "Reviews", "Visit", "Footer"],
      nav: ["Menu", "Story", "Gallery", "Visit"],
      headline: "Small-batch coffee, slow mornings, and pastry worth crossing town for",
      subhead: "A neighborhood cafe experience with seasonal drinks, handmade bakery favorites, and warm hospitality.",
      cta: "Explore Menu",
      cards: ["Single Origin Pour Over", "Honey Oat Latte", "Almond Croissant"],
      topics: IMAGE_TOPICS.cafe
    },
    hospital: {
      brand: "AsterCare Clinic",
      theme: "medical blue, mint, white, and soft navy",
      font: "Calm humanist sans serif",
      style: "trusted healthcare service site",
      sections: ["Hero", "Specialties", "Doctors", "Care Process", "Facilities", "Book Appointment", "Footer"],
      nav: ["Specialties", "Doctors", "Facilities", "Appointment"],
      headline: "Compassionate care with modern clinical precision",
      subhead: "Integrated diagnostics, expert doctors, and patient-first care in one accessible center.",
      cta: "Book Appointment",
      cards: ["Cardiology", "Pediatrics", "Diagnostics"],
      topics: IMAGE_TOPICS.hospital
    },
    portfolio: {
      brand: "Mira Studio",
      theme: "ink black, electric cyan, soft lilac, and pearl",
      font: "Bold geometric display with refined body text",
      style: "creative portfolio with case-study storytelling",
      sections: ["Hero", "Selected Work", "Process", "Services", "Testimonials", "Contact", "Footer"],
      nav: ["Work", "Process", "Services", "Contact"],
      headline: "Designing interfaces that feel effortless and sell clearly",
      subhead: "A UI/UX portfolio focused on product strategy, visual systems, and conversion-ready experiences.",
      cta: "View Case Studies",
      cards: ["Fintech App", "SaaS Dashboard", "Mobile Commerce"],
      topics: IMAGE_TOPICS.portfolio
    },
    gym: {
      brand: "IronPulse Fitness",
      theme: "charcoal, volt green, graphite, and white",
      font: "Condensed athletic display with sturdy sans serif",
      style: "high-energy fitness conversion site",
      sections: ["Hero", "Programs", "Trainers", "Memberships", "Transformation Stories", "Trial CTA", "Footer"],
      nav: ["Programs", "Trainers", "Plans", "Trial"],
      headline: "Train harder with coaches who know your name",
      subhead: "Strength, conditioning, and nutrition programs built around measurable progress.",
      cta: "Start Free Trial",
      cards: ["Strength Lab", "HIIT Burn", "Personal Coaching"],
      topics: IMAGE_TOPICS.gym
    },
    "real estate": {
      brand: "Elevate Realty",
      theme: "midnight navy, champagne, stone, and white",
      font: "Elegant serif accents with crisp sans serif",
      style: "luxury property showcase",
      sections: ["Hero", "Featured Listings", "Neighborhoods", "Amenities", "Agent Team", "Inquiry", "Footer"],
      nav: ["Listings", "Neighborhoods", "Amenities", "Inquiry"],
      headline: "Find a home that feels rare from the first visit",
      subhead: "Curated residences, local expertise, and a smoother path from showing to closing.",
      cta: "Schedule Viewing",
      cards: ["Penthouse Suite", "Garden Residence", "Skyline Loft"],
      topics: IMAGE_TOPICS["real estate"]
    },
    startup: {
      brand: "NimbleStack",
      theme: "deep violet, cyan, black, and glass white",
      font: "Modern SaaS sans serif",
      style: "sharp startup landing page",
      sections: ["Hero", "Product", "Workflow", "Integrations", "Pricing", "Proof", "Footer"],
      nav: ["Product", "Workflow", "Pricing", "Demo"],
      headline: "Launch workflows that scale before your team does",
      subhead: "Automate handoffs, approvals, and reporting with one intelligent operating layer.",
      cta: "Book Demo",
      cards: ["Automate", "Analyze", "Scale"],
      topics: IMAGE_TOPICS.startup
    },
    "ai saas": {
      brand: "FlowPilot AI",
      theme: "obsidian, electric blue, violet, and glass white",
      font: "Crisp product sans serif",
      style: "AI SaaS landing page with product-led storytelling",
      sections: ["Hero", "AI Features", "Workflow", "Integrations", "Pricing", "Security", "Footer"],
      nav: ["Features", "Workflow", "Pricing", "Demo"],
      headline: "Turn scattered work into one intelligent operating system",
      subhead: "AI agents that summarize, route, and automate everyday team workflows without adding another dashboard.",
      cta: "Start Free Trial",
      cards: ["AI Routing", "Live Insights", "Secure Automations"],
      topics: IMAGE_TOPICS["ai saas"]
    }
  };
  return configs[industry] || configs.startup;
}

function buildHtmlPage({ page, brand, config, analysis }) {
  const isHome = page === "index.html";
  const title = isHome ? brand : `${page.replace(".html", "").replace("-", " ")} | ${brand}`;
  const navLinks = analysis.pageMode === "multi"
    ? ["index.html", "about.html", "services.html", "gallery.html", "contact.html"].map((href) => `<a href="${href}">${href === "index.html" ? "Home" : titleCase(href.replace(".html", ""))}</a>`).join("")
    : config.nav.map((item) => `<a href="#${item.toLowerCase().replace(/\s+/g, "-")}">${item}</a>`).join("");
  const gallery = config.topics.map((topic, index) => `<img loading="lazy" src="${imageUrl(topic, index)}" alt="${brand} ${topic.replace(/-/g, " ")}">`).join("");
  const cards = config.cards.map((card, index) => `<article class="feature-card"><span>0${index + 1}</span><h3>${card}</h3><p>${sectionCopy(analysis.industry, card)}</p></article>`).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${brand} - ${config.subhead}">
  <title>${title}</title>
  <link rel="preconnect" href="https://source.unsplash.com">
  <link rel="stylesheet" href="style.css">
</head>
<body data-industry="${analysis.industry}">
  <header class="site-header">
    <a class="brand" href="index.html">${brand}</a>
    <button class="menu-toggle" type="button" aria-label="Toggle navigation">Menu</button>
    <nav class="site-nav" aria-label="Primary navigation">${navLinks}</nav>
  </header>
  <main>
    <section class="hero" id="home">
      <div class="hero-copy">
        <p class="eyebrow">${analysis.websiteType}</p>
        <h1>${config.headline}</h1>
        <p>${config.subhead}</p>
        <a class="button" href="${analysis.pageMode === "multi" ? "contact.html" : "#contact"}">${config.cta}</a>
      </div>
      <div class="hero-media"><img loading="eager" src="${imageUrl(config.topics[0], 0)}" alt="${brand} hero image"></div>
    </section>
    <section class="feature-grid" id="${config.nav[0].toLowerCase().replace(/\s+/g, "-")}">${cards}</section>
    <section class="story-band" id="${config.nav[1].toLowerCase().replace(/\s+/g, "-")}">
      <div><p class="eyebrow">Why choose us</p><h2>Built around real people, not generic pages.</h2><p>${brand} blends specialist expertise, memorable visuals, and a conversion-focused visitor journey tailored to ${analysis.targetAudience}.</p></div>
      <div class="metric"><strong>98%</strong><span>visitor-ready experience score</span></div>
    </section>
    <section class="gallery" id="gallery">${gallery}</section>
    <section class="cta-panel" id="contact"><h2>Ready to begin with ${brand}?</h2><p>Tell us what you need and our team will guide the next step.</p><a class="button ghost" href="mailto:hello@example.com">Contact Now</a></section>
  </main>
  <footer><strong>${brand}</strong><span>${config.theme}</span><span>© 2026 ${brand}. All rights reserved.</span></footer>
  <script src="script.js"></script>
</body>
</html>`;
}

function sectionCopy(industry, card) {
  const copy = {
    restaurant: `A signature ${card.toLowerCase()} experience prepared with seasonal ingredients and polished service.`,
    hospital: `${card} delivered with modern equipment, clear communication, and compassionate follow-through.`,
    portfolio: `${card} showcases strategy, interaction design, and measurable product outcomes.`,
    gym: `${card} combines expert programming, accountability, and visible progress tracking.`,
    "real estate": `${card} highlights premium details, lifestyle value, and a confident buying journey.`
  };
  return copy[industry] || `${card} helps visitors understand value quickly and take action with confidence.`;
}

function buildCss(config) {
  return `:root{color-scheme:dark;--bg:#071019;--panel:rgba(255,255,255,.075);--text:#f8fbff;--muted:#b8c4d6;--accent:#69e6ff;--accent2:#f7c76b;--line:rgba(255,255,255,.16);font-family:Inter,Arial,sans-serif}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 20% 0%,rgba(105,230,255,.18),transparent 34%),linear-gradient(135deg,#05070d,#111827 58%,#182235);color:var(--text)}img{max-width:100%;display:block;border-radius:18px}a{color:inherit}.site-header{position:sticky;top:0;z-index:10;display:flex;justify-content:space-between;align-items:center;gap:18px;padding:18px clamp(18px,5vw,74px);border-bottom:1px solid var(--line);background:rgba(5,7,13,.72);backdrop-filter:blur(18px)}.brand{font-weight:900;text-decoration:none;font-size:1.15rem}.site-nav{display:flex;gap:18px;align-items:center}.site-nav a{text-decoration:none;color:var(--muted);font-weight:800}.site-nav a:hover{color:var(--text)}.menu-toggle{display:none}.hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.78fr);gap:42px;align-items:center;min-height:78vh;padding:clamp(54px,8vw,110px) clamp(18px,6vw,94px)}.eyebrow{color:var(--accent);text-transform:uppercase;letter-spacing:.12em;font-weight:900;font-size:.78rem}.hero h1{font-family:Georgia,serif;font-size:clamp(3rem,8vw,6.8rem);line-height:.95;margin:0 0 22px}.hero p,.story-band p,.cta-panel p{color:var(--muted);font-size:1.08rem;line-height:1.75}.button{display:inline-flex;width:max-content;margin-top:18px;padding:14px 20px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#071019;text-decoration:none;font-weight:950;box-shadow:0 18px 44px rgba(0,0,0,.25)}.button.ghost{background:transparent;color:var(--text);border:1px solid var(--line)}.hero-media{position:relative}.hero-media:before{content:"";position:absolute;inset:-18px;border:1px solid var(--line);border-radius:26px;background:var(--panel);transform:rotate(-3deg)}.hero-media img{position:relative;aspect-ratio:4/5;object-fit:cover;box-shadow:0 30px 80px rgba(0,0,0,.35)}.feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding:36px clamp(18px,6vw,94px)}.feature-card,.story-band,.cta-panel{border:1px solid var(--line);border-radius:22px;background:var(--panel);backdrop-filter:blur(20px);box-shadow:0 20px 70px rgba(0,0,0,.22)}.feature-card{padding:26px;transition:transform .25s ease,border-color .25s ease}.feature-card:hover{transform:translateY(-6px);border-color:rgba(105,230,255,.55)}.feature-card span{color:var(--accent);font-weight:950}.feature-card h3{font-size:1.45rem}.feature-card p{color:var(--muted);line-height:1.65}.story-band{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:32px;margin:34px clamp(18px,6vw,94px);padding:34px}.story-band h2,.cta-panel h2{font-size:clamp(2rem,5vw,4rem);line-height:1;margin:0}.metric{display:grid;place-items:center;text-align:center;min-width:190px}.metric strong{font-size:4rem;color:var(--accent2)}.metric span{color:var(--muted)}.gallery{display:grid;grid-template-columns:1.2fr .8fr 1fr .9fr;gap:14px;padding:34px clamp(18px,6vw,94px)}.gallery img{height:330px;width:100%;object-fit:cover}.gallery img:nth-child(2),.gallery img:nth-child(4){margin-top:42px}.cta-panel{text-align:center;margin:30px clamp(18px,6vw,94px) 70px;padding:44px}footer{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;padding:28px clamp(18px,6vw,94px);border-top:1px solid var(--line);color:var(--muted)}@media(max-width:860px){.menu-toggle{display:inline-flex;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:10px;padding:10px 12px}.site-nav{display:none;position:absolute;left:18px;right:18px;top:66px;flex-direction:column;align-items:flex-start;padding:18px;border:1px solid var(--line);border-radius:16px;background:#101827}.site-nav.open{display:flex}.hero,.story-band{grid-template-columns:1fr}.feature-grid,.gallery{grid-template-columns:1fr}.gallery img,.gallery img:nth-child(2),.gallery img:nth-child(4){height:260px;margin-top:0}.hero{min-height:auto}.metric{place-items:start;text-align:left}}`;
}

function buildJs() {
  return `const nav=document.querySelector('.site-nav');document.querySelector('.menu-toggle')?.addEventListener('click',()=>nav?.classList.toggle('open'));document.querySelectorAll('a[href^="#"]').forEach(link=>{link.addEventListener('click',event=>{const target=document.querySelector(link.getAttribute('href'));if(target){event.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});nav?.classList.remove('open');}});});const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('is-visible');});},{threshold:.16});document.querySelectorAll('.feature-card,.story-band,.gallery img,.cta-panel').forEach(el=>observer.observe(el));`;
}
