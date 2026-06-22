const { getBody, handleOptions, requirePost, sendError, setCors } = require("../_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  try {
    const { prompt = "" } = getBody(req);
    const imagePrompt = prompt || "NOVA AI futuristic SaaS platform neon blue purple";
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}`;

    res.status(200).json({ url: imageUrl });
  } catch (error) {
    sendError(res, error);
  }
};
