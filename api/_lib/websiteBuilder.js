const { buildIndustryProject } = require("./industryTemplates");
const { compileBlueprintToWebsiteProject, resolveUniversalProfile } = require("./universalWebsiteEngine");
const { resolveWebsitePhotos } = require("./stockPhotos");

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash"
];

const MODELS_PRIORITY = [
  "google/gemma-4-26b-a4b-it:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free"
];

const GEMINI_TIMEOUT_MS = 10000;     // 10s max (thinkingBudget: 0 returns Blueprint JSON in ~2-4s)
const OPENROUTER_TIMEOUT_MS = 8000;  // 8s max per OpenRouter fallback model
const TOTAL_AI_WINDOW_MS = 16000;    // 16s strict ceiling (guarantees zero Vercel ERR_CONNECTION_RESET)

const INDUSTRY_HINTS = [
  "restaurant", "cafe", "hotel", "hospital", "school", "portfolio", "agency",
  "startup", "saas", "travel", "architecture", "law", "photography",
  "real estate", "fashion", "gym", "fitness", "automotive", "car dealership",
  "finance", "technology", "gaming", "esports", "music", "pet", "bakery",
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
  const matchedHint = INDUSTRY_HINTS.find((item) => new RegExp(`\\b${item}\\b`, "i").test(lower));
  const profile = resolveUniversalProfile(prompt);
  const industry = matchedHint || profile.websiteType || "Custom Website";
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
    brand: profile.brand,
    websiteType: profile.websiteType,
    audience,
    tone,
    primaryCta: cta,
    brief: [
      `Target Website Topic / Industry: ${profile.websiteType}`,
      `Suggested Brand Name (unless user specified one): ${profile.brand}`,
      `Audience: ${audience}`,
      `Tone: ${tone}`,
      `Primary CTA: ${cta}`,
      "Design specifically for THIS EXACT USER PROMPT from an empty canvas — NEVER substitute an unrelated template.",
      "Choose a tailored visual aesthetic, color palette, typography, and layout that naturally fit the topic.",
      "MANDATORY IMAGES: Describe crisp photographic scenes in heroImageKeywords, aboutImageKeywords, and item imageKeywords so NOVA binds real stock photography automatically (never use Pollinations or broken image URLs).",
      "MANDATORY INTERACTIVITY: Every button, filter tab, mobile menu toggle, and form must work smoothly in pure JS and show styled feedback/toasts.",
      "Create a complete, responsive 4-page website project (index.html, about.html, services.html, contact.html)."
    ].join("\n")
  };
}

function buildSystemPrompt() {
  return `You are NOVA AI Website Architect: an elite senior brand strategist & UI/UX designer.
Design a complete custom Website Blueprint JSON tailored strictly to ANY topic, brand, or industry the user requests.

Output ONLY raw valid JSON (no markdown fences) with this compact structure:
{
  "brand": "Original Creative Brand Name matching the user prompt",
  "websiteType": "Clear Industry Category (e.g. Bike Showroom, Coffee Bakery, Gaming Store, Law Firm)",
  "tagline": "Concise 5-8 word positioning tagline",
  "heroHeadline": "Punchy memorable hero H1 headline (5-9 words)",
  "heroSubheadline": "Engaging 15-25 word supporting value proposition",
  "ctaPrimary": "Primary Action Button (2-3 words, e.g. Explore Bikes)",
  "ctaSecondary": "Secondary Action Button (2-3 words, e.g. Book Test Ride)",
  "navServicesLabel": "1-word Menu label for offerings (e.g. Lineup, Menu, Courses, Catalog)",
  "itemsHeading": "Section Heading for offerings (3-5 words)",
  "aboutTitle": "Inspiring About Page H1 headline",
  "aboutStory": "2-sentence authentic brand story tailored to the topic",
  "heroImageKeywords": "vivid English visual scene keywords for hero photo (NO URL)",
  "aboutImageKeywords": "vivid English visual scene keywords for about page photo (NO URL)",
  "theme": {
    "mode": "dark or light",
    "bg": "hex background (e.g. #090b10 for dark or #f8fafc for light)",
    "surface": "hex card surface (e.g. #121622 or #ffffff)",
    "text": "hex primary text (#f8fafc on dark or #0f172a on light)",
    "muted": "hex secondary text (#94a3b8 on dark or #475569 on light)",
    "accent": "vivid primary accent hex matching the niche mood",
    "accent2": "complementary gradient accent hex"
  },
  "stats": [
    { "value": "metric 1", "label": "short label" },
    { "value": "metric 2", "label": "short label" },
    { "value": "metric 3", "label": "short label" }
  ],
  "items": [
    {
      "tag": "Category Tag",
      "title": "Offering / Product Name",
      "price": "Realistic Price or Tier",
      "description": "Compelling 12-18 word description",
      "imageKeywords": "vivid English visual photo keywords for this specific item"
    }
  ],
  "faq": [
    { "q": "Realistic customer question 1?", "a": "Helpful concise answer." },
    { "q": "Realistic customer question 2?", "a": "Helpful concise answer." }
  ]
}

Rules:
- Provide 3 to 4 distinct, authentic items matching the EXACT niche.
- Pick a cohesive color theme naturally fitting the topic (high readability contrast between bg/surface and text).
- Keep all strings clean and descriptive. Do NOT output HTML tags — NOVA compiles your blueprint into 4 responsive pages cleanly.`;
}

function buildGenerationPrompt(analysis, existingHtml = "", editPrompt = "") {
  if (existingHtml && editPrompt) {
    const snippetTitle = (String(existingHtml).match(/<title>([^<]+)<\/title>/i)?.[1] || "").trim();
    const snippetHero = (String(existingHtml).match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] || "").trim();
    return `Edit existing website blueprint.
Current site context: Title="${snippetTitle}", Hero="${snippetHero}", Topic="${analysis.originalPrompt}".
Requested change: "${editPrompt}"

Generate an updated complete Website Blueprint JSON incorporating "${editPrompt}" (update theme colors, copy, items, or brand as requested). Return only raw JSON.`;
  }

  return `Create a complete bespoke Website Blueprint JSON exclusively for: "${analysis.originalPrompt}". Return only raw JSON.`;
}

async function finalizeGeneratedProject({ rawContent, modelId, duration, fallbackUsed, analysis, logger, tokenUsage = null, photoTimeoutMs = 2200 }) {
  let parsedData = null;
  try {
    parsedData = parseModelJson(rawContent);
  } catch (err) {
    console.warn("[Website Builder] JSON blueprint parse error, enriching via local universal profile:", err.message);
  }

  if (parsedData && typeof parsedData === "object" && (parsedData.brand || parsedData.heroHeadline || Array.isArray(parsedData.items))) {
    const resolvedPhotos = await resolveWebsitePhotos({
      prompt: analysis.originalPrompt,
      blueprint: parsedData,
      timeoutMs: Math.max(800, Math.min(2200, Number(photoTimeoutMs) || 2200))
    });

    const compiled = compileBlueprintToWebsiteProject(parsedData, analysis.originalPrompt, {
      modelUsed: modelId,
      generationTimeMs: duration,
      fallbackUsed,
      resolvedPhotos
    });

    logger.log("blueprint_compiled", {
      model: modelId,
      durationMs: duration,
      tokenUsage,
      websiteType: compiled.meta.websiteType,
      brand: compiled.meta.name,
      photoSource: resolvedPhotos.source
    });

    return {
      ...compiled,
      logs: logger.summary({ selectedModel: modelId, tokenUsage })
    };
  }

  // Fallback if model ignored schema and returned HTML files object
  if (parsedData && parsedData.files && typeof parsedData.files === "object") {
    const resolvedPhotos = await resolveWebsitePhotos({
      prompt: analysis.originalPrompt,
      blueprint: parsedData,
      timeoutMs: Math.max(800, Math.min(2200, Number(photoTimeoutMs) || 2200))
    });
    const fallbackPool = [
      resolvedPhotos.heroImg,
      resolvedPhotos.aboutImg,
      ...(resolvedPhotos.cardImgs || [])
    ].filter(Boolean);
    let imgSwapIdx = 0;

    const validatedFiles = {};
    for (const [name, content] of Object.entries(parsedData.files)) {
      if (name.endsWith(".html")) {
        let repaired = validateHtml(content).usable ? content : repairHtml(content);
        repaired = repaired.replace(/https?:\/\/image\.pollinations\.ai\/[^"'\s)]+/gi, () => {
          const replacement = fallbackPool[imgSwapIdx % fallbackPool.length] || resolvedPhotos.heroImg;
          imgSwapIdx += 1;
          return replacement;
        });
        validatedFiles[name] = cleanupHtml(injectIframeNavigationScript(repaired));
      } else {
        validatedFiles[name] = unescapeJsonString(content);
      }
    }
    return {
      html: validatedFiles["index.html"] || Object.values(validatedFiles)[0] || "",
      files: validatedFiles,
      meta: {
        name: analysis.brand,
        websiteType: analysis.websiteType,
        modelUsed: modelId,
        fallbackUsed,
        generationTimeMs: duration,
        validation: { usable: true, errors: [] }
      },
      logs: logger.summary({ selectedModel: modelId, tokenUsage })
    };
  }

  throw new Error("Model output did not contain a valid blueprint.");
}

async function generateWebsiteHtml({ prompt, existingHtml = "", editPrompt = "" }) {
  const logger = createLogger();
  const analysis = enhancePrompt(editPrompt || prompt);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildGenerationPrompt(analysis, existingHtml, editPrompt);
  const apiKey = process.env.OPENROUTER_API_KEY;
  const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  const overallStart = Date.now();

  let finalResult = null;

  // ── Primary: Google Gemini AI Blueprint Architect (~2-5s with thinkingBudget: 0) ──
  if (googleApiKey) {
    for (const geminiModel of GEMINI_MODELS) {
      const remainingMs = TOTAL_AI_WINDOW_MS - (Date.now() - overallStart);
      if (remainingMs < 3500) break;

      const attemptTimeout = Math.min(GEMINI_TIMEOUT_MS, remainingMs);
      const generationConfig = {
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
        temperature: editPrompt ? 0.35 : 0.75
      };

      if (geminiModel.includes("2.5")) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      try {
        console.log(`[Website Architect] Designing "${analysis.originalPrompt.slice(0, 45)}..." with ${geminiModel} (cap ${attemptTimeout}ms)...`);
        const geminiStart = Date.now();
        const res = await fetchTextWithTotalTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${googleApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ parts: [{ text: userPrompt }] }],
              generationConfig
            })
          },
          attemptTimeout,
          geminiModel
        );

        if (res.ok && res.text.trim()) {
          const data = JSON.parse(res.text);
          const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (rawContent.trim()) {
            const photoBudget = Math.max(800, TOTAL_AI_WINDOW_MS - (Date.now() - overallStart));
            finalResult = await finalizeGeneratedProject({
              rawContent,
              modelId: geminiModel,
              duration: Date.now() - geminiStart,
              fallbackUsed: geminiModel !== GEMINI_MODELS[0],
              analysis,
              logger,
              photoTimeoutMs: photoBudget
            });
            break;
          }
        } else {
          console.warn(`[Website Architect] ${geminiModel} HTTP ${res.status}: ${res.text.slice(0, 160)}`);
        }
      } catch (gErr) {
        console.warn(`[Website Architect] ${geminiModel} failed:`, gErr.message);
        logger.log("model_error", { model: geminiModel, message: gErr.message });
      }
    }
  }

  // ── Secondary: OpenRouter Free Models Blueprint Fallback ─────────────
  if (!finalResult && apiKey) {
    for (const modelId of MODELS_PRIORITY) {
      const remainingMs = TOTAL_AI_WINDOW_MS - (Date.now() - overallStart);
      if (remainingMs < 3500) {
        console.warn("[Website Architect] Reached total AI ceiling, switching immediately to Universal Compiler.");
        break;
      }

      try {
        const modelStart = Date.now();
        const attemptTimeout = Math.min(OPENROUTER_TIMEOUT_MS, remainingMs);

        console.log(`[Website Architect] Trying OpenRouter: ${modelId} (cap ${attemptTimeout}ms)`);
        logger.log("model_start", { model: modelId });

        const res = await fetchTextWithTotalTimeout(
          OPENROUTER_ENDPOINT,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://nova-ai-rohann.vercel.app",
              "X-Title": "NOVA AI Website Architect"
            },
            body: JSON.stringify({
              model: modelId,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ],
              temperature: editPrompt ? 0.30 : 0.70,
              max_tokens: 2048
            })
          },
          attemptTimeout,
          modelId
        );

        const duration = Date.now() - modelStart;
        if (!res.ok) {
          throw new Error(`OpenRouter ${modelId} failed (${res.status}): ${res.text.slice(0, 180)}`);
        }

        const parsedJson = JSON.parse(res.text);
        const rawContent = parsedJson?.choices?.[0]?.message?.content || "";
        const tokenUsage = parsedJson.usage || null;
        if (!rawContent.trim()) {
          throw new Error(`OpenRouter ${modelId} returned empty content.`);
        }

        const photoBudget = Math.max(800, TOTAL_AI_WINDOW_MS - (Date.now() - overallStart));
        finalResult = await finalizeGeneratedProject({
          rawContent,
          modelId,
          duration,
          fallbackUsed: true,
          analysis,
          logger,
          tokenUsage,
          photoTimeoutMs: photoBudget
        });
        break;
      } catch (err) {
        console.error("[Website Architect] OpenRouter failed:", err.message);
        logger.log("model_error", { model: modelId, message: err.message });
      }
    }
  }

  if (finalResult) {
    return finalResult;
  }

  // ── Instant Universal Compiler Fallback (Guarantees <=16s HTTP 200) ──
  console.log(`[Website Architect] Instant Universal Fallback for prompt: "${analysis.originalPrompt.slice(0, 50)}"`);
  const fallbackQuery = editPrompt || prompt;
  let localProject = buildIndustryProject(fallbackQuery, analysis);
  if (String(localProject?.meta?.modelUsed || "").includes("universal")) {
    const fallbackProfile = resolveUniversalProfile(fallbackQuery);
    const resolvedPhotos = await resolveWebsitePhotos({
      prompt: fallbackQuery,
      blueprint: fallbackProfile,
      timeoutMs: 1800
    });
    localProject = compileBlueprintToWebsiteProject(fallbackProfile, fallbackQuery, {
      modelUsed: localProject.meta.modelUsed,
      generationTimeMs: Date.now() - overallStart,
      resolvedPhotos
    });
  }
  return {
    ...localProject,
    logs: logger.summary({ selectedModel: localProject.meta?.modelUsed || "nova-universal-architect" })
  };
}

function buildLocalWebsiteProject(analysis, prompt, existingHtml = "") {
  return buildIndustryProject(prompt, analysis);
}

// Guards BOTH waiting for HTTP headers AND reading the entire response body stream!
async function fetchTextWithTotalTimeout(url, options, timeoutMs, model) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error(`${model} timed out after ${Math.round(timeoutMs / 1000)}s.`);
      timeoutError.name = "AbortError";
      timeoutError.code = "MODEL_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function unescapeJsonString(str = "") {
  if (typeof str !== "string") return "";
  let unescaped = str;

  // If this string was sliced out of JSON or has escaped quotes / newlines
  if (unescaped.includes("\\n") || unescaped.includes('\\"') || unescaped.includes("\\/")) {
    try {
      if (unescaped.startsWith('"') && unescaped.endsWith('"')) {
        unescaped = JSON.parse(unescaped);
      } else {
        unescaped = unescaped
          .replace(/\\r\\n/g, "\n")
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\n")
          .replace(/\\t/g, "  ")
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\\//g, "/")
          .replace(/\\\\/g, "\\");
      }
    } catch {
      unescaped = unescaped
        .replace(/\\r\\n/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\n")
        .replace(/\\t/g, "  ")
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\//g, "/")
        .replace(/\\\\/g, "\\");
    }
  }

  return unescaped;
}

function parseModelJson(text = "") {
  let cleaned = String(text || "").trim();
  // Strip markdown code fences if present
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
    
  // 1. Direct JSON parse
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("[Website Builder] Direct JSON parse failed. Slicing outermost braces...");
    
    // 2. Outermost object extraction
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        const sliced = cleaned.slice(firstBrace, lastBrace + 1);
        return JSON.parse(sliced);
      } catch (nestedErr) {
        // Fall through to partial regex extraction
      }
    }

    // 3. Partial file recovery (in case token budget truncated before final closing brace)
    const recoveredFiles = {};
    const fileMatches = cleaned.matchAll(/"([^"]+\.(?:html|css|js|md))"\s*:\s*"((?:\\.|[^"\\])*)/g);
    for (const match of fileMatches) {
      const fileName = match[1];
      const rawContent = match[2];
      if (rawContent && rawContent.length > 40) {
        recoveredFiles[fileName] = unescapeJsonString(rawContent);
      }
    }

    if (Object.keys(recoveredFiles).length > 0) {
      console.log(`[Website Builder] Successfully recovered ${Object.keys(recoveredFiles).length} files from partial JSON!`);
      return { files: recoveredFiles };
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
  let html = unescapeJsonString(String(value || ""))
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  // Strip leading JSON property name if present (e.g., "index.html": "<!DOCTYPE html>...")
  html = html.replace(/^"?[a-zA-Z0-9_\-\.]+\.(?:html|css|js)"?\s*:\s*"?/i, "").trim();

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
  MODEL_PLAN: MODELS_PRIORITY.map(id => ({ id, timeoutMs: OPENROUTER_TIMEOUT_MS })),
  enhancePrompt,
  generateWebsiteHtml,
  repairHtml,
  validateHtml
};
