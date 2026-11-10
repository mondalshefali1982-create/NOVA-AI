const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  if (isConnected) return true;

  if (!process.env.MONGODB_URI) {
    return false;
  }

  try {
    const connectPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 1800
    });
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1800));

    const db = await Promise.race([connectPromise, timeoutPromise]);
    if (db && db.connections && db.connections[0]) {
      isConnected = db.connections[0].readyState === 1;
      console.log("[db] MongoDB Atlas Connected successfully.");
      return true;
    }
    console.warn("[db] MongoDB connection timed out; switching to resilient local mode.");
    isConnected = false;
    return false;
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
