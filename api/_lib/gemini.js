const OPENROUTER_ENDPOINT =
  "https://openrouter.ai/api/v1/chat/completions";

const MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "qwen/qwen3-coder:free"
];

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
  const googleApiKey = process.env.GOOGLE_API_KEY;
  const openrouterApiKey =
    process.env.OPENROUTER_API_KEY;

  // =====================================
  // GOOGLE GEMINI PRIMARY
  // =====================================

  if (googleApiKey) {
    try {
      console.log("Trying Google Gemini...");

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text:
                      (options.systemInstruction ||
                        options.systemInstructions ||
                        "You are NOVA AI, a helpful AI assistant.") +
                      "\n\nUser: " +
                      prompt
                  }
                ]
              }
            ]
          })
        }
      );

      if (response.ok) {
        const data = await response.json();

        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
          console.log(
            "Success using Google Gemini"
          );

          return text.trim();
        }
      }

      const errorText =
        await response.text();

      console.log(
        "Gemini unavailable:",
        errorText
      );
    } catch (err) {
      console.error(
        "Gemini failed:",
        err.message
      );
    }
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
      console.log(`Trying model: ${model}`);

      const response = await fetch(
        OPENROUTER_ENDPOINT,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer":
              "https://nova-ai-rohann.vercel.app",
            "X-Title": "NOVA AI"
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  options.systemInstruction ||
                  options.systemInstructions ||
                  "You are NOVA AI, a helpful AI assistant."
              },
              {
                role: "user",
                content: prompt
              }
            ]
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
            `${model} unavailable, trying next model...`
          );

          lastError = details;

          continue;
        }

        const error = new Error(
          `OpenRouter request failed: ${details}`
        );

        error.statusCode =
          response.status;

        throw error;
      }

      const data =
        await response.json();

      console.log(
        `Success using model: ${model}`
      );

      return (
        data?.choices?.[0]?.message?.content?.trim() ||
        ""
      );
    } catch (err) {
      console.error(
        `Model failed: ${model}`,
        err.message
      );

      lastError = err.message;
    }
  }

  const error = new Error(
    `All fallback models failed. Last error: ${lastError}`
  );

  error.statusCode = 503;

  throw error;
}

function sendError(res, error) {
  const status =
    error.statusCode || 500;

  res.status(status).json({
    error: error.message,
    status
  });
}

function safeJson(text, fallback) {
  try {
    return JSON.parse(
      text
        .replace(/^```json\s*/i, "")
        .replace(/```$/i, "")
        .trim()
    );
  } catch {
    return fallback;
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  callGemini,
  escapeXml,
  getBody,
  handleOptions,
  requirePost,
  safeJson,
  sendError,
  setCors
};
