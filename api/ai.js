const { getBody, handleOptions, requirePost, sendError, setCors } = require("./_lib/gemini");
const { generateWebsiteHtml } = require("./_lib/websiteBuilder");
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
        const { prompt = "" } = body;
        const imagePrompt = prompt || "NOVA AI futuristic SaaS platform neon blue purple";
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}`;
        return res.status(200).json({ url: imageUrl });
      }

      case "video": {
        const {
          prompt = "",
          model = DEFAULT_MODEL,
          aspectRatio = "16:9",
          duration = "5 seconds",
          quality = "Fast"
        } = body;

        if (!prompt.trim()) {
          return res.status(400).json({ error: "Prompt is required for video generation.", status: 400 });
        }

        const hfKey = process.env.HUGGINGFACE_API_KEY;
        if (!hfKey) {
          console.error("[Video API] HUGGINGFACE_API_KEY is not defined in environment variables.");
          return res.status(400).json({
            error: "HUGGINGFACE_API_KEY environment variable is missing on the server. Please configure it in your environment/Vercel settings.",
            status: 400
          });
        }

        const DROPDOWN_TO_HF_MODEL = {
          "Wan-AI/Wan2.1-T2V-14B": "Wan-AI/Wan2.1-T2V-14B",
          "HunyuanVideo/HunyuanVideo": "tencent/HunyuanVideo",
          "genmo/mochi-1-preview": "genmo/mochi-1-preview",
          "THUDM/CogVideoX-5b": "zai-org/CogVideoX-5b"
        };
        const resolvedModel = DROPDOWN_TO_HF_MODEL[model] || model;

        // Log the selection details for Vercel debugging
        console.log(`[Video API] Prompt: "${prompt}" | Model: ${resolvedModel}`);

        const submitUrl = `https://router.huggingface.co/hf-inference/models/${resolvedModel}:fastest`;

        // Option B: Hand off to client-side to bypass Vercel Hobby 10-second timeout
        return res.status(200).json({
          useClientSideHf: true,
          hfToken: hfKey,
          model: resolvedModel,
          submitUrl,
          prompt,
          aspectRatio,
          duration,
          quality
        });
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

      case "website": {
        const prompt = String(body.prompt || "").trim().slice(0, 5000);
        const editPrompt = String(body.editPrompt || body.regenerateNote || "").trim().slice(0, 2500);
        const existingHtml = String(body.existingHtml || "").slice(0, 70000);

        if (!prompt && !editPrompt) {
          return res.status(400).json({ error: "Please describe the website you want to generate or edit." });
        }

        const result = await generateWebsiteHtml({
          prompt: prompt || editPrompt,
          existingHtml,
          editPrompt: existingHtml ? editPrompt : ""
        });

        return res.status(200).json(result);
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
