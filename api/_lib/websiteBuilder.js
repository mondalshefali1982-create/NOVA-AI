const { buildIndustryProject } = require("./industryTemplates");

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const MODELS_PRIORITY = [
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "google/gemma-4-26b-a4b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free"
];

const TIMEOUT_MS = 8000; // 8 seconds maximum per model to safely stay inside Vercel's 10-second limit

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
      "MANDATORY: Include relevant high-quality photos from images.unsplash.com matching the industry (hero, gallery, items/team).",
      "MANDATORY: Every button, tab filter, and form must be functional. Forms must have an onsubmit handler that displays a styled confirmation toast modal with the submitted data so every click works interactively.",
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
  const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  const overallStart = Date.now();

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
              validatedFiles[name] = unescapeJsonString(content);
            }
          }

          // If styles.css is present, embed into index.html so iframe preview displays with full CSS styling
          if (validatedFiles["styles.css"] && validatedFiles["index.html"] && !validatedFiles["index.html"].includes(validatedFiles["styles.css"])) {
            const cssBlock = `<style>\n${validatedFiles["styles.css"]}\n</style>`;
            if (validatedFiles["index.html"].includes("</head>")) {
              validatedFiles["index.html"] = validatedFiles["index.html"].replace("</head>", `${cssBlock}\n</head>`);
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
      if (Date.now() - overallStart > 7500) {
        console.warn("[Website Builder] Approaching Vercel execution window (7.5s), serving local project immediately.");
        break;
      }

      try {
        const modelStart = Date.now();
        const maxTokens = 6000;
        
        console.log(`[Website Builder] Attempting generation with model: ${modelId} | Target tokens: ${maxTokens}`);
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
              temperature: editPrompt ? 0.30 : 0.80,
              max_tokens: maxTokens
            })
          },
          Math.min(TIMEOUT_MS, Math.max(2500, 8500 - (Date.now() - overallStart))),
          modelId
        );

        const duration = Date.now() - modelStart;
        const text = await response.text();

        if (!response.ok) {
          throw new Error(`OpenRouter ${modelId} failed (${response.status}): ${text.slice(0, 200)}`);
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
            validatedFiles[name] = unescapeJsonString(content);
          }
        }

        // If styles.css is present, embed into index.html so iframe preview displays with full CSS styling
        if (validatedFiles["styles.css"] && validatedFiles["index.html"] && !validatedFiles["index.html"].includes(validatedFiles["styles.css"])) {
          const cssBlock = `<style>\n${validatedFiles["styles.css"]}\n</style>`;
          if (validatedFiles["index.html"].includes("</head>")) {
            validatedFiles["index.html"] = validatedFiles["index.html"].replace("</head>", `${cssBlock}\n</head>`);
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
            retryAttempts: 0,
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
  console.log("[Website Builder] Generating authentic industry multi-page website project...");
  const localProject = buildIndustryProject(editPrompt || prompt, analysis);
  return {
    ...localProject,
    logs: logger.summary({ selectedModel: localProject.meta?.modelUsed || "nova-industry-builder" })
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
  MODEL_PLAN: MODELS_PRIORITY.map(id => ({ id, timeoutMs: TIMEOUT_MS })),
  enhancePrompt,
  generateWebsiteHtml,
  repairHtml,
  validateHtml
};
