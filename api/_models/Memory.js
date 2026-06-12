const mongoose = require("mongoose");

const MemorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },
    content: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: "general"
    },
    importance: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.Memory ||
  mongoose.model("Memory", MemorySchema);
