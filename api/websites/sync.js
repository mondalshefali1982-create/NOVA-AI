const connectDB = require("../_utils/db");
const WebsiteProject = require("../_models/WebsiteProject");
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
      const websites = await WebsiteProject.find({ userId }).sort({ updatedAt: -1 }).limit(50);
      return res.status(200).json({
        websites: websites.map(toClientWebsite)
      });
    }

    if (req.method === "POST") {
      const { action, website, id } = getBody(req);

      if (action === "delete" && id) {
        await WebsiteProject.findOneAndDelete({ id, userId });
        return res.status(200).json({ status: "deleted", id });
      }

      if (action === "upsert" && website) {
        const normalized = normalizeWebsiteForDatabase(website, userId);
        const updated = await WebsiteProject.findOneAndUpdate(
          { id: normalized.id, userId },
          normalized,
          { new: true, upsert: true, runValidators: true }
        );
        return res.status(200).json({ status: "synced", id: updated.id });
      }

      return res.status(400).json({ error: "Invalid website sync payload.", status: 400 });
    }

    res.status(405).json({ error: "Method not allowed.", status: 405 });
  } catch (error) {
    if (error.message.includes("token") || error.message.includes("Unauthorized")) {
      return res.status(401).json({ error: error.message, status: 401 });
    }
    sendError(res, error);
  }
};

function normalizeWebsiteForDatabase(website, userId) {
  const now = new Date();
  return {
    id: website.id,
    userId,
    name: website.name || website.meta?.name || "Generated Website",
    prompt: String(website.prompt || "").slice(0, 4000),
    websiteType: website.websiteType || website.meta?.websiteType || "Custom Website",
    thumbnail: website.thumbnail || "",
    meta: website.meta || {},
    files: website.files || {},
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
    meta: website.meta || {},
    files: website.files || {},
    createdAt: toClientTime(website.createdAt),
    updatedAt: toClientTime(website.updatedAt)
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
