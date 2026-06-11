const connectDB = require("../_utils/db");
const Memory = require("../_models/Memory");
const { verifyToken } = require("../_utils/auth");
const { setCors, handleOptions } = require("../_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);

  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    await connectDB();

    const decoded = verifyToken(req);

    const memories = await Memory.find({
      userId: decoded.userId
    }).sort({
      updatedAt: -1
    });

    return res.status(200).json({
      success: true,
      memories
    });

  } catch (error) {
    console.error("Memory list error:", error);

    return res.status(401).json({
      success: false,
      error: error.message
    });
  }
};
