const connectDB = require("../_utils/db");
const Memory = require("../_models/Memory");
const { verifyToken } = require("../_utils/auth");
const {
  setCors,
  handleOptions,
  getBody
} = require("../_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);

  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    await connectDB();

    const decoded = verifyToken(req);

    const {
      content,
      category = "general",
      importance = "medium"
    } = getBody(req);

    if (!content) {
      return res.status(400).json({
        error: "Content is required"
      });
    }

    // Prevent duplicates
    const existing = await Memory.findOne({
      userId: decoded.userId,
      content
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Memory already exists",
        memory: existing
      });
    }

    const memory = await Memory.create({
      userId: decoded.userId,
      content,
      category,
      importance
    });

    return res.status(201).json({
      success: true,
      memory
    });

  } catch (error) {
    console.error("Memory save error:", error);

    return res.status(401).json({
      success: false,
      error: error.message
    });
  }
};
