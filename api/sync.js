const connectDB = require("./_utils/db");
const Conversation = require("./_models/Conversation");
const WebsiteProject = require("./_models/WebsiteProject");
const VideoProject = require("./_models/VideoProject");
const { verifyToken } = require("./_utils/auth");
const { setCors, handleOptions, getBody, sendError } = require("./_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    await connectDB();
    const decoded = verifyToken(req);
    const userId = decoded.userId;

    if (req.method === "GET") {
      const action = req.query.action;
      if (!action) {
        return res.status(400).json({ error: "Query parameter 'action' is required.", status: 400 });
      }

      if (action === "conversation") {
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

      if (action === "website") {
        const websites = await WebsiteProject.find({ userId }).sort({ updatedAt: -1 }).limit(50);
        return res.status(200).json({ websites: websites.map(toClientWebsite) });
      }

      if (action === "video") {
        const videos = await VideoProject.find({ userId }).sort({ updatedAt: -1 }).limit(50);
        return res.status(200).json({ videos: videos.map(toClientVideo) });
      }

      return res.status(400).json({ error: `Unknown GET action: ${action}`, status: 400 });
    }

    if (req.method === "POST") {
      const body = getBody(req);
      const { action, subAction, id } = body;

      if (!action) {
        return res.status(400).json({ error: "Action is required in request body.", status: 400 });
      }

      if (action === "conversation") {
        if (subAction === "delete" && id) {
          await Conversation.findOneAndDelete({ id, userId });
          return res.status(200).json({ status: "deleted", id });
        }
        if (subAction === "upsert" && body.conversation) {
          const normalized = normalizeConversationForDatabase(body.conversation, userId);
          const updated = await Conversation.findOneAndUpdate(
            { id: normalized.id, userId },
            normalized,
            { new: true, upsert: true, runValidators: true }
          );
          return res.status(200).json({ status: "synced", id: updated.id });
        }
      }

      if (action === "website") {
        if (subAction === "delete" && id) {
          await WebsiteProject.findOneAndDelete({ id, userId });
          return res.status(200).json({ status: "deleted", id });
        }
        if (subAction === "upsert" && body.website) {
          const normalized = normalizeWebsiteForDatabase(body.website, userId);
          const updated = await WebsiteProject.findOneAndUpdate(
            { id: normalized.id, userId },
            normalized,
            { new: true, upsert: true, runValidators: true }
          );
          return res.status(200).json({ status: "synced", id: updated.id });
        }
      }

      if (action === "video") {
        if (subAction === "delete" && id) {
          await VideoProject.findOneAndDelete({ id, userId });
          return res.status(200).json({ status: "deleted", id });
        }
        if (subAction === "upsert" && body.video) {
          const normalized = normalizeVideoForDatabase(body.video, userId);
          const updated = await VideoProject.findOneAndUpdate(
            { id: normalized.id, userId },
            normalized,
            { new: true, upsert: true, runValidators: true }
          );
          return res.status(200).json({ status: "synced", id: updated.id });
        }
      }

      return res.status(400).json({ error: "Invalid sync action payload.", status: 400 });
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

function normalizeWebsiteForDatabase(website, userId) {
  const now = new Date();
  return {
    id: website.id,
    userId,
    name: website.name || website.meta?.name || "Generated Website",
    prompt: String(website.prompt || "").slice(0, 4000),
    websiteType: website.websiteType || website.meta?.websiteType || "Custom Website",
    thumbnail: website.thumbnail || "",
    html: website.html || website.files?.["index.html"] || "",
    modelUsed: website.modelUsed || website.meta?.modelUsed || "",
    generationTimeMs: Number(website.generationTimeMs || website.meta?.generationTimeMs || 0),
    logs: website.logs || {},
    meta: website.meta || {},
    files: { "index.html": website.html || website.files?.["index.html"] || "" },
    createdAt: toDate(website.createdAt) || now,
    updatedAt: toDate(website.updatedAt) || now
  };
}

function toClientWebsite(website) {
  return {
    id: website.id,
    name: website.name,
    prompt: website.prompt,
    websiteType: website.websiteType,
    thumbnail: website.thumbnail,
    html: website.html || website.files?.["index.html"] || "",
    modelUsed: website.modelUsed,
    generationTimeMs: website.generationTimeMs || 0,
    logs: website.logs || {},
    meta: website.meta || {},
    files: { "index.html": website.html || website.files?.["index.html"] || "" },
    createdAt: toClientTime(website.createdAt),
    updatedAt: toClientTime(website.updatedAt)
  };
}

function normalizeVideoForDatabase(video, userId) {
  const now = new Date();
  return {
    id: video.id,
    userId,
    prompt: video.prompt || "",
    model: video.model || "Wan-AI/Wan2.1-T2V-14B",
    videoUrl: video.videoUrl || "",
    thumbnail: video.thumbnail || "",
    duration: video.duration || "5 seconds",
    aspectRatio: video.aspectRatio || "16:9",
    quality: video.quality || "Fast",
    generationTimeMs: Number(video.generationTimeMs || 0),
    downloadCount: Number(video.downloadCount || 0),
    status: video.status || "completed",
    name: video.name || "NOVA Video",
    createdAt: toDate(video.createdAt) || now,
    updatedAt: toDate(video.updatedAt) || now
  };
}

function toClientVideo(video) {
  return {
    id: video.id,
    prompt: video.prompt,
    model: video.model,
    videoUrl: video.videoUrl,
    thumbnail: video.thumbnail,
    duration: video.duration,
    aspectRatio: video.aspectRatio,
    quality: video.quality,
    generationTimeMs: video.generationTimeMs || 0,
    downloadCount: video.downloadCount || 0,
    status: video.status,
    name: video.name,
    createdAt: toClientTime(video.createdAt),
    updatedAt: toClientTime(video.updatedAt)
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
