const mongoose = require("mongoose");

const WebsiteProjectSchema = new mongoose.Schema({
  id: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  prompt: { type: String, default: "" },
  websiteType: { type: String, default: "Custom Website" },
  thumbnail: { type: String, default: "" },
  html: { type: String, default: "" },
  modelUsed: { type: String, default: "" },
  generationTimeMs: { type: Number, default: 0 },
  logs: { type: mongoose.Schema.Types.Mixed, default: {} },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  files: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
});

WebsiteProjectSchema.index({ userId: 1, id: 1 }, { unique: true });

module.exports = mongoose.models.WebsiteProject || mongoose.model("WebsiteProject", WebsiteProjectSchema);
