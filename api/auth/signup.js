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
    const { name, email, password } = getBody(req);

    if (!name || !email || !password) return res.status(400).json({ error: "All fields are required.", status: 400 });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already in use.", status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ token, user: { name: user.name, email: user.email } });
  } catch (error) {
    sendError(res, error);
  }
};