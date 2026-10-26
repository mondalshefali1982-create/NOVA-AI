const { getBody, handleOptions, requirePost, sendError, setCors } = require("./_lib/gemini");
const { callGemini, safeJson } = require("./_lib/gemini");
const connectDB = require("./_utils/db");
const { isDbConnected } = connectDB;
const Memory = require("./_models/Memory");
const localStore = require("./_utils/localStore");
const { verifyToken } = require("./_utils/auth");

const DEFAULT_MODEL = "Wan-AI/Wan2.1-T2V-14B";

async function saveMemoryIfRelevant(message, userId, dbActive) {
  const patterns = [
    { regex: /my name is (.+)/i, category: "personal", importance: "high", formatter: (m) => `User name is ${m[1].trim()}` },
    { regex: /i am building (.+)/i, category: "project", importance: "high", formatter: (m) => `User is building ${m[1].trim()}` },
    { regex: /my goal is (.+)/i, category: "goal", importance: "high", formatter: (m) => `User goal is ${m[1].trim()}` },
    { regex: /i am a (.+)/i, category: "career", importance: "medium", formatter: (m) => `User is a ${m[1].trim()}` },
    { regex: /i work as (.+)/i, category: "career", importance: "medium", formatter: (m) => `User works as ${m[1].trim()}` }
  ];

  try {
    for (const pattern of patterns) {
      const match = message.match(pattern.regex);
      if (!match) continue;

      const content = pattern.formatter(match);

      if (dbActive && userId) {
        const existing = await Memory.findOne({ content });
        if (!existing) {
          await Memory.create({
            userId,
            content,
            category: pattern.category,
            importance: pattern.importance
          });
          console.log("[Memory] MongoDB saved:", content);
        }
      } else if (userId) {
        localStore.saveMemoryIfRelevant(message, userId);
      }
      break;
    }
  } catch (error) {
    console.warn("Memory save warning:", error.message);
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
        const dbActive = isDbConnected();
        const { message = "", history = [], systemInstruction, attachments = [], model = "gemini-2.5-flash" } = body;
        let userId = null;

        try {
          const decoded = verifyToken(req);
          userId = decoded.userId;
        } catch (error) {
          // Guest mode
        }

        let effectiveMessage = (message || "").trim();
        if (!effectiveMessage && Array.isArray(attachments) && attachments.length > 0) {
          effectiveMessage = "Please analyze this attachment in detail and explain what you see.";
        }

        if (!effectiveMessage) {
          return res.status(400).json({ error: "Message is required." });
        }

        await saveMemoryIfRelevant(effectiveMessage, userId, dbActive);

        const context = history
          .slice(-8)
          .map(item => `${item.type === "user" ? "User" : "NOVA"}: ${item.text}`)
          .join("\n");

        let memoryContext = "No memories stored.";

        try {
          if (dbActive && userId) {
            const memories = await Memory.find({ userId }).sort({ createdAt: -1 }).limit(20);
            if (memories.length > 0) {
              memoryContext = memories.map(m => `- ${m.content}`).join("\n");
            }
          } else if (userId) {
            const memories = localStore.findMemories(userId);
            if (memories.length > 0) {
              memoryContext = memories.map(m => `- ${m.content}`).join("\n");
            }
          }
        } catch (memoryError) {
          console.warn("Memory load warning:", memoryError.message);
        }

        // Format document/code attachments into system context
        let attachmentContext = "";
        const imageAttachments = [];

        if (Array.isArray(attachments)) {
          for (const att of attachments) {
            if (att.type === "image" || (att.mimeType && String(att.mimeType).startsWith("image/"))) {
              imageAttachments.push(att);
            } else if (att.content) {
              const ext = att.name ? String(att.name).split(".").pop() : "";
              attachmentContext += `\nAttached File [${att.name || "document"}]:\n\`\`\`${ext}\n${att.content}\n\`\`\`\n`;
            }
          }
        }

        const prompt = `
USER MEMORIES:

${memoryContext}

CONVERSATION HISTORY:

${context || "No previous context."}
${attachmentContext ? `\nATTACHED DOCUMENTS/CODE:\n${attachmentContext}\n` : ""}
CURRENT USER REQUEST:

${effectiveMessage}
`;

        const responseText = await callGemini(prompt, {
          systemInstruction: systemInstruction || "You are NOVA AI, a premium multimodal AI productivity assistant with vision and contextual memory. When files, code, or images are provided, thoroughly inspect and explain them in detail.",
          maxOutputTokens: 1200,
          attachments: imageAttachments,
          rawAttachments: attachments,
          model
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
          // Graceful fallback video preview when Hugging Face key is not set
          return res.status(200).json({
            useClientSideHf: false,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            message: "Hugging Face key not configured. Displaying demo video preview.",
            prompt,
            aspectRatio,
            duration,
            quality
          });
        }

        const DROPDOWN_TO_HF_MODEL = {
          "Wan-AI/Wan2.1-T2V-14B": "Wan-AI/Wan2.1-T2V-14B",
          "HunyuanVideo/HunyuanVideo": "tencent/HunyuanVideo",
          "genmo/mochi-1-preview": "genmo/mochi-1-preview",
          "THUDM/CogVideoX-5b": "zai-org/CogVideoX-5b"
        };
        const resolvedModel = DROPDOWN_TO_HF_MODEL[model] || model;

        console.log(`[Video API] Prompt: "${prompt}" | Model: ${resolvedModel}`);
        const submitUrl = `https://router.huggingface.co/hf-inference/models/${resolvedModel}:fastest`;

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
          `Create a daily productivity plan for:\n${input || "a focused productive day"}\n\nReturn only valid JSON in this shape:\n{"blocks":[{"time":"09:00 AM","title":"Deep work","text":"Specific recommendation"}]}\nUse 4 to 6 blocks.`,
          {
            systemInstruction: "You are NOVA AI's planner engine. Return strict JSON only.",
            responseMimeType: "application/json",
            jsonMode: true,
            maxOutputTokens: 900
          }
        );

        const parsed = safeJson(raw, { blocks: [] });
        const blocks = Array.isArray(parsed.blocks) && parsed.blocks.length
          ? parsed.blocks.slice(0, 6)
          : [
              { time: "09:00 AM", title: "Core Priority Work", text: `Start with the critical objective of: ${input || "the project"}` },
              { time: "11:30 AM", title: "NOVA AI Co-Pilot", text: "Synthesize specifications, draft content, and refine logic." },
              { time: "02:00 PM", title: "Execution Sprint", text: "Implement core milestones and test deliverables." },
              { time: "04:30 PM", title: "Review & Quality Assurance", text: "Verify edge cases, styling, and user experience." },
              { time: "06:00 PM", title: "Day Wrap-up", text: "Document completed milestones and map out tomorrow's plan." }
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
        const { generateWebsiteHtml } = require("./_lib/websiteBuilder");
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
