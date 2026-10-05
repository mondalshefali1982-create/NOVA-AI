const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in environment variables.");
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI);
    isConnected = db.connections[0].readyState === 1;
    console.log("MongoDB Atlas Connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

module.exports = connectDB;