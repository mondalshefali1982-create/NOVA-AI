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

  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY environment variable.");
  }

  let finalResult = null;
  let lastError = null;

  // ── Smart Model Selection Fallback Chain ─────────────────────────────
  for (const modelId of MODELS_PRIORITY) {
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

  // ── Success check ───────────────────────────────────────────────────
  if (finalResult) {
    return finalResult;
  }

  // ── Fallback error response page ────────────────────────────────────
  const errorMsg = lastError?.message || "All models in fallback chain failed to generate website.";
  console.error(`[Website Builder] Complete generation failure: ${errorMsg}`);
  
  const errorHtml = buildErrorPage(lastError || new Error(errorMsg));
  return {
    html: errorHtml,
    files: { "index.html": errorHtml },
    meta: {
      modelUsed: "none",
      fallbackUsed: true,
      retryAttempts: 0,
      generationTimeMs: logger.summary().totalMs,
      industry: analysis.industry,
      validation: { usable: true, errors: [errorMsg] }
    },
    logs: logger.summary({ selectedModel: "none" })
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
