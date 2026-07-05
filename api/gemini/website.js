const { getBody, handleOptions, requirePost, sendError, setCors } = require("../_lib/gemini");
const { generateWebsiteHtml } = require("../_lib/websiteBuilder");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  try {
    const body = getBody(req);
    const prompt = String(body.prompt || "").trim().slice(0, 5000);
    const editPrompt = String(body.editPrompt || body.regenerateNote || "").trim().slice(0, 2500);
    const existingHtml = String(body.existingHtml || "").slice(0, 70000);

    if (!prompt && !editPrompt) {
      return res.status(400).json({ error: "Please describe the website you want to generate or edit." });
    }

    const result = await generateWebsiteHtml({
      prompt: prompt || editPrompt,
      existingHtml,
      editPrompt: existingHtml ? editPrompt : ""
    });

    res.status(200).json(result);
  } catch (error) {
    sendError(res, error);
  }
};
