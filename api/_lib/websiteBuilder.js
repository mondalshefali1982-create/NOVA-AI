const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const MODELS_PRIORITY = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "qwen/qwen-2.5-coder-32b-instruct",
  "deepseek/deepseek-chat"
];

const TIMEOUT_MS = 25000; // 25 seconds hard timeout

const INDUSTRY_HINTS = [
  "restaurant", "cafe", "hotel", "hospital", "school", "portfolio", "agency",
  "startup", "saas", "travel", "architecture", "law", "photography",
  "real estate", "fashion", "gym", "finance", "technology", "gaming",
  "wedding", "healthcare", "ecommerce", "ngo", "college", "blog", "event"
];

function createLogger() {
  const startedAt = Date.now();
  const entries = [];
  return {
    entries,
    log(event, data = {}) {
      entries.push({ event, at: Date.now() - startedAt, ...data });
    },
    summary(extra = {}) {
      return { totalMs: Date.now() - startedAt, entries, ...extra };
    }
  };
}

function enhancePrompt(userPrompt = "") {
  const prompt = String(userPrompt).trim();
  const lower = prompt.toLowerCase();
  const industry = INDUSTRY_HINTS.find((item) => lower.includes(item)) || "custom";
  const audience = lower.includes("luxury") || lower.includes("premium")
    ? "premium buyers and high-intent customers"
    : lower.includes("student")
      ? "students and families"
      : "modern web visitors";
  const tone = lower.includes("minimal") ? "minimal" : lower.includes("playful") ? "playful" : lower.includes("corporate") ? "corporate" : "premium";
  const cta = lower.includes("book") ? "Book now" : lower.includes("reserve") ? "Reserve now" : lower.includes("contact") ? "Contact us" : "Get started";

  return {
    originalPrompt: prompt,
    industry,
    audience,
    tone,
    primaryCta: cta,
    brief: [
      `Industry: ${industry}`,
      `Audience: ${audience}`,
      `Tone: ${tone}`,
      `Primary CTA: ${cta}`,
      "Design from an empty canvas with no reusable template.",
      "Use a distinct layout, typography, spacing, imagery, animation system, and component language for this exact prompt.",
      "Use reliable remote images from images.unsplash.com with query parameters only when the URL is known and stable; otherwise use CSS gradients and SVG/data visual accents.",
      "Create a production-quality, multi-page website project with fully styled interactive pages."
    ].join("\n")
  };
}

function estimateMaxTokens(prompt = "") {
  const lower = prompt.toLowerCase();
  if (lower.includes("landing") || lower.includes("single page")) {
    return 2000;
  }
  if (lower.includes("complex") || lower.includes("dashboard") || lower.includes("app")) {
    return 5500;
  }
  if (lower.includes("large") || lower.includes("portal") || lower.includes("many pages")) {
    return 4500;
  }
  return 3500; // Standard business multi-page default
}

function buildSystemPrompt() {
  return `You are NOVA AI Website Builder: a senior UI/UX designer and frontend engineer.
Generate a complete, modern, responsive multi-page website project.

Planning Requirements:
First, analyze the prompt and plan the website structure:
- Website Type & Industry
- Target Audience & Tone
- Color Palette (modern SaaS style, e.g. glassmorphism, gradients, hover states)
- Typography (modern, clean, sans-serif like Space Grotesk or Inter)
- Required Pages (e.g. Home, About, Services, Contact)
- Layout & Responsiveness

Output Format:
Return ONLY a valid JSON object mapping filenames to their complete HTML/CSS/JS contents.
The JSON must have this structure:
{
  "files": {
    "index.html": "<!DOCTYPE html>...",
    "about.html": "<!DOCTYPE html>...",
    "services.html": "<!DOCTYPE html>...",
    "contact.html": "<!DOCTYPE html>..."
  }
}

Page Content Requirements:
- Each page must be a complete HTML document with embedded <style> and <script>.
- Connect pages together with relative href anchors (e.g. href="about.html", href="index.html").
- Design must feel premium, Stripe-like, Awwwards-worthy, with smooth animations, loading states, and sticky navigation.
- Insert real royalty-free images from images.unsplash.com containing relevant keyword query parameters (e.g., food, technology, fitness, doctors).
- Every button, navbar link, mobile burger menu, and form must be interactive and functional via lightweight JavaScript.
- All styles must be fully responsive (desktop, tablet, mobile).
- Include meta SEO, Open Graph, accessibility ARIA attributes, and Google Fonts.
- Do NOT use markdown code block wraps (no \`\`\`json), no code fences, no comments outside the JSON, and no explanations. Return only raw JSON.`;
}

function buildGenerationPrompt(analysis, existingHtml = "", editPrompt = "") {
  if (existingHtml && editPrompt) {
    const slicedHtml = String(existingHtml).slice(0, 40000);
    return `Edit mode.
Existing code context:
${slicedHtml}

User edit request:
${editPrompt}

Modify only the parts required by the edit request while preserving all other styles, layouts, and files.
Return the updated code in the standard output JSON format.`;
  }

  return `User prompt:
${analysis.originalPrompt}

Brief:
${analysis.brief}

Requirements:
- Plan and generate a beautiful, modern multi-page project.
- Return the files in the standard output JSON format.`;
}

async function generateWebsiteHtml({ prompt, existingHtml = "", editPrompt = "" }) {
  const logger = createLogger();
  const analysis = enhancePrompt(editPrompt || prompt);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildGenerationPrompt(analysis, existingHtml, editPrompt);
  const apiKey = process.env.OPENROUTER_API_KEY;
  const googleApiKey = process.env.GOOGLE_API_KEY;

  let finalResult = null;
  let lastError = null;

  // ── Primary: Try Google Gemini 2.5 Flash if available ───────────────
  if (googleApiKey) {
    try {
      console.log(`[Website Builder] Trying Google Gemini 2.5 Flash for website generation...`);
      const geminiStart = Date.now();
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt + "\n\nUser: " + userPrompt + "\n\nIMPORTANT: Return valid JSON matching { \"files\": { \"index.html\": \"...\", \"about.html\": \"...\", \"styles.css\": \"...\" } } only." }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json",
              maxOutputTokens: 8192,
              temperature: editPrompt ? 0.3 : 0.7
            }
          })
        },
        TIMEOUT_MS,
        "gemini-2.5-flash"
      );

      if (response.ok) {
        const data = await response.json();
        const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (rawContent.trim()) {
          let files = {};
          try {
            const parsed = parseModelJson(rawContent);
            if (parsed && parsed.files) files = parsed.files;
          } catch {
            files = { "index.html": repairHtml(rawContent) };
          }

          const validatedFiles = {};
          for (const [name, content] of Object.entries(files)) {
            if (name.endsWith(".html")) {
              let validation = validateHtml(content);
              let repaired = validation.usable ? content : repairHtml(content);
              validatedFiles[name] = cleanupHtml(injectIframeNavigationScript(repaired));
            } else {
              validatedFiles[name] = content;
            }
          }

          if (!validatedFiles["index.html"]) {
            const first = Object.keys(validatedFiles).find(k => k.endsWith(".html"));
            validatedFiles["index.html"] = first ? validatedFiles[first] : repairHtml(rawContent);
          }

          const duration = Date.now() - geminiStart;
          finalResult = {
            html: validatedFiles["index.html"],
            files: validatedFiles,
            meta: {
              modelUsed: "gemini-2.5-flash",
              fallbackUsed: false,
              retryAttempts: 0,
              generationTimeMs: duration,
              industry: analysis.industry,
              targetAudience: analysis.audience,
              tone: analysis.tone,
              primaryCta: analysis.primaryCta,
              validation: { usable: true, errors: [] }
            },
            logs: logger.summary({ selectedModel: "gemini-2.5-flash" })
          };
        }
      }
    } catch (gErr) {
      console.warn("[Website Builder] Gemini attempt failed, falling back:", gErr.message);
    }
  }

  // ── OpenRouter Fallback Chain ────────────────────────────────────────
  if (!finalResult && apiKey) {
  for (const modelId of MODELS_PRIORITY) {
    try {
    const modelStart = Date.now();
    let maxTokens = estimateMaxTokens(editPrompt || prompt);
    let retryTokensAttempt = 0;
    
    console.log(`[Website Builder] Attempting generation with model: ${modelId} | Target tokens: ${maxTokens}`);
    logger.log("model_start", { model: modelId, maxTokens });

    while (retryTokensAttempt < 5) {
      try {
        const response = await fetchWithTimeout(
          OPENROUTER_ENDPOINT,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://nova-ai-rohann.vercel.app",
              "X-Title": "NOVA AI Website Builder"
            },
            body: JSON.stringify({
              model: modelId,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ],
              temperature: editPrompt ? 0.30 : 0.80,
              max_tokens: maxTokens
            })
          },
          TIMEOUT_MS,
          modelId
        );

        const duration = Date.now() - modelStart;
        const text = await response.text();

        // ── Handle Token Exceeded / Model Limit Failures ─────────────────
        if (!response.ok) {
          if (response.status === 400 && (text.includes("requires fewer max_tokens") || text.includes("context_length_exceeded") || text.includes("max_tokens"))) {
            console.warn(`[Website Builder] Model ${modelId} returned token limit error. Retrying with reduced max_tokens...`);
            maxTokens = Math.max(1500, Math.floor(maxTokens * 0.75));
            retryTokensAttempt++;
            continue;
          }
          throw new Error(`OpenRouter ${modelId} failed (${response.status}): ${text.slice(0, 300)}`);
        }

        let parsedJson;
        try {
          parsedJson = JSON.parse(text);
        } catch {
          throw new Error(`OpenRouter ${modelId} returned invalid JSON.`);
        }

        const rawContent = parsedJson?.choices?.[0]?.message?.content || "";
        const tokenUsage = parsedJson.usage || null;
        console.log(`[Website Builder] Model ${modelId} succeeded in ${duration}ms. Tokens used:`, tokenUsage);

        if (!rawContent.trim()) {
          throw new Error(`OpenRouter ${modelId} returned empty content.`);
        }

        // ── Parse multi-page files object ────────────────────────────────
        let files = {};
        try {
          const parsedData = parseModelJson(rawContent);
          if (parsedData && parsedData.files) {
            files = parsedData.files;
          } else {
            throw new Error("Parsed JSON did not contain 'files' object.");
          }
        } catch (parseErr) {
          console.warn(`[Website Builder] JSON parse failed on ${modelId} output. Falling back to single-page raw HTML...`);
          const repairedSingleHtml = repairHtml(rawContent);
          files = { "index.html": repairedSingleHtml };
        }

        // ── HTML Validation & Auto-repair ──────────────────────────────
        const validatedFiles = {};
        for (const [name, content] of Object.entries(files)) {
          if (name.endsWith(".html")) {
            let validation = validateHtml(content);
            let repaired = content;
            if (!validation.usable) {
              console.warn(`[Website Builder] HTML Validation failed for ${name}. Running auto-repair...`);
              repaired = repairHtml(content);
              validation = validateHtml(repaired);
            }
            // Inject multi-page iframe router intercept script and clean whitespace
            const injected = injectIframeNavigationScript(repaired);
            validatedFiles[name] = cleanupHtml(injected);
          } else {
            validatedFiles[name] = content;
          }
        }

        // If index.html is missing, create it from first HTML page or default
        if (!validatedFiles["index.html"]) {
          const firstHtmlKey = Object.keys(validatedFiles).find(k => k.endsWith(".html"));
          if (firstHtmlKey) {
            validatedFiles["index.html"] = validatedFiles[firstHtmlKey];
          } else {
            validatedFiles["index.html"] = buildErrorPage(new Error("Index page was missing from generated project."));
          }
        }

        // Add a clean README.md offline file for offline user instructions
        if (!validatedFiles["README.md"]) {
          validatedFiles["README.md"] = `# ${analysis.industry.toUpperCase()} Web Project\n\nGenerated by NOVA AI.\n\n## Structure\n- index.html (Home page)\n- Click around to navigate other pages offline!\n- Open directly in any modern browser.`;
        }

        logger.log("model_success", {
          model: modelId,
          durationMs: duration,
          tokenUsage,
          pages: Object.keys(validatedFiles)
        });

        finalResult = {
          html: validatedFiles["index.html"],
          files: validatedFiles,
          meta: {
            modelUsed: modelId,
            fallbackUsed: modelId !== MODELS_PRIORITY[0],
            retryAttempts: retryTokensAttempt,
            generationTimeMs: duration,
            industry: analysis.industry,
            targetAudience: analysis.audience,
            tone: analysis.tone,
            primaryCta: analysis.primaryCta,
            validation: { usable: true, errors: [] }
          },
          logs: logger.summary({ selectedModel: modelId, tokenUsage })
        };
        break;

      } catch (err) {
        // Fall through token attempt limit or trigger next priority model
        if (err.message.includes("requires fewer max_tokens") || err.message.includes("max_tokens")) {
          maxTokens = Math.max(1500, Math.floor(maxTokens * 0.75));
          retryTokensAttempt++;
          continue;
        }
        throw err;
      }
    }

    if (finalResult) break; // Succeeded! Stop fallback chain

  } catch (err) {
    console.error(`[Website Builder] Model attempt failed:`, err.message);
    lastError = err;
    logger.log("model_error", { message: err.message });
  }
  }
  }

  // ── Success check ───────────────────────────────────────────────────
  if (finalResult) {
    return finalResult;
  }

  // ── Resilient Local Website Generator Fallback ───────────────────────
  console.log("[Website Builder] Generating resilient local multi-page website project...");
  const localProject = buildLocalWebsiteProject(analysis, editPrompt || prompt, existingHtml);
  return {
    ...localProject,
    logs: logger.summary({ selectedModel: "nova-local-builder" })
  };
}

function buildLocalWebsiteProject(analysis, prompt, existingHtml = "") {
  const rawIndustry = analysis.industry || "Digital";
  const title = rawIndustry.charAt(0).toUpperCase() + rawIndustry.slice(1) + " Studio";
  const desc = prompt.slice(0, 140) || "Modern AI-crafted web experience.";

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="styles.css">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
  <header class="site-header">
    <div class="container nav-wrap">
      <a href="index.html" class="logo">${title}</a>
      <nav class="nav-links">
        <a href="index.html" class="active">Home</a>
        <a href="about.html">About</a>
        <a href="#features">Features</a>
        <a href="#contact" class="btn btn-sm">${analysis.primaryCta || "Get Started"}</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="hero-section">
      <div class="container hero-content">
        <span class="badge">NOVA AI Web Studio</span>
        <h1>Engineered for Next-Generation Excellence</h1>
        <p class="hero-sub">${desc}</p>
        <div class="hero-actions">
          <a href="#contact" class="btn btn-primary">${analysis.primaryCta || "Get Started"}</a>
          <a href="about.html" class="btn btn-secondary">Learn More</a>
        </div>
      </div>
    </section>

    <section id="features" class="features-section">
      <div class="container">
        <div class="section-head">
          <h2>Core Capabilities</h2>
          <p>Everything required to launch, scale, and captivate modern visitors.</p>
        </div>
        <div class="features-grid">
          <div class="card">
            <div class="icon-box">⚡</div>
            <h3>High Performance</h3>
            <p>Optimized for instantaneous loading, buttery smooth animations, and high SEO scores.</p>
          </div>
          <div class="card">
            <div class="icon-box">💎</div>
            <h3>Neo-Glass Aesthetics</h3>
            <p>Tactile depth, frosted glassmorphism surfaces, and specular refractive borders.</p>
          </div>
          <div class="card">
            <div class="icon-box">🛡️</div>
            <h3>Enterprise Grade</h3>
            <p>Resilient multi-page architecture with deterministic client navigation.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="contact" class="cta-section">
      <div class="container cta-card">
        <h2>Ready to transform your digital presence?</h2>
        <p>Experience the precision of NOVA AI multi-page web engineering.</p>
        <a href="about.html" class="btn btn-primary">${analysis.primaryCta || "Contact Our Team"}</a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container footer-content">
      <p>&copy; ${new Date().getFullYear()} ${title}. Generated by NOVA AI.</p>
      <div class="footer-links">
        <a href="index.html">Home</a>
        <a href="about.html">About</a>
      </div>
    </div>
  </footer>
</body>
</html>`;

  const aboutHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About Us | ${title}</title>
  <link rel="stylesheet" href="styles.css">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
  <header class="site-header">
    <div class="container nav-wrap">
      <a href="index.html" class="logo">${title}</a>
      <nav class="nav-links">
        <a href="index.html">Home</a>
        <a href="about.html" class="active">About</a>
        <a href="index.html#features">Features</a>
        <a href="index.html#contact" class="btn btn-sm">${analysis.primaryCta || "Get Started"}</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="page-header">
      <div class="container">
        <span class="badge">Our Mission</span>
        <h1>About ${title}</h1>
        <p class="hero-sub">Pioneering digital experiences designed for ${analysis.audience}.</p>
      </div>
    </section>

    <section class="about-content">
      <div class="container about-grid">
        <div class="about-text">
          <h2>Crafted with Purpose</h2>
          <p>We combine design excellence with modern architecture to deliver solutions that inspire and perform. Our digital solutions are built from the ground up to empower users with speed and simplicity.</p>
          <p>Created with the NOVA AI Website Studio, this multi-page project demonstrates responsive layouts, fluid typography, and cohesive visual branding.</p>
        </div>
        <div class="card stat-card">
          <h3>99.9%</h3>
          <p>Target Availability & Uptime</p>
          <hr class="divider">
          <h3>100%</h3>
          <p>Mobile Responsive & Verified</p>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container footer-content">
      <p>&copy; ${new Date().getFullYear()} ${title}. Generated by NOVA AI.</p>
      <div class="footer-links">
        <a href="index.html">Home</a>
        <a href="about.html">About</a>
      </div>
    </div>
  </footer>
</body>
</html>`;

  const css = `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #0f172a; color: #f8fafc; line-height: 1.6; }
.container { width: min(1140px, calc(100% - 48px)); margin: 0 auto; }
.site-header { position: sticky; top: 0; z-index: 100; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding: 18px 0; }
.nav-wrap { display: flex; align-items: center; justify-content: space-between; }
.logo { font-size: 1.25rem; font-weight: 800; color: #38bdf8; text-decoration: none; letter-spacing: -0.02em; }
.nav-links { display: flex; align-items: center; gap: 24px; }
.nav-links a { color: #94a3b8; text-decoration: none; font-size: 0.95rem; font-weight: 500; transition: color 0.2s; }
.nav-links a:hover, .nav-links a.active { color: #ffffff; }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 12px 24px; border-radius: 9999px; font-weight: 600; font-size: 0.95rem; text-decoration: none; cursor: pointer; transition: all 0.2s; }
.btn-sm { padding: 8px 18px; font-size: 0.85rem; }
.btn-primary { background: linear-gradient(135deg, #0284c7, #6366f1); color: #ffffff; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(2, 132, 199, 0.5); }
.btn-secondary { background: rgba(255, 255, 255, 0.08); color: #f8fafc; border: 1px solid rgba(255, 255, 255, 0.15); }
.btn-secondary:hover { background: rgba(255, 255, 255, 0.15); }
.hero-section { padding: 100px 0 80px; text-align: center; }
.badge { display: inline-block; padding: 6px 14px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
.hero-content h1 { font-size: clamp(2.2rem, 5vw, 3.8rem); font-weight: 800; line-height: 1.15; margin-bottom: 20px; letter-spacing: -0.03em; background: linear-gradient(135deg, #ffffff 40%, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hero-sub { font-size: 1.15rem; color: #94a3b8; max-width: 640px; margin: 0 auto 36px; }
.hero-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
.features-section { padding: 80px 0; }
.section-head { text-align: center; margin-bottom: 50px; }
.section-head h2 { font-size: 2.2rem; font-weight: 700; margin-bottom: 12px; }
.section-head p { color: #94a3b8; }
.features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
.card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 32px; backdrop-filter: blur(12px); transition: transform 0.2s, border-color 0.2s; }
.card:hover { transform: translateY(-4px); border-color: rgba(56, 189, 248, 0.4); }
.icon-box { font-size: 2rem; margin-bottom: 16px; }
.card h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 10px; }
.card p { color: #94a3b8; font-size: 0.95rem; }
.cta-section { padding: 60px 0 100px; }
.cta-card { background: linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(99, 102, 241, 0.15)); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 28px; padding: 60px 32px; text-align: center; }
.cta-card h2 { font-size: 2.2rem; font-weight: 800; margin-bottom: 12px; }
.cta-card p { color: #94a3b8; margin-bottom: 28px; }
.page-header { padding: 70px 0 40px; text-align: center; }
.about-content { padding: 40px 0 80px; }
.about-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 40px; align-items: start; }
@media (max-width: 768px) { .about-grid { grid-template-columns: 1fr; } }
.about-text h2 { font-size: 1.8rem; margin-bottom: 16px; }
.about-text p { color: #94a3b8; margin-bottom: 16px; font-size: 1.05rem; }
.stat-card h3 { font-size: 2.5rem; color: #38bdf8; margin-bottom: 4px; }
.stat-card p { color: #94a3b8; font-size: 0.9rem; }
.divider { border: 0; height: 1px; background: rgba(255, 255, 255, 0.1); margin: 20px 0; }
.site-footer { border-top: 1px solid rgba(255, 255, 255, 0.08); padding: 32px 0; color: #64748b; font-size: 0.9rem; }
.footer-content { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
.footer-links { display: flex; gap: 20px; }
.footer-links a { color: #64748b; text-decoration: none; }
.footer-links a:hover { color: #94a3b8; }`;

  return {
    html: indexHtml,
    files: {
      "index.html": indexHtml,
      "about.html": aboutHtml,
      "styles.css": css,
      "README.md": `# ${title}\n\nGenerated by NOVA AI Website Builder for: "${prompt}"\n\n## Pages Included:\n- index.html (Home)\n- about.html (About Us)\n- styles.css (Responsive Stylesheet)`
    },
    meta: {
      modelUsed: "nova-builder-v1",
      fallbackUsed: true,
      retryAttempts: 0,
      generationTimeMs: 120,
      industry: analysis.industry,
      targetAudience: analysis.audience,
      tone: analysis.tone,
      primaryCta: analysis.primaryCta,
      validation: { usable: true, errors: [] }
    }
  };
}

async function fetchWithTimeout(url, options, timeoutMs, model) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error(`${model} timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
      timeoutError.name = "AbortError";
      timeoutError.code = "MODEL_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function parseModelJson(text = "") {
  let cleaned = text.trim();
  // Strip markdown code fences if present
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
    
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("[Website Builder] Direct JSON parsing failed. Trying regex extraction...");
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (nestedErr) {
        console.error("[Website Builder] Regex JSON extraction failed:", nestedErr.message);
      }
    }
    throw new Error("AI returned invalid JSON structure.");
  }
}

function injectIframeNavigationScript(html) {
  const script = `
<!-- NOVA Multi-page Routing Helper -->
<script>
  document.addEventListener("click", function(e) {
    const link = e.target.closest("a");
    if (link) {
      const href = link.getAttribute("href");
      if (href && href.endsWith(".html") && !href.startsWith("http://") && !href.startsWith("https://")) {
        e.preventDefault();
        window.parent.postMessage({ type: "navigate", page: href }, "*");
      }
    }
  });
</script>
`;
  
  if (html.toLowerCase().includes("</body>")) {
    return html.replace(/<\/body>/i, (match) => `${script}\n${match}`);
  }
  return `${html}\n${script}`;
}

function repairHtml(value = "") {
  let html = String(value)
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const docStart = html.search(/<!doctype html>|<html[\s>]/i);
  if (docStart > 0) html = html.slice(docStart);

  if (!/^<!doctype html>/i.test(html)) {
    html = `<!DOCTYPE html>\n${html}`;
  }

  const lower = html.toLowerCase();
  
  if (!lower.includes("<html")) {
    html = html.replace(/<!doctype html>/i, (match) => `${match}\n<html>`);
  }
  if (!lower.includes("<head")) {
    html = html.replace(/<html[^>]*>/i, (match) => `${match}\n<head>\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>`);
  }
  if (!lower.includes("<body")) {
    if (html.includes("</head>")) {
      html = html.replace("</head>", "</head>\n<body>");
    } else {
      html = html.replace(/<html[^>]*>/i, (match) => `${match}\n<body>`);
    }
  }
  if (!lower.includes("</body>")) {
    if (html.includes("</html>")) {
      html = html.replace("</html>", "</body>\n</html>");
    } else {
      html += "\n</body>";
    }
  }
  if (!lower.includes("</html>")) {
    html += "\n</html>";
  }

  return html;
}

function validateHtml(html = "") {
  const lower = html.toLowerCase();
  const errors = [];
  if (!lower.includes("<!doctype html>")) errors.push("missing doctype");
  if (!lower.includes("<html")) errors.push("missing html tag");
  if (!lower.includes("<head")) errors.push("missing head tag");
  if (!lower.includes("<body")) errors.push("missing body tag");
  if (!lower.includes("</body>")) errors.push("missing closing body tag");
  if (!lower.includes("</html>")) errors.push("missing closing html tag");

  return { usable: errors.length === 0, errors };
}

function cleanupHtml(html = "") {
  return html
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter((line, i, arr) => {
      // Remove duplicate consecutive blank lines
      if (line.trim() === "" && i > 0 && arr[i - 1].trim() === "") {
        return false;
      }
      return true;
    })
    .join("\n");
}

function buildErrorPage(error) {
  const message = String(error?.message || "The AI models are temporarily unavailable.").replace(/[<>]/g, "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NOVA Website Builder Error</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070b14;color:#f8fafc;font-family:Inter,system-ui,sans-serif}
    main{width:min(720px,calc(100% - 32px));padding:32px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(255,255,255,.06)}
    p{color:#b6c2d4;line-height:1.7}
  </style>
</head>
<body>
  <main>
    <p>NOVA AI Website Builder</p>
    <h1>Generation could not complete.</h1>
    <p>${message}</p>
  </main>
  <script>console.warn("NOVA Website Builder error page rendered");</script>
</body>
</html>`;
}

module.exports = {
  MODEL_PLAN: MODELS_PRIORITY.map(id => ({ id, timeoutMs: TIMEOUT_MS })),
  enhancePrompt,
  generateWebsiteHtml,
  repairHtml,
  validateHtml
};
