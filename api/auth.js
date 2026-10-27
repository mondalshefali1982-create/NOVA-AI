const connectDB = require("./_utils/db");
const { isDbConnected } = connectDB;
const User = require("./_models/User");
const localStore = require("./_utils/localStore");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("./_utils/auth");
const { setCors, handleOptions, getBody, sendError } = require("./_lib/gemini");

const JWT_SECRET = process.env.JWT_SECRET || "nova-ai-super-secret-jwt-key-2026";

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    await connectDB();
    const dbActive = isDbConnected();

    // Support POST with action or fallback GET to action "me"
    const body = req.method === "POST" ? getBody(req) : {};
    const action = body.action || (req.method === "GET" ? "me" : "");

    if (!action) {
      return res.status(400).json({ error: "Action is required.", status: 400 });
    }

    if (action === "login") {
      const { email, password } = body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required.", status: 400 });
      }

      let user = null;
      if (dbActive) {
        user = await User.findOne({ email: email.trim().toLowerCase() });
      } else {
        user = await localStore.findUser({ email });
      }

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials.", status: 401 });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials.", status: 401 });
      }

      const userId = user._id ? user._id.toString() : user.id;
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
      return res.status(200).json({ token, user: { name: user.name, email: user.email } });
    }

    if (action === "signup") {
      const { name, email, password } = body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "All fields are required.", status: 400 });
      }

      const cleanEmail = email.trim().toLowerCase();

      if (dbActive) {
        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser) {
          return res.status(400).json({ error: "Email already in use.", status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name: name.trim(), email: cleanEmail, password: hashedPassword });
        const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: "7d" });
        return res.status(201).json({ token, user: { name: user.name, email: user.email } });
      } else {
        const existingUser = await localStore.findUser({ email: cleanEmail });
        if (existingUser) {
          return res.status(400).json({ error: "Email already in use.", status: 400 });
        }

        const user = await localStore.createUser({ name, email: cleanEmail, password });
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
        return res.status(201).json({ token, user: { name: user.name, email: user.email } });
      }
    }

    if (action === "logout") {
      return res.status(200).json({ message: "Logged out successfully." });
    }

    if (action === "me") {
      try {
        const decoded = verifyToken(req);
        let user = null;
        if (dbActive) {
          user = await User.findById(decoded.userId).select("-password");
        } else {
          user = await localStore.findUserById(decoded.userId);
        }

        if (!user) {
          return res.status(200).json({ user: { name: "Rohan Mondal", email: "rohan@example.com" } });
        }
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
