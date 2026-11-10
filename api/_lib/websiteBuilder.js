const { buildIndustryProject } = require("./industryTemplates");
const { resolveUniversalProfile, getPollinationsImgUrl } = require("./universalWebsiteEngine");

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash"
];

const MODELS_PRIORITY = [
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "meta-llama/llama-3.3-70b-instruct:free"
];

const GEMINI_TIMEOUT_MS = 45000;     // 45s per Gemini attempt (fits safely inside vercel.json maxDuration: 300)
const OPENROUTER_TIMEOUT_MS = 35000; // 35s per OpenRouter coder model
const TOTAL_AI_WINDOW_MS = 95000;    // 95s total AI generation window before dynamic fallback

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
      "MANDATORY IMAGES: Use dynamic Pollinations AI photography URLs shaped like https://image.pollinations.ai/prompt/<descriptive-english-scene-keywords>?width=1200&height=750&seed=<number>&nologo=true (e.g. 'luxury showroom red sports car dramatic lighting'). Do NOT invent images.unsplash.com/photo-... URLs.",
      "MANDATORY INTERACTIVITY: Every button, filter tab, mobile menu toggle, and form must work smoothly in pure JS and show styled feedback/toasts.",
      "Create a complete, responsive 4-page website project (index.html, about.html, services.html, contact.html)."
    ].join("\n")
  };
}

function buildSystemPrompt() {
  return `You are NOVA AI Website Builder: an elite senior UI/UX designer and full-stack frontend engineer.
Your job is to generate a complete, modern, responsive multi-page website tailored strictly to ANY topic or industry the user requests.

Output Format:
Return ONLY a valid JSON object (no markdown fences) matching this exact structure:
{
  "meta": {
    "name": "Brand Name",
    "websiteType": "Exact Website Category (e.g., Fitness Club, Car Dealership, Gaming Store, Space Museum)",
    "theme": "Palette / Style Description"
  },
  "files": {
    "index.html": "<!DOCTYPE html>...",
    "about.html": "<!DOCTYPE html>...",
    "services.html": "<!DOCTYPE html>...",
    "contact.html": "<!DOCTYPE html>..."
  }
}

Strict Requirements:
- Adapt 100% of copy, navigation links, sections, colors, and layouts to the EXACT domain in the user prompt.
- Each HTML page must be self-contained with complete embedded <style> and <script> (plus Google Fonts if helpful), and linked via relative hrefs (index.html, about.html, services.html, contact.html).
- Use https://image.pollinations.ai/prompt/<detailed-scene-description>?width=1200&height=750&seed=<unique-integer>&nologo=true for ALL hero, card, and gallery images so every image loads reliably without 404s.
- Make every button, category filter, mobile hamburger menu, and contact/booking form genuinely interactive (forms must handle onsubmit without page reload and display a confirmation toast).
- Ensure crisp typography contrast and full responsiveness across desktop, tablet, and mobile.
- Return ONLY raw valid JSON (no \`\`\`json wrappers, no extra commentary).`;
}

function buildGenerationPrompt(analysis, existingHtml = "", editPrompt = "") {
  if (existingHtml && editPrompt) {
    const slicedHtml = String(existingHtml).slice(0, 45000);
    return `Edit mode.
Existing HTML context:
${slicedHtml}

User edit request:
${editPrompt}

Modify only the requested sections/styles while preserving the site structure and branding.
Return the updated project in the standard JSON format.`;
  }

  return `User prompt:
${analysis.originalPrompt}

Creative Brief:
${analysis.brief}

Generate a complete, authentic multi-page website built exclusively for "${analysis.originalPrompt}". Return only raw JSON.`;
}

function ensureValidWebsiteImages(html = "", topicPrompt = "", pageSeedBase = 100) {
  let imgCounter = 0;
  return String(html || "").replace(
    /(<img\b[^>]*\bsrc\s*=\s*["'])([^"']*)(["'][^>]*>)/gi,
    (full, prefix, srcVal, suffix) => {
      imgCounter += 1;
      const trimmed = String(srcVal || "").trim();
      const needsReplacement =
        !trimmed ||
        trimmed.startsWith("/") ||
        trimmed.startsWith("./") ||
        trimmed.includes("placeholder") ||
        trimmed.includes("example.com") ||
        trimmed.includes("via.placeholder") ||
        trimmed.includes("images.unsplash.com/photo-");

      const finalSrc = needsReplacement
        ? getPollinationsImgUrl(topicPrompt, `editorial scene view ${imgCounter}`, pageSeedBase + imgCounter, 1200, 750)
        : trimmed;

      const hasOnError = /\bonerror\s*=/i.test(prefix + suffix);
      const fallbackUrl = getPollinationsImgUrl(topicPrompt, `studio photography`, pageSeedBase + 90 + imgCounter, 1200, 750);
      const patchedSuffix = hasOnError
        ? suffix
        : suffix.replace(/>$/, ` onerror="this.onerror=null;this.src='${fallbackUrl}';">`);

      return `${prefix}${finalSrc}${patchedSuffix}`;
    }
  );
}

function finalizeGeneratedProject({ rawContent, modelId, duration, fallbackUsed, analysis, logger, tokenUsage = null }) {
  let parsedData = null;
  let files = {};
  let parsedMeta = {};

  try {
    parsedData = parseModelJson(rawContent);
    if (parsedData && parsedData.files && typeof parsedData.files === "object") {
      files = parsedData.files;
      if (parsedData.meta && typeof parsedData.meta === "object") {
        parsedMeta = parsedData.meta;
      }
    } else {
      throw new Error("Parsed JSON did not contain 'files' object.");
    }
  } catch {
    const repairedSingleHtml = repairHtml(rawContent);
    files = { "index.html": repairedSingleHtml };
  }

  const validatedFiles = {};
  let pageIdx = 0;
  for (const [name, content] of Object.entries(files)) {
    pageIdx += 1;
    if (name.endsWith(".html")) {
      const validation = validateHtml(content);
      const repaired = validation.usable ? content : repairHtml(content);
      const enrichedImages = ensureValidWebsiteImages(repaired, analysis.originalPrompt, pageIdx * 50);
      validatedFiles[name] = cleanupHtml(injectIframeNavigationScript(enrichedImages));
    } else {
      validatedFiles[name] = unescapeJsonString(content);
    }
  }

  // Embed styles.css into all HTML pages so multi-page iframe switching renders with full styling
  if (validatedFiles["styles.css"]) {
    const cssBlock = `<style>\n${validatedFiles["styles.css"]}\n</style>`;
    for (const key of Object.keys(validatedFiles)) {
      if (key.endsWith(".html") && !validatedFiles[key].includes(validatedFiles["styles.css"])) {
        if (validatedFiles[key].includes("</head>")) {
          validatedFiles[key] = validatedFiles[key].replace("</head>", `${cssBlock}\n</head>`);
        } else {
          validatedFiles[key] = `${cssBlock}\n${validatedFiles[key]}`;
        }
      }
    }
  }

  if (!validatedFiles["index.html"]) {
    const firstHtmlKey = Object.keys(validatedFiles).find((k) => k.endsWith(".html"));
    validatedFiles["index.html"] = firstHtmlKey
      ? validatedFiles[firstHtmlKey]
      : repairHtml(rawContent);
  }

  const resolvedWebsiteType = parsedMeta.websiteType || analysis.websiteType || analysis.industry || "Custom Website";
  const resolvedName = parsedMeta.name || analysis.brand || "NOVA Custom Site";

  if (!validatedFiles["README.md"]) {
    validatedFiles["README.md"] = `# ${resolvedName}\n\nCategory: ${resolvedWebsiteType}\nGenerated by NOVA AI Website Studio.\n`;
  }

  logger.log("model_success", {
    model: modelId,
    durationMs: duration,
    tokenUsage,
    pages: Object.keys(validatedFiles)
  });

  return {
    html: validatedFiles["index.html"],
    files: validatedFiles,
    meta: {
      name: resolvedName,
      websiteType: resolvedWebsiteType,
      theme: parsedMeta.theme || "Bespoke AI Design",
      modelUsed: modelId,
      fallbackUsed,
      retryAttempts: 0,
      generationTimeMs: duration,
      industry: resolvedWebsiteType,
      targetAudience: analysis.audience,
      tone: analysis.tone,
      primaryCta: analysis.primaryCta,
      validation: { usable: true, errors: [] }
    },
    logs: logger.summary({ selectedModel: modelId, tokenUsage })
  };
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

  // ── Primary: Google Gemini chain (45s timeout per model) ─────────────
  if (googleApiKey) {
    for (const geminiModel of GEMINI_MODELS) {
      if (Date.now() - overallStart > TOTAL_AI_WINDOW_MS) break;
      try {
        console.log(`[Website Builder] Generating "${analysis.originalPrompt.slice(0, 45)}..." with ${geminiModel}...`);
        const geminiStart = Date.now();
        const response = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${googleApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }]
              },
              contents: [
                {
                  parts: [{ text: userPrompt }]
                }
              ],
              generationConfig: {
                responseMimeType: "application/json",
                maxOutputTokens: 16384,
                temperature: editPrompt ? 0.35 : 0.75
              }
            })
          },
          GEMINI_TIMEOUT_MS,
          geminiModel
        );

        if (response.ok) {
          const data = await response.json();
          const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (rawContent.trim()) {
            finalResult = finalizeGeneratedProject({
              rawContent,
              modelId: geminiModel,
              duration: Date.now() - geminiStart,
              fallbackUsed: geminiModel !== GEMINI_MODELS[0],
              analysis,
              logger
            });
            break;
          }
        } else {
          const errText = await response.text();
          console.warn(`[Website Builder] ${geminiModel} returned HTTP ${response.status}: ${errText.slice(0, 180)}`);
        }
      } catch (gErr) {
        console.warn(`[Website Builder] ${geminiModel} attempt failed:`, gErr.message);
        logger.log("model_error", { model: geminiModel, message: gErr.message });
      }
    }
  }

  // ── Secondary: OpenRouter Free Coder Chain ───────────────────────────
  if (!finalResult && apiKey) {
    for (const modelId of MODELS_PRIORITY) {
      if (Date.now() - overallStart > TOTAL_AI_WINDOW_MS) {
        console.warn("[Website Builder] Approaching AI timeout window, switching to dynamic universal builder.");
        break;
      }

      try {
        const modelStart = Date.now();
        const maxTokens = 8192;

        console.log(`[Website Builder] Attempting OpenRouter model: ${modelId}`);
        logger.log("model_start", { model: modelId, maxTokens });

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
              temperature: editPrompt ? 0.30 : 0.75,
              max_tokens: maxTokens
            })
          },
          Math.min(OPENROUTER_TIMEOUT_MS, Math.max(8000, TOTAL_AI_WINDOW_MS - (Date.now() - overallStart))),
          modelId
        );

        const duration = Date.now() - modelStart;
        const text = await response.text();

        if (!response.ok) {
          throw new Error(`OpenRouter ${modelId} failed (${response.status}): ${text.slice(0, 200)}`);
        }

        const parsedJson = JSON.parse(text);
        const rawContent = parsedJson?.choices?.[0]?.message?.content || "";
        const tokenUsage = parsedJson.usage || null;
        if (!rawContent.trim()) {
          throw new Error(`OpenRouter ${modelId} returned empty content.`);
        }

        finalResult = finalizeGeneratedProject({
          rawContent,
          modelId,
          duration,
          fallbackUsed: true,
          analysis,
          logger,
          tokenUsage
        });
        break;
      } catch (err) {
        console.error("[Website Builder] OpenRouter attempt failed:", err.message);
        logger.log("model_error", { model: modelId, message: err.message });
      }
    }
  }

  if (finalResult) {
    return finalResult;
  }

  // ── Universal Dynamic Fallback (handles ANY website topic seamlessly) ─
  console.log(`[Website Builder] Running universal dynamic engine for prompt: "${analysis.originalPrompt.slice(0, 50)}"`);
  const localProject = buildIndustryProject(editPrompt || prompt, analysis);
  return {
    ...localProject,
    logs: logger.summary({ selectedModel: localProject.meta?.modelUsed || "nova-universal-engine" })
  };
}

function buildLocalWebsiteProject(analysis, prompt, existingHtml = "") {
  return buildIndustryProject(prompt, analysis);
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
