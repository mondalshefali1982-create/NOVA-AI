const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  type: { type: String, enum: ["user", "ai"], required: true },
  text: { type: String, required: true },
  createdAt: { type: Number, default: () => Date.now() }
});

const ConversationSchema = new mongoose.Schema({
  id: { type: String, required: true }, 
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  messages: [MessageSchema],
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() }
});

ConversationSchema.index({ userId: 1, id: 1 }, { unique: true });

module.exports = mongoose.models.Conversation || mongoose.model("Conversation", ConversationSchema);
