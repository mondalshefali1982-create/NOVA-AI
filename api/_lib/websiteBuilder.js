const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const TARGET_MODEL = "google/gemini-2.5-flash";
const TIMEOUT_MS = 25000;

const MODEL_PLAN = [
  { id: TARGET_MODEL, timeoutMs: TIMEOUT_MS }
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
  return `You are NOVA AI Website Builder: a senior UI/UX designer and frontend engineer.
Return ONLY one complete, valid production HTML document starting with <!DOCTYPE html> and ending with </html>.
Embed all necessary CSS in a <style> tag and interactive JavaScript in a <script> tag.
The design must be responsive, mobile-optimized, modern, accessible, and SEO-friendly.
You MUST NOT output markdown (no \`\`\`html or code blocks), no explanations, no notes, no comments, and no code fences.
Output only the raw code directly.`;
}

function buildGenerationPrompt(analysis, existingHtml = "", editPrompt = "") {
  if (existingHtml && editPrompt) {
    // Limit existing HTML context to 40000 characters maximum to reduce latency and tokens
    const slicedHtml = String(existingHtml).slice(0, 40000);
    return `Edit mode.
Existing HTML:
${slicedHtml}

User edit request:
${editPrompt}

Modify only the parts required by the edit request while preserving all other styles and layouts.
Return the full updated HTML code only.`;
  }

  return `User prompt:
${analysis.originalPrompt}

Brief:
${analysis.brief}

Requirements:
- Generate a complete, responsive index.html.
- Embed CSS and JS directly.
- Include proper SEO tags, Open Graph tags, readable layout, and interactive JS.
- Use images.unsplash.com URLs for reliable media if relevant.`;
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

  const modelId = TARGET_MODEL;
  const started = Date.now();
  console.log(`[Website Builder] Request start. Model: ${modelId} | Prompt Length: ${userPrompt.length + systemPrompt.length} chars`);
  logger.log("request_start", { model: modelId, promptLength: userPrompt.length });

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
          temperature: editPrompt ? 0.35 : 0.82,
          max_tokens: 6000
        })
      },
      TIMEOUT_MS,
      modelId
    );

    const duration = Date.now() - started;
    console.log(`[Website Builder] OpenRouter responded in ${duration}ms. Status: ${response.status}`);

    const text = await response.text();
    if (!response.ok) {
      const error = new Error(`OpenRouter ${modelId} failed (${response.status}): ${text.slice(0, 300)}`);
      error.statusCode = response.status;
      throw error;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`OpenRouter ${modelId} returned invalid JSON.`);
    }

    let html = data?.choices?.[0]?.message?.content || "";
    const tokenUsage = data.usage || null;
    console.log(`[Website Builder] Tokens used:`, tokenUsage);

    if (!html.trim()) {
      throw new Error(`OpenRouter ${modelId} returned empty content.`);
    }

    // Run HTML validation
    let validation = validateHtml(html);
    let repaired = html;
    let didRepair = false;

    if (!validation.usable) {
      console.warn(`[Website Builder] HTML validation failed: ${validation.errors.join(", ")}. Running auto-repair...`);
      repaired = repairHtml(html);
      validation = validateHtml(repaired);
      didRepair = true;
      console.log(`[Website Builder] Post-repair validation:`, validation);
    }

    // Clean up whitespace (duplicate blank lines, trailing spaces)
    const cleanedHtml = cleanupHtml(repaired);
    const finalSize = cleanedHtml.length;
    console.log(`[Website Builder] HTML processed. Final size: ${finalSize} chars (repaired: ${didRepair})`);

    logger.log("request_success", {
      model: modelId,
      responseMs: duration,
      usage: tokenUsage,
      finalSize,
      validation
    });

    return {
      html: cleanedHtml,
      meta: {
        modelUsed: modelId,
        fallbackUsed: false,
        retryAttempts: 0,
        generationTimeMs: duration,
        industry: analysis.industry,
        targetAudience: analysis.audience,
        tone: analysis.tone,
        primaryCta: analysis.primaryCta,
        validation
      },
      logs: logger.summary({ selectedModel: modelId, tokenUsage })
    };

  } catch (error) {
    const totalDuration = Date.now() - started;
    console.error(`[Website Builder] Error after ${totalDuration}ms:`, error.message);
    logger.log("request_failed", { message: error.message, duration: totalDuration });

    return {
      html: buildErrorPage(error),
      meta: {
        modelUsed: "none",
        fallbackUsed: false,
        retryAttempts: 0,
        generationTimeMs: totalDuration,
        industry: analysis.industry,
        validation: { usable: true, errors: [error.message] }
      },
      logs: logger.summary({ selectedModel: "none" })
    };
  }
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
  MODEL_PLAN,
  enhancePrompt,
  generateWebsiteHtml,
  repairHtml,
  validateHtml
};
