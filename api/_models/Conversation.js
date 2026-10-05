const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "ai"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: () => new Date() },
  type: { type: String, enum: ["user", "ai"] },
  text: String,
  createdAt: Number
});

const ConversationSchema = new mongoose.Schema({
  id: { type: String, required: true }, 
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  messages: [MessageSchema],
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
});

ConversationSchema.index({ userId: 1, id: 1 }, { unique: true });

module.exports = mongoose.models.Conversation || mongoose.model("Conversation", ConversationSchema);
