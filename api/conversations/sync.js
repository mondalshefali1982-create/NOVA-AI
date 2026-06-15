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
        createdAt: toClientTime(c.createdAt),
        updatedAt: toClientTime(c.updatedAt),
        messages: c.messages.map(m => ({
          type: m.role || m.type,
          text: m.content || m.text || "",
          createdAt: toClientTime(m.timestamp || m.createdAt)
        })).filter(m => m.type && typeof m.text === "string")
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
        const normalized = normalizeConversationForDatabase(conversation, userId);
        const updated = await Conversation.findOneAndUpdate(
          { id: normalized.id, userId },
          normalized,
          { new: true, upsert: true, runValidators: true }
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

function normalizeConversationForDatabase(conversation, userId) {
  const now = new Date();
  return {
    id: conversation.id,
    userId,
    title: conversation.title || "New chat",
    createdAt: toDate(conversation.createdAt) || now,
    updatedAt: toDate(conversation.updatedAt) || now,
    messages: Array.isArray(conversation.messages)
      ? conversation.messages
          .filter(message => message && typeof (message.text || message.content) === "string")
          .map(message => {
            const role = message.role || message.type;
            return {
              role: role === "user" ? "user" : "ai",
              content: message.content || message.text,
              timestamp: toDate(message.timestamp || message.createdAt) || now
            };
          })
      : []
  };
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toClientTime(value) {
  if (!value) return Date.now();
  if (typeof value === "number") return value;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? Date.now() : date.getTime();
}
