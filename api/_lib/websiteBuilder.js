const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const MODEL_PLAN = [
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", retries: 2 },
  { id: "google/gemini-2.5-flash", retries: 1 },
  { id: "deepseek/deepseek-r1", retries: 1 },
  { id: "qwen/qwen-2.5-coder", retries: 1 }
];

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
      "Create one complete production index.html with embedded CSS and JavaScript."
    ].join("\n")
  };
}

function buildSystemPrompt() {
  return `You are NOVA AI Website Builder, a principal UI/UX designer and senior frontend engineer.
You create handcrafted, production-ready websites from a blank canvas.
You are not a template engine. Never reuse a generic layout.
Output exactly one complete HTML document. No markdown. No code fences. No JSON.
The HTML must embed all CSS in <style> and all JavaScript in <script>.
Do not link style.css, script.js, Bootstrap, Tailwind, jQuery, or external frameworks.
Use semantic HTML5, accessibility, SEO tags, responsive CSS, CSS variables, light JavaScript, polished animations, and meaningful interactions.
Do not display the user's prompt as website content. Interpret it and build the real website.`;
}

function buildGenerationPrompt(analysis, existingHtml = "", editPrompt = "") {
  if (existingHtml && editPrompt) {
    return `Edit mode.
Existing HTML:
${existingHtml.slice(0, 55000)}

User edit request:
${editPrompt}

Modify only the parts required by the edit request while preserving everything else that is good.
Return the full updated index.html only.`;
  }

  return `User prompt:
${analysis.originalPrompt}

Internal enhanced brief:
${analysis.brief}

Industry identity guidance:
- Restaurant: luxury dining, menu, chef story, reservation, rich food/interior imagery.
- Cafe: warm cozy textures, menu highlights, community, visit CTA.
- Hospital/Healthcare: clean, trustworthy, doctors, departments, appointment CTA.
- Portfolio/Photography: image-first, creative work, case studies, personality.
- AI SaaS/Startup/Technology: premium product narrative, dashboard-like visuals, features, pricing/demo CTA.
- Real Estate/Hotel/Travel: immersive imagery, destination/property details, inquiry CTA.
- Gym: powerful energy, programs, trainers, membership CTA.
- School/College/Education: learning outcomes, courses, instructors, enrollment CTA.

Requirements:
- Generate ONE FILE: index.html.
- Embed CSS and JavaScript.
- Include SEO meta tags, Open Graph tags, accessible navigation, responsive layout, scroll reveal or tasteful animations, hover states, and a real footer.
- Images must be relevant and reliable. Use images.unsplash.com photo URLs if used, with alt text and loading="lazy" except primary hero image.
- Every design decision must match the prompt.`;
}

async function generateWebsiteHtml({ prompt, existingHtml = "", editPrompt = "" }) {
  const logger = createLogger();
  const analysis = enhancePrompt(editPrompt || prompt);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildGenerationPrompt(analysis, existingHtml, editPrompt);
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    const error = new Error("Missing OPENROUTER_API_KEY environment variable.");
    error.statusCode = 500;
    throw error;
  }

  let lastError = null;

  for (const model of MODEL_PLAN) {
    for (let attempt = 1; attempt <= model.retries; attempt += 1) {
      const started = Date.now();
      logger.log("model_attempt", { model: model.id, attempt });
      try {
        const result = await callOpenRouter({
          apiKey,
          model: model.id,
          systemPrompt,
          userPrompt,
          maxTokens: 14000,
          temperature: editPrompt ? 0.45 : 0.88
        });
        const repaired = repairHtml(result.html);
        const validation = validateHtml(repaired, analysis.originalPrompt);
        logger.log("model_response", {
          model: model.id,
          attempt,
          responseMs: Date.now() - started,
          usage: result.usage || null,
          validation
        });

        if (validation.usable) {
          return {
            html: repaired,
            meta: {
              modelUsed: model.id,
              fallbackUsed: model.id !== MODEL_PLAN[0].id,
              retryAttempts: logger.entries.filter((entry) => entry.event === "model_attempt").length - 1,
              generationTimeMs: Date.now() - started,
              industry: analysis.industry,
              targetAudience: analysis.audience,
              tone: analysis.tone,
              primaryCta: analysis.primaryCta,
              validation
            },
            logs: logger.summary({ selectedModel: model.id, tokenUsage: result.usage || null })
          };
        }

        lastError = new Error(`Validation failed: ${validation.errors.join(", ")}`);
        logger.log("validation_failed", { model: model.id, attempt, errors: validation.errors });
      } catch (error) {
        lastError = error;
        logger.log("model_error", { model: model.id, attempt, message: error.message, responseMs: Date.now() - started });
      }
    }
  }

  logger.log("all_models_failed", { message: lastError?.message || "unknown" });
  return {
    html: buildErrorPage(lastError),
    meta: {
      modelUsed: "none",
      fallbackUsed: true,
      retryAttempts: logger.entries.filter((entry) => entry.event === "model_attempt").length,
      generationTimeMs: logger.summary().totalMs,
      industry: analysis.industry,
      validation: { usable: true, errors: ["All AI models failed. Error page returned."] }
    },
    logs: logger.summary({ selectedModel: "none" })
  };
}

async function callOpenRouter({ apiKey, model, systemPrompt, userPrompt, maxTokens, temperature }) {
  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://nova-ai-rohann.vercel.app",
      "X-Title": "NOVA AI Website Builder"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature,
      max_tokens: maxTokens
    })
  });

  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`OpenRouter ${model} failed (${response.status}): ${text.slice(0, 300)}`);
    error.statusCode = response.status;
    throw error;
  }

  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`OpenRouter ${model} returned invalid JSON.`);
  }

  const html = data?.choices?.[0]?.message?.content || "";
  if (!html.trim()) throw new Error(`OpenRouter ${model} returned empty content.`);
  return { html, usage: data.usage || null };
}

function repairHtml(value = "") {
  let html = String(value)
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const docStart = html.search(/<!doctype html>|<html[\s>]/i);
  if (docStart > 0) html = html.slice(docStart);
  if (!/^<!doctype html>/i.test(html)) html = `<!DOCTYPE html>\n${html}`;
  if (!/<meta name=["']viewport["']/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (match) => `${match}\n<meta name="viewport" content="width=device-width, initial-scale=1.0">`);
  }
  if (!/<style[\s>]/i.test(html)) {
    html = html.replace(/<\/head>/i, "<style>body{margin:0;font-family:system-ui,sans-serif}</style>\n</head>");
  }
  if (!/<script[\s>]/i.test(html)) {
    html = html.replace(/<\/body>/i, "<script>document.documentElement.classList.add('js-ready');</script>\n</body>");
  }
  if (!/<\/html>/i.test(html)) html += "\n</html>";
  return html;
}

function validateHtml(html = "", originalPrompt = "") {
  const errors = [];
  if (!/<!doctype html>/i.test(html)) errors.push("missing doctype");
  if (!/<html[\s>]/i.test(html) || !/<\/html>/i.test(html)) errors.push("missing html root");
  if (!/<head[\s>]/i.test(html) || !/<body[\s>]/i.test(html)) errors.push("missing head/body");
  if (!/<style[\s>]/i.test(html)) errors.push("missing embedded css");
  if (!/<script[\s>]/i.test(html)) errors.push("missing embedded javascript");
  if (/stylesheet[^>]+style\.css|src=["']script\.js/i.test(html)) errors.push("external css/js file reference");
  if (/```/.test(html)) errors.push("markdown fence present");

  const promptWords = String(originalPrompt).toLowerCase().split(/\s+/).filter((word) => word.length > 7).slice(0, 12);
  const lowerHtml = html.toLowerCase();
  if (promptWords.length >= 4 && promptWords.filter((word) => lowerHtml.includes(word)).length > 9) {
    errors.push("possible prompt echo");
  }

  return { usable: errors.length === 0, errors };
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
  MODEL_PLAN,
  enhancePrompt,
  generateWebsiteHtml,
  repairHtml,
  validateHtml
};
