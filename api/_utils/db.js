const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  if (isConnected) return true;

  if (!process.env.MONGODB_URI) {
    return false;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000
    });
    isConnected = db.connections[0].readyState === 1;
    console.log("[db] MongoDB Atlas Connected successfully.");
    return true;
  } catch (error) {
    console.warn("[db] MongoDB connection unavailable (using resilient local mode):", error.message);
    isConnected = false;
    return false;
  }
}

function isDbConnected() {
  return isConnected;
}

module.exports = connectDB;
module.exports.isDbConnected = isDbConnected;
