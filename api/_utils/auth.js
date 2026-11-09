const jwt = require("jsonwebtoken");

function verifyToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized: Missing or invalid token");
  }
  
  const secret = process.env.JWT_SECRET || "nova-ai-super-secret-jwt-key-2026";
  const token = authHeader.split(" ")[1];
  return jwt.verify(token, secret);
}

module.exports = { verifyToken };
