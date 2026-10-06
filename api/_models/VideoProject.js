const mongoose = require("mongoose");

const VideoProjectSchema = new mongoose.Schema({
  id: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  prompt: { type: String, required: true },
  model: { type: String, default: "Wan-AI/Wan2.1-T2V-14B" },
  videoUrl: { type: String, default: "" },
  thumbnail: { type: String, default: "" },
  duration: { type: String, default: "5 seconds" },
  aspectRatio: { type: String, default: "16:9" },
  quality: { type: String, default: "Fast" },
  generationTimeMs: { type: Number, default: 0 },
  downloadCount: { type: Number, default: 0 },
  status: { type: String, default: "completed" },
  name: { type: String, default: "" },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
});

VideoProjectSchema.index({ userId: 1, id: 1 }, { unique: true });

module.exports = mongoose.models.VideoProject || mongoose.model("VideoProject", VideoProjectSchema);
