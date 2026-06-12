const { verifyToken } = require("../_utils/auth");
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

async function saveMemoryIfRelevant(message, userId) {
  const patterns = [
    {
      regex: /my name is (.+)/i,
      category: "personal",
      importance: "high",
      formatter: (match) => `User name is ${match[1].trim()}`
    },
    {
      regex: /i am building (.+)/i,
      category: "project",
      importance: "high",
      formatter: (match) => `User is building ${match[1].trim()}`
    },
    {
      regex: /my goal is (.+)/i,
      category: "goal",
      importance: "high",
      formatter: (match) => `User goal is ${match[1].trim()}`
    },
    {
      regex: /i am a (.+)/i,
      category: "career",
      importance: "medium",
      formatter: (match) => `User is a ${match[1].trim()}`
    },
    {
      regex: /i work as (.+)/i,
      category: "career",
      importance: "medium",
      formatter: (match) => `User works as ${match[1].trim()}`
    }
  ];

  try {
    for (const pattern of patterns) {
      const match = message.match(pattern.regex);

      if (!match) continue;

      const content = pattern.formatter(match);

      const existing = await Memory.findOne({ content });

      if (!existing) {
        await Memory.create({
  userId,
  content,
  category: pattern.category,
  importance: pattern.importance
});

        console.log("MEMORY SAVED:", content);
      }

      break;
    }
  } catch (error) {
    console.error("Memory save error:", error);
  }
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  try {
    await connectDB();

    const { message = "", history = [] } = getBody(req);
    let userId = null;

try {
  const decoded = verifyToken(req);
  userId = decoded.userId;
} catch (error) {
  console.log("No valid user token found");
}

    if (!message.trim()) {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    // Auto-save memories
    await saveMemoryIfRelevant(message, userId);

    const context = history
      .slice(-8)
      .map(
        (item) =>
          `${item.type === "user" ? "User" : "NOVA"}: ${item.text}`
      )
      .join("\n");

    let memoryContext = "No memories stored.";

    try {
  const memories = userId
    ? await Memory.find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
    : [];

  console.log("MEMORIES FOUND:", memories.length);

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

    const text = await callGemini(prompt, {
      systemInstruction:
        "You are NOVA AI, a premium AI productivity assistant with memory. Use stored memories when relevant. Give practical, polished, helpful answers and remember important information provided by the user.",
      maxOutputTokens: 900
    });

    return res.status(200).json({
      text
    });

  } catch (error) {
    sendError(res, error);
  }
};
