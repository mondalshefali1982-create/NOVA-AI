const OPENROUTER_MODEL = "deepseek/deepseek-chat-v3-0324:free";
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

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b:free",
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
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(`OpenRouter request failed: ${details}`);
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();

  return data.choices?.[0]?.message?.content?.trim() || "";
}

function sendError(res, error) {
  const status = error.statusCode || 500;
  res.status(status).json({
    error: status === 500 ? "NOVA backend error." : error.message,
    detail: process.env.NODE_ENV === "development" ? error.message : undefined
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
