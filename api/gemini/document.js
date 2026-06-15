const { callGemini, getBody, handleOptions, requirePost, sendError, setCors } = require("../_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  try {
    const { type = "document", input = "" } = getBody(req);
    const text = await callGemini(
      `Create a polished ${type} for this request:\n${input || "A professional AI productivity document."}\n\nUse clean formatting, clear sections, and a premium professional tone.`,
      {
        systemInstruction: "You are NOVA AI's document generator. Produce ready-to-use business writing.",
        maxOutputTokens: 1400
      }
    );

    res.status(200).json({ text });
  } catch (error) {
    sendError(res, error);
  }
};
