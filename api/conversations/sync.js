const connectDB = require("../_utils/db");
const Conversation = require("../_models/Conversation");
const { verifyToken } = require("../_utils/auth");
const { setCors, handleOptions, getBody, sendError } = require("../_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    await connectDB();
    const decoded = verifyToken(req);
    const userId = decoded.userId;

    if (req.method === "GET") {
      const conversations = await Conversation.find({ userId }).sort({ updatedAt: -1 });
      const formatted = conversations.map(c => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messages: c.messages.map(m => ({ type: m.type, text: m.text, createdAt: m.createdAt }))
      }));
      return res.status(200).json({ conversations: formatted });
    }

    if (req.method === "POST") {
      const { action, conversation, id } = getBody(req);
      
      if (action === "delete" && id) {
        await Conversation.findOneAndDelete({ id, userId });
        return res.status(200).json({ status: "deleted", id });
      }

      if (action === "upsert" && conversation) {
        const updated = await Conversation.findOneAndUpdate(
          { id: conversation.id, userId },
          { ...conversation, userId },
          { new: true, upsert: true }
        );
        return res.status(200).json({ status: "synced", id: updated.id });
      }

      return res.status(400).json({ error: "Invalid action payload.", status: 400 });
    }

    res.status(405).json({ error: "Method not allowed.", status: 405 });
  } catch (error) {
    if (error.message.includes("token") || error.message.includes("Unauthorized")) {
      return res.status(401).json({ error: error.message, status: 401 });
    }
    sendError(res, error);
  }
};