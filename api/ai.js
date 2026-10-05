const { getBody, handleOptions, requirePost, sendError, setCors } = require("./_lib/gemini");
const { callGemini, safeJson } = require("./_lib/gemini");
const connectDB = require("./_utils/db");
const Memory = require("./_models/Memory");
const { verifyToken } = require("./_utils/auth");

const DEFAULT_MODEL = "Wan-AI/Wan2.1-T2V-14B";

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
    const body = getBody(req);
    const { action } = body;

    if (!action) {
      return res.status(400).json({ error: "Action parameter is required.", status: 400 });
    }

    switch (action) {
      case "chat": {
        await connectDB();
        const { message = "", history = [], systemInstruction } = body;
        let userId = null;

        try {
          const decoded = verifyToken(req);
          userId = decoded.userId;
        } catch (error) {
          // Guest mode
        }

        if (!message.trim()) {
          return res.status(400).json({ error: "Message is required." });
        }

        await saveMemoryIfRelevant(message, userId);

        const context = history
          .slice(-8)
          .map(item => `${item.type === "user" ? "User" : "NOVA"}: ${item.text}`)
          .join("\n");

        let memoryContext = "No memories stored.";

        try {
          const memories = userId
            ? await Memory.find({ userId }).sort({ createdAt: -1 }).limit(20)
            : [];
          if (memories.length > 0) {
            memoryContext = memories.map(m => `- ${m.content}`).join("\n");
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

        const responseText = await callGemini(prompt, {
          systemInstruction: systemInstruction || "You are NOVA AI, a premium AI productivity assistant with memory. Use stored memories when relevant. Give practical, polished, helpful answers and remember important information provided by the user.",
          maxOutputTokens: 900
        });

        return res.status(200).json({ text: responseText });
      }

      case "image": {
        const { prompt = "", type = "visual" } = body;
        const cleanPrompt = String(prompt || "NOVA AI futuristic SaaS platform neon blue purple")
          .replace(/[\r\n]+/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 1000);

        // 1. If HuggingFace token is set, generate via FLUX / SDXL
        const hfKey = process.env.HUGGINGFACE_API_KEY;
        if (hfKey) {
          try {
            console.log("[Image API] Generating via HuggingFace FLUX...");
            const hfRes = await fetch("https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${hfKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ inputs: cleanPrompt })
            });

            if (hfRes.ok) {
              const buffer = await hfRes.arrayBuffer();
              const base64 = Buffer.from(buffer).toString("base64");
              const mime = hfRes.headers.get("content-type") || "image/jpeg";
              console.log("[Image API] HuggingFace image generated successfully.");
              return res.status(200).json({ url: `data:${mime};base64,${base64}` });
            }
          } catch (hfErr) {
            console.warn("[Image API] HuggingFace attempt failed:", hfErr.message);
          }
        }

        // 2. Pollinations endpoint with clean single-line prompt & safe parameters
        const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?safe=true&nofeed=true`;
        return res.status(200).json({ url: pollUrl });
      }

      case "planner": {
        const { input = "" } = body;
        const raw = await callGemini(
          `Create a daily productivity plan for:\n${input || "a focused productive day"}\n\nReturn only valid JSON in this shape:\n{"blocks":[{"time":"09:00","title":"Deep work","text":"Specific recommendation"}]}\nUse 4 to 6 blocks.`,
          {
            systemInstruction: "You are NOVA AI's planner engine. Return strict JSON only.",
            responseMimeType: "application/json",
            maxOutputTokens: 900
          }
        );

        const parsed = safeJson(raw, { blocks: [] });
        const blocks = Array.isArray(parsed.blocks) && parsed.blocks.length
          ? parsed.blocks.slice(0, 6)
          : [
              { time: "09:00", title: "Deep work", text: `Start with the hardest part of: ${input}` },
              { time: "11:00", title: "AI assist", text: "Use NOVA to summarize, draft, or refine missing assets." },
              { time: "14:00", title: "Execution sprint", text: "Complete the next visible deliverable." },
              { time: "17:00", title: "Review", text: "Review progress and plan tomorrow." }
            ];

        return res.status(200).json({ blocks });
      }

      case "document": {
        const { type = "document", input = "" } = body;
        const text = await callGemini(
          `Create a polished ${type} for this request:\n${input || "A professional AI productivity document."}\n\nUse clean formatting, clear sections, and a premium professional tone.`,
          {
            systemInstruction: "You are NOVA AI's document generator. Produce ready-to-use business writing.",
            maxOutputTokens: 1400
          }
        );
        return res.status(200).json({ text });
      }

      case "health": {
        const text = await callGemini("Say NOVA_OK");
        return res.status(200).json({ status: 200, response: text });
      }

      default: {
        return res.status(400).json({ error: `Unknown AI action: ${action}`, status: 400 });
      }
    }
  } catch (error) {
    sendError(res, error);
  }
};
