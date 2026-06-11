const {
  callGemini,
  getBody,
  handleOptions,
  requirePost,
  sendError,
  setCors
} = require("../_lib/gemini");

const Memory = require("../_models/Memory");
const connectDB = require("../_utils/db");

module.exports = async function handler(req, res) {
  setCors(res);

  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  try {
    await connectDB();

    const { message = "", history = [] } = getBody(req);

    if (!message.trim()) {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    const context = history
      .slice(-8)
      .map(
        (item) =>
          `${item.type === "user" ? "User" : "NOVA"}: ${item.text}`
      )
      .join("\n");

    // Load memories
    let memoryContext = "No memories stored.";

    try {
      const memories = await Memory.find({})
  .sort({ createdAt: -1 })
  .limit(10);

console.log("MEMORIES FOUND:", JSON.stringify(memories));

      if (memories.length > 0) {
        memoryContext = memories
          .map((m) => `- ${m.content}`)
          .join("\n");
      }
    } catch (memoryError) {
      console.error("Memory load error:", memoryError);
    }

    const prompt = `
USER MEMORIES:

${memoryContext}

CONVERSATION HISTORY:

${context || "No previous context."}

CURRENT USER REQUEST:

${message}
`;
console.log("PROMPT SENT TO GEMINI:");
console.log(prompt);
    const text = await callGemini(prompt, {
      systemInstruction:
        "You are NOVA AI, a premium AI productivity assistant with memory. Use stored memories when relevant. Give practical, polished, and helpful answers.",
      maxOutputTokens: 900
    });

    return res.status(200).json({
      text
    });

  } catch (error) {
    sendError(res, error);
  }
};
