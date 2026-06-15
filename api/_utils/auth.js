const jwt = require("jsonwebtoken");

function verifyToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized: Missing or invalid token");
  }
  
  if (!process.env.JWT_SECRET) {
    throw new Error("Server config error: Missing JWT_SECRET.");
  }

  const token = authHeader.split(" ")[1];
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { verifyToken };