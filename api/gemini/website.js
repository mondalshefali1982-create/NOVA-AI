const {
  callGemini,
  getBody,
  handleOptions,
  requirePost,
  safeJson,
  sendError,
  setCors
} = require("../_lib/gemini");

const WEBSITE_TYPES = [
  "Portfolio",
  "Business",
  "Restaurant",
  "Cafe",
  "Agency",
  "Startup",
  "AI SaaS",
  "E-commerce Landing Page",
  "Gym",
  "Photography",
  "Personal Portfolio",
  "Education",
  "School",
  "College",
  "NGO",
  "Hospital",
  "Hotel",
  "Real Estate",
  "Blog",
  "Event",
  "Travel",
  "Landing Page",
  "Corporate",
  "Freelancer",
  "Custom Website"
];

function stripCodeFences(value = "") {
  return String(value)
    .replace(/^```(?:html|css|js|javascript|json|markdown)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function normalizeFile(value = "", fallback = "") {
  const clean = stripCodeFences(value);
  return clean || fallback;
}

function buildFallback(prompt) {
  const title = prompt || "NOVA Generated Website";
  return {
    meta: {
      websiteType: "Custom Website",
      colorTheme: "Midnight blue, cyan, and warm white",
      targetAudience: "Modern digital customers",
      typography: "Inter-style sans serif",
      style: "Modern responsive landing page",
      sections: ["Header", "Hero", "Services", "About", "Testimonials", "Contact", "Footer"]
    },
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${title}">
  <title>${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="#">Studio</a>
    <nav aria-label="Primary navigation">
      <a href="#services">Services</a>
      <a href="#about">About</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>
  <main>
    <section class="hero">
      <p class="eyebrow">AI generated website</p>
      <h1>${title}</h1>
      <p>A polished, responsive starter website created by NOVA AI.</p>
      <a class="button" href="#contact">Start a Project</a>
    </section>
    <section id="services" class="grid-section">
      <article><h2>Strategy</h2><p>Clear positioning, conversion-focused structure, and accessible content.</p></article>
      <article><h2>Design</h2><p>Responsive layouts, refined spacing, and a modern visual system.</p></article>
      <article><h2>Launch</h2><p>Clean HTML, CSS, and JavaScript ready to deploy.</p></article>
    </section>
    <section id="about" class="split-section">
      <div><h2>Built for real visitors</h2><p>This page includes semantic sections, mobile behavior, and production-minded structure.</p></div>
      <div class="stat"><strong>100%</strong><span>Responsive</span></div>
    </section>
    <section id="contact" class="cta"><h2>Ready to build?</h2><p>Replace this copy with your details and launch confidently.</p><a class="button" href="mailto:hello@example.com">Contact Us</a></section>
  </main>
  <footer>© 2026 Studio. All rights reserved.</footer>
  <script src="script.js"></script>
</body>
</html>`,
      "style.css": `:root{color-scheme:dark;--bg:#07111f;--panel:#101c2c;--text:#f7fbff;--muted:#aebed0;--accent:#41d7ff}*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:linear-gradient(135deg,#07111f,#13243a);color:var(--text)}a{color:inherit}.site-header{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;padding:22px clamp(18px,5vw,72px);background:rgba(7,17,31,.78);backdrop-filter:blur(18px)}.brand{font-weight:900;text-decoration:none}nav{display:flex;gap:18px}nav a{text-decoration:none;color:var(--muted)}.hero{min-height:70vh;display:grid;place-content:center;padding:80px clamp(18px,6vw,96px);max-width:980px}.eyebrow{color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:.08em}.hero h1{font-size:clamp(2.8rem,8vw,6rem);line-height:1;margin:0 0 20px}.hero p{max-width:680px;color:var(--muted);font-size:1.15rem;line-height:1.7}.button{display:inline-flex;width:max-content;margin-top:18px;padding:14px 20px;border-radius:10px;background:var(--accent);color:#00111a;text-decoration:none;font-weight:900}.grid-section{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding:48px clamp(18px,6vw,96px)}article,.split-section,.cta{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);border-radius:18px;padding:26px}.split-section{display:grid;grid-template-columns:1fr auto;gap:28px;margin:32px clamp(18px,6vw,96px);align-items:center}.stat strong{font-size:3rem;color:var(--accent)}.stat span{display:block;color:var(--muted)}.cta{margin:32px clamp(18px,6vw,96px) 56px;text-align:center}footer{padding:28px;text-align:center;color:var(--muted)}@media(max-width:760px){.site-header,nav{align-items:flex-start;flex-direction:column}.grid-section,.split-section{grid-template-columns:1fr}.hero{min-height:auto;padding-top:64px}}`,
      "script.js": `document.querySelectorAll('a[href^="#"]').forEach((link)=>{link.addEventListener("click",(event)=>{const target=document.querySelector(link.getAttribute("href"));if(target){event.preventDefault();target.scrollIntoView({behavior:"smooth",block:"start"});}});});`,
      "README.md": `# ${title}\n\nGenerated by NOVA AI Website Generator.\n\n## Files\n\n- index.html\n- style.css\n- script.js\n- assets/\n\nOpen index.html in a browser or deploy the folder to any static hosting provider.\n`
    }
  };
}

function normalizeWebsite(raw, prompt) {
  const parsed = safeJson(raw, null);
  const fallback = buildFallback(prompt);

  if (!parsed || typeof parsed !== "object") return fallback;

  const files = parsed.files || {};
  return {
    meta: {
      ...fallback.meta,
      ...(parsed.meta || {}),
      sections: Array.isArray(parsed?.meta?.sections) ? parsed.meta.sections.slice(0, 10) : fallback.meta.sections
    },
    files: {
      "index.html": normalizeFile(files["index.html"] || parsed.html, fallback.files["index.html"]),
      "style.css": normalizeFile(files["style.css"] || parsed.css, fallback.files["style.css"]),
      "script.js": normalizeFile(files["script.js"] || parsed.js || parsed.javascript, fallback.files["script.js"]),
      "README.md": normalizeFile(files["README.md"] || parsed.readme, fallback.files["README.md"])
    }
  };
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  try {
    const { prompt = "", regenerateNote = "" } = getBody(req);
    const userPrompt = String(prompt).trim().slice(0, 3000);

    if (userPrompt.length < 12) {
      res.status(400).json({ error: "Please describe the website you want to generate." });
      return;
    }

    const raw = await callGemini(
      `User request:\n${userPrompt}\n\nRegeneration instruction:\n${regenerateNote || "Generate the best complete version."}\n\nSupported website types:\n${WEBSITE_TYPES.join(", ")}\n\nCreate an internal plan first, then return only valid JSON with this exact shape:\n{\n  "meta": {\n    "websiteType": "one supported type or Custom Website",\n    "colorTheme": "concise theme",\n    "targetAudience": "concise audience",\n    "layout": "concise layout",\n    "typography": "concise typography",\n    "style": "concise visual style",\n    "mobileDesign": "concise responsive behavior",\n    "sections": ["Header","Hero","..."]\n  },\n  "files": {\n    "index.html": "complete semantic HTML document linking style.css and script.js",\n    "style.css": "complete responsive CSS",\n    "script.js": "valid JavaScript for interactions",\n    "README.md": "short usage notes"\n  }\n}\n\nRules:\n- Do not use markdown fences.\n- Do not inline CSS or JavaScript.\n- No placeholders like lorem ipsum, TODO, image placeholder, or coming soon.\n- Use production-quality copy tailored to the prompt.\n- Include accessibility, SEO meta basics, responsive sections, and working navigation.\n- Keep assets local-friendly; if images are needed, use CSS gradients or clearly named assets references only when the page still works without them.`,
      {
        systemInstruction: "You are NOVA AI's senior website generation engine. Return strict JSON only with complete separate website files.",
        maxOutputTokens: 12000,
        temperature: 0.45,
        jsonMode: true
      }
    );

    const website = normalizeWebsite(raw, userPrompt);
    res.status(200).json(website);
  } catch (error) {
    sendError(res, error);
  }
};
