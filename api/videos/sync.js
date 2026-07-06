const connectDB = require("../_utils/db");
const VideoProject = require("../_models/VideoProject");
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
      const videos = await VideoProject.find({ userId }).sort({ updatedAt: -1 }).limit(50);
      return res.status(200).json({
        videos: videos.map(toClientVideo)
      });
    }

    if (req.method === "POST") {
      const { action, video, id } = getBody(req);

      if (action === "delete" && id) {
        await VideoProject.findOneAndDelete({ id, userId });
        return res.status(200).json({ status: "deleted", id });
      }

      if (action === "upsert" && video) {
        const normalized = normalizeVideoForDatabase(video, userId);
        const updated = await VideoProject.findOneAndUpdate(
          { id: normalized.id, userId },
          normalized,
          { new: true, upsert: true, runValidators: true }
        );
        return res.status(200).json({ status: "synced", id: updated.id });
      }

      return res.status(400).json({ error: "Invalid video sync payload.", status: 400 });
    }

    res.status(405).json({ error: "Method not allowed.", status: 405 });
  } catch (error) {
    if (error.message.includes("token") || error.message.includes("Unauthorized")) {
      return res.status(401).json({ error: error.message, status: 401 });
    }
    sendError(res, error);
  }
};

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
