const connectDB = require("../_utils/db");
const User = require("../_models/User");
const { verifyToken } = require("../_utils/auth");
const { setCors, handleOptions } = require("../_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed. Use GET.", status: 405 });

  try {
    await connectDB();
    const decoded = verifyToken(req);
    const user = await User.findById(decoded.userId).select("-password");
    
    if (!user) return res.status(404).json({ error: "User not found.", status: 404 });

    res.status(200).json({ user: { name: user.name, email: user.email } });
  } catch (error) {
    res.status(401).json({ error: "Unauthorized or expired token.", status: 401 });
  }
};