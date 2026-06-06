const { callGemini, getBody, handleOptions, requirePost, sendError, setCors } = require("../_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  try {
    const { message = "", history = [] } = getBody(req);
    if (!message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    const context = history
      .slice(-8)
      .map((item) => `${item.type === "user" ? "User" : "NOVA"}: ${item.text}`)
      .join("\n");

    const text = await callGemini(
      `Conversation history:\n${context || "No previous context."}\n\nUser request:\n${message}`,
      {
        systemInstruction: "You are NOVA AI, a concise premium AI productivity assistant. Give practical, polished, helpful answers.",
        maxOutputTokens: 900
      }
    );

    res.status(200).json({ text });
  } catch (error) {
    sendError(res, error);
  }
};
