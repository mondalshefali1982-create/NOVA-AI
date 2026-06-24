const OPENROUTER_ENDPOINT =
  "https://openrouter.ai/api/v1/chat/completions";

const MODELS = [
  "openai/gpt-oss-120b:free",
  "google/gemini-2.5-flash:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "openrouter/free"
];

const NOVA_SYSTEM_PROMPT = `

You are NOVA AI, an advanced AI assistant created by Rohan Mondal.

Guidelines:
- Be friendly, professional, and helpful.
- Give direct answers first.
- Use clean formatting.
- Use bullet points only when helpful.
- Never use markdown symbols like **, ##, ### or decorative formatting.
- Never repeatedly say "As NOVA AI".
- Avoid robotic responses.
- Keep responses easy to read.
- Use short paragraphs.
- Format answers similar to ChatGPT and Gemini.
- Be practical and solution-focused.
- If asked who you are, introduce yourself naturally.
- If asked what you can do, explain your capabilities clearly.

You help users with:
- Coding and debugging
- Learning and education
- Productivity
- Business ideas and startups
- Career guidance
- Writing and content creation
- Research and problem solving

Always prioritize readability and professionalism.
`;

function cleanAIResponse(text = "") {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/__/g, "")
    .replace(/_/g, "")
    .replace(/`/g, "")
    .replace(/---+/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function setCors(res) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.ALLOWED_ORIGIN || "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
}

function handleOptions(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }

  return false;
}

function requirePost(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({
      error: "Method not allowed. Use POST."
    });

    return false;
  }

  return true;
}

function getBody(req) {
  if (!req.body) return {};

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
}

async function callGemini(prompt, options = {}) {
  const googleApiKey =
    process.env.GOOGLE_API_KEY;

  const openrouterApiKey =
    process.env.OPENROUTER_API_KEY;

  const systemPrompt =
    options.systemInstruction ||
    options.systemInstructions ||
    NOVA_SYSTEM_PROMPT;

  // FIX: Raise token limit significantly for website generation
  // Website HTML+CSS+JS can easily require 4000-8000 tokens
  const maxOutputTokens =
    options.maxOutputTokens || 2000;

  // FIX: Use lower temperature for JSON tasks to ensure reliable output
  const temperature =
    options.temperature !== undefined ? options.temperature : 0.7;

  // FIX: JSON mode flag — when true, tells Gemini to return raw JSON only
  const jsonMode = options.jsonMode === true;

  // =====================================
  // GOOGLE GEMINI PRIMARY
  // =====================================

  if (googleApiKey) {
    try {
      console.log(
        `[callGemini] Trying Google Gemini... (maxTokens=${maxOutputTokens}, jsonMode=${jsonMode})`
      );

      const generationConfig = {
        maxOutputTokens,
        temperature
      };

      // FIX: Enable JSON mode for structured output (prevents markdown wrapping)
      if (jsonMode) {
        generationConfig.responseMimeType = "application/json";
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text:
                      systemPrompt +
                      "\n\nUser: " +
                      prompt
                  }
                ]
              }
            ],
            generationConfig
          })
        }
      );

      if (response.ok) {
        const data =
          await response.json();

        const text =
          data?.candidates?.[0]
            ?.content?.parts?.[0]
            ?.text;

        if (text) {
          // FIX: Log response length so we can detect truncation early
          console.log(
            `[callGemini] Gemini success. Response length: ${text.length} chars`
          );

          return text.trim();
        }

        console.warn(
          "[callGemini] Gemini returned OK but no text content. Candidates:",
          JSON.stringify(data?.candidates?.map(c => ({ finishReason: c.finishReason, safetyRatings: c.safetyRatings })))
        );
      } else {
        const errorText =
          await response.text();

        console.warn(
          `[callGemini] Gemini HTTP ${response.status}:`,
          errorText.slice(0, 400)
        );
      }
    } catch (err) {
      console.error(
        "[callGemini] Gemini threw exception:",
        err.message
      );
    }
  } else {
    console.log("[callGemini] No GOOGLE_API_KEY — skipping Gemini, using OpenRouter.");
  }

  // =====================================
  // OPENROUTER FALLBACK
  // =====================================

  if (!openrouterApiKey) {
    const error = new Error(
      "Missing OPENROUTER_API_KEY environment variable."
    );

    error.statusCode = 500;

    throw error;
  }

  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log(
        `[callGemini] Trying OpenRouter model: ${model} (maxTokens=${maxOutputTokens})`
      );

      const messages = [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ];

      // FIX: For JSON mode on OpenRouter, add explicit instruction in user message
      if (jsonMode) {
        messages[1].content =
          "IMPORTANT: Return ONLY valid JSON with no markdown fences, no prose, no comments. Start your response with { and end with }.\n\n" +
          prompt;
      }

      const response =
        await fetch(
          OPENROUTER_ENDPOINT,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openrouterApiKey}`,
              "Content-Type":
                "application/json",
              "HTTP-Referer":
                "https://nova-ai-rohann.vercel.app",
              "X-Title":
                "NOVA AI"
            },
            body: JSON.stringify({
              model,
              messages,
              temperature,
              max_tokens: maxOutputTokens
            })
          }
        );

      if (!response.ok) {
        const details =
          await response.text();

        if (
          response.status === 429 ||
          response.status === 503
        ) {
          console.log(
            `[callGemini] ${model} rate-limited (${response.status}), trying next model...`
          );

          lastError = details;
          continue;
        }

        const error = new Error(
          `OpenRouter request failed (${response.status}): ${details.slice(0, 200)}`
        );

        error.statusCode =
          response.status;

        throw error;
      }

      const data =
        await response.json();

      const content =
        data?.choices?.[0]
          ?.message?.content;

      if (content) {
        // FIX: Log finish reason and response length
        const finishReason = data?.choices?.[0]?.finish_reason;
        console.log(
          `[callGemini] Success: ${model} | length=${content.length} | finish_reason=${finishReason}`
        );

        if (finishReason === "length") {
          console.warn(
            `[callGemini] WARNING: ${model} response was CUT OFF due to token limit! Consider raising maxOutputTokens.`
          );
        }

        return content.trim();
      }

      console.warn(`[callGemini] ${model} returned OK but empty content.`);
    } catch (err) {
      console.error(
        `[callGemini] Model ${model} threw:`,
        err.message
      );

      lastError = err.message;
    }
  }

  const error = new Error(
    "The AI providers are temporarily busy. Please try again in a few moments."
  );

  error.statusCode = 503;

  console.error(
    "[callGemini] All fallback models exhausted. Last error:",
    lastError
  );

  throw error;
}

function sendError(res, error) {
  const status =
    error.statusCode || 500;

  res.status(status).json({
    error:
      error.message ||
      "Something went wrong.",
    status
  });
}

function safeJson(
  text,
  fallback
) {
  try {
    return JSON.parse(
      text
        .replace(
          /^```json\s*/i,
          ""
        )
        .replace(
          /```$/i,
          ""
        )
        .trim()
    );
  } catch {
    return fallback;
  }
}

function escapeXml(value) {
  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    );
}

module.exports = {
  callGemini,
  cleanAIResponse,
  escapeXml,
  getBody,
  handleOptions,
  requirePost,
  safeJson,
  sendError,
  setCors
};
