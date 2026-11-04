const { getBody, handleOptions, requirePost, sendError, setCors } = require("./_lib/gemini");
const { callGemini, safeJson } = require("./_lib/gemini");
const connectDB = require("./_utils/db");
const { isDbConnected } = connectDB;
const Memory = require("./_models/Memory");
const localStore = require("./_utils/localStore");
const { verifyToken } = require("./_utils/auth");

const DEFAULT_VIDEO_MODEL = "alibaba/wan-2.2-fast";

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
          systemInstruction: systemInstruction || undefined,
          maxOutputTokens: 4096,
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
          model = DEFAULT_VIDEO_MODEL,
          aspectRatio = "16:9",
          duration = "5 seconds",
          quality = "Fast"
        } = body;

        if (!prompt.trim()) {
          return res.status(400).json({ error: "Prompt is required for video generation.", status: 400 });
        }

        // Map aspect ratio to pixel dimensions
        const dimMap = {
          "16:9": { width: 1024, height: 576 },
          "9:16": { width: 576, height: 1024 },
          "1:1": { width: 768, height: 768 }
        };
        const dim = dimMap[aspectRatio] || { width: 1024, height: 576 };

        const resolvedModel = model || DEFAULT_VIDEO_MODEL;
        console.log(`[Video API] Planning AI Cinematic Motion for: "${prompt.slice(0, 50)}..." | Model: ${resolvedModel}`);

        // Determine scene count based on duration
        let sceneCount = 1;
        if (duration.includes("10")) sceneCount = 2;
        else if (duration.includes("15")) sceneCount = 3;

        // Build authentic AI visual scene prompts
        const scenes = [];
        const baseSeed = Math.floor(Math.random() * 10000000);

        const sceneAngleDescriptors = [
          "wide establishing cinematic shot, full panoramic environment",
          "dynamic medium cinematic angle, focused action and motion",
          "dramatic close-up shot, intense cinematic lighting, high emotional focus"
        ];

        let styleModifiers = "cinematic lighting, 8k resolution, photorealistic, 35mm film still, masterpiece, Unreal Engine 5 render, highly detailed";
        if (resolvedModel.includes("veo") || resolvedModel.includes("google")) {
          styleModifiers = "Google DeepMind Veo cinematic style, hyper-realistic, volumetric god-rays, soft natural lighting, IMAX 70mm, award-winning cinematography";
        } else if (resolvedModel.includes("seedance") || resolvedModel.includes("bytedance")) {
          styleModifiers = "ByteDance Seedance dynamic motion aesthetic, fluid cinematic framing, vibrant colors, sharp textures, high frame clarity";
        } else if (resolvedModel.includes("kling")) {
          styleModifiers = "Kuaishou Kling realism, realistic physical lighting, shallow depth of field, anamorphic lens flare, filmic color grading";
        }

        for (let i = 0; i < sceneCount; i++) {
          const sceneAngle = sceneAngleDescriptors[i] || sceneAngleDescriptors[0];
          const scenePrompt = `${prompt.trim()}, ${sceneAngle}, ${styleModifiers}`;
          const sceneSeed = baseSeed + (i * 777);
          const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(scenePrompt)}?width=${dim.width}&height=${dim.height}&seed=${sceneSeed}&nologo=true`;

          scenes.push({
            index: i + 1,
            title: `Scene ${i + 1}: ${i === 0 ? "Establishing Shot" : i === 1 ? "Action Shot" : "Climax"}`,
            prompt: scenePrompt,
            imageUrl,
            motion: i % 2 === 0 ? "dolly_in" : "pan_drift"
          });
        }

        return res.status(200).json({
          success: true,
          engine: "NOVA AI Cinematic Motion Studio",
          mode: "cinematic_motion",
          prompt: prompt.trim(),
          model: resolvedModel,
          aspectRatio,
          duration,
          quality,
          width: dim.width,
          height: dim.height,
          scenes,
          message: "AI visuals planned and staged for cinematic camera rendering."
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
