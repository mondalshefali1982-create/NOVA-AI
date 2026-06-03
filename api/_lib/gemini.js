const OPENROUTER_MODEL = "google/gemma-4-26b-a4b-it:free";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return false;
  }
  return true;
}

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  return req.body;
}

async function callGemini(prompt, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    const error = new Error("Missing OPENROUTER_API_KEY environment variable.");
    error.statusCode = 500;
    throw error;
  }

  const MODELS = [
    "google/gemma-4-26b-a4b-it:free",
    "openai/gpt-oss-120b:free",
    "openai/gpt-oss-20b:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "qwen/qwen3-coder:free"
  ];

  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log(`Trying model: ${model}`);

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: options.systemInstruction || "You are NOVA AI."
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
        const details = await response.text();

        if (
          response.status === 429 ||
          response.status === 503
        ) {
          console.log(`${model} unavailable, trying next model...`);
          lastError = details;
          continue;
        }

        const error = new Error(`OpenRouter request failed: ${details}`);
        error.statusCode = response.status;
        throw error;
      }

      const data = await response.json();

      console.log(`Success using model: ${model}`);

      return data.choices?.[0]?.message?.content?.trim() || "";
    } catch (err) {
      lastError = err.message;
      console.error(`Model failed: ${model}`, err.message);
    }
  }

  const error = new Error(
    `All fallback models failed. Last error: ${lastError}`
  );
  error.statusCode = 503;
  throw error;
}

  const data = await response.json();

  return data.choices?.[0]?.message?.content?.trim() || "";
}

function sendError(res, error) {
  const status = error.statusCode || 500;
 res.status(status).json({
  error: error.message,
  status
});
}

function safeJson(text, fallback) {
  try {
    return JSON.parse(text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
  } catch (error) {
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
