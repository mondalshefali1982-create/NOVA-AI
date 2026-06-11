const connectDB = require("../_utils/db");
const Memory = require("../_models/Memory");
const { verifyToken } = require("../_utils/auth");
const { setCors, handleOptions } = require("../_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);

  if (handleOptions(req, res)) return;

  if (req.method !== "DELETE") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    await connectDB();

    const decoded = verifyToken(req);

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        error: "Memory ID required"
      });
    }

    await Memory.deleteOne({
      _id: id,
      userId: decoded.userId
    });

    return res.status(200).json({
      success: true
    });

  } catch (error) {
    console.error(error);

    return res.status(401).json({
      success: false,
      error: error.message
    });
  }
};
