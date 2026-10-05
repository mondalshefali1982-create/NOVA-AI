const connectDB = require("./_utils/db");
const User = require("./_models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("./_utils/auth");
const { setCors, handleOptions, getBody, sendError } = require("./_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    await connectDB();
    
    // Support POST with action or fallback GET to action "me"
    const body = req.method === "POST" ? getBody(req) : {};
    const action = body.action || (req.method === "GET" ? "me" : "");

    if (!action) {
      return res.status(400).json({ error: "Action is required.", status: 400 });
    }

    if (action === "login") {
      if (!process.env.JWT_SECRET) throw new Error("Server config error: Missing JWT_SECRET.");
      const { email, password } = body;
      if (!email || !password) return res.status(400).json({ error: "Email and password are required.", status: 400 });

      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ error: "Invalid credentials.", status: 401 });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: "Invalid credentials.", status: 401 });

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
      return res.status(200).json({ token, user: { name: user.name, email: user.email } });
    }

    if (action === "signup") {
      if (!process.env.JWT_SECRET) throw new Error("Server config error: Missing JWT_SECRET.");
      const { name, email, password } = body;
      if (!name || !email || !password) return res.status(400).json({ error: "All fields are required.", status: 400 });

      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ error: "Email already in use.", status: 400 });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, password: hashedPassword });

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
      return res.status(201).json({ token, user: { name: user.name, email: user.email } });
    }

    if (action === "logout") {
      return res.status(200).json({ message: "Logged out successfully." });
    }

    if (action === "me") {
      try {
        const decoded = verifyToken(req);
        const user = await User.findById(decoded.userId).select("-password");
        if (!user) return res.status(404).json({ error: "User not found.", status: 404 });
        return res.status(200).json({ user: { name: user.name, email: user.email } });
      } catch (error) {
        return res.status(401).json({ error: "Unauthorized or expired token.", status: 401 });
      }
    }

    return res.status(400).json({ error: `Unknown action: ${action}`, status: 400 });
  } catch (error) {
    sendError(res, error);
  }
};
