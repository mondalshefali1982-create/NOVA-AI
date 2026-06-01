const { callGemini, handleOptions, requirePost, sendError, setCors } = require("../_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== "GET" && !requirePost(req, res)) return;

  try {
    const keyConfigured = Boolean(process.env.GEMINI_API_KEY);
    if (!keyConfigured) {
      return res.status(500).json({
        ok: false,
        error: "GEMINI_API_KEY is missing in Vercel environment variables."
      });
    }

    const text = await callGemini("Reply with exactly: NOVA_OK", {
      systemInstruction: "You are a health check endpoint.",
      maxOutputTokens: 20
    });

    res.status(200).json({
      ok: true,
      model: "gemini-2.0-flash",
      text
    });
  } catch (error) {
    sendError(res, error);
  }
};
