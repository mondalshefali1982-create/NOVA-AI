const connectDB = require("../_utils/db");
const User = require("../_models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { setCors, handleOptions, getBody, requirePost, sendError } = require("../_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  try {
    if (!process.env.JWT_SECRET) throw new Error("Server config error: Missing JWT_SECRET.");

    await connectDB();
    const { email, password } = getBody(req);

    if (!email || !password) return res.status(400).json({ error: "Email and password are required.", status: 400 });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials.", status: 401 });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials.", status: 401 });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({ token, user: { name: user.name, email: user.email } });
  } catch (error) {
    sendError(res, error);
  }
};