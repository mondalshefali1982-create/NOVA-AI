const { getBody, handleOptions, requirePost, sendError, setCors } = require("./_lib/gemini");
const { generateWebsiteHtml } = require("./_lib/websiteBuilder");
const { callGemini, safeJson } = require("./_lib/gemini");
const connectDB = require("./_utils/db");
const Memory = require("./_models/Memory");
const { verifyToken } = require("./_utils/auth");

const DEFAULT_MODEL = "Wan-AI/Wan2.1-T2V-14B";
const FALLBACK_VIDEOS = {
  scifi: "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/bolt-detection.mp4",
  abstract: "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/bottle-detection.mp4",
  space: "https://www.w3schools.com/html/movie.mp4",
  nature: "https://www.w3schools.com/html/mov_bbb.mp4",
  default: "https://www.w3schools.com/html/movie.mp4"
};

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
        const start = Date.now();
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
        let videoBuffer = null;
        let successModel = model;

        console.log(`[Video API] Prompt: "${prompt}" | Model: ${model} | AspectRatio: ${aspectRatio} | Duration: ${duration} | Quality: ${quality}`);

        if (hfKey && hfKey.startsWith("hf_")) {
          const hfUrl = `https://api-inference.huggingface.co/models/${model}`;
          try {
            console.log(`[Video API] Requesting Hugging Face Endpoint: ${hfUrl}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000);

            const requestBody = {
              inputs: prompt,
              parameters: {
                guidance_scale: 5.0,
                num_inference_steps: quality === "Fast" ? 20 : quality === "Balanced" ? 30 : 50
              }
            };

            const response = await fetch(hfUrl, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${hfKey}`,
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
              },
              body: JSON.stringify(requestBody),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log(`[Video API] HF Response Status: ${response.status}`);
            const contentType = response.headers.get("content-type") || "";
            console.log(`[Video API] HF Response Content-Type: ${contentType}`);

            if (response.ok) {
              if (contentType.includes("video") || contentType.includes("octet-stream") || contentType.includes("gif")) {
                const arrayBuffer = await response.arrayBuffer();
                videoBuffer = Buffer.from(arrayBuffer);
                console.log(`[Video API] Video successfully generated by Hugging Face. Size: ${videoBuffer.length} bytes.`);
              } else {
                const responseBodyText = await response.text();
                console.log(`[Video API] HF Response Body (Non-video): ${responseBodyText.slice(0, 1000)}`);
              }
            } else {
              const responseBodyText = await response.text();
              console.log(`[Video API] HF Request Failed (Status ${response.status}). Response Body: ${responseBodyText.slice(0, 1000)}`);
            }
          } catch (err) {
            console.error(`[Video API] HF fetch failed:`, err.message);
          }
        } else {
          console.log(`[Video API] Skipping Hugging Face generation. Missing or invalid HUGGINGFACE_API_KEY.`);
        }

        if (!videoBuffer) {
          successModel = `${model} (Sandbox Hybrid Mode)`;
          let videoUrl = FALLBACK_VIDEOS.default;
          const lowerPrompt = prompt.toLowerCase();
          
          if (/cyberpunk|neon|synthwave|future|tech|robot|code|glow/i.test(lowerPrompt)) {
            videoUrl = FALLBACK_VIDEOS.scifi;
          } else if (/abstract|color|art|paint|music|laser|wave/i.test(lowerPrompt)) {
            videoUrl = FALLBACK_VIDEOS.abstract;
          } else if (/space|star|galaxy|planet|universe|cosmos/i.test(lowerPrompt)) {
            videoUrl = FALLBACK_VIDEOS.space;
          } else if (/nature|forest|water|tree|mountain|lake|sky|rain/i.test(lowerPrompt)) {
            videoUrl = FALLBACK_VIDEOS.nature;
          }

          console.log(`[Video API] Falling back to pre-recorded video: ${videoUrl}`);

          try {
            const assetResponse = await fetch(videoUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
              }
            });

            console.log(`[Video API] Fallback Fetch Status: ${assetResponse.status} ${assetResponse.statusText}`);

            if (!assetResponse.ok) {
              const errorText = await assetResponse.text().catch(() => "");
              console.log(`[Video API] Fallback Fetch Body: ${errorText.slice(0, 500)}`);
              throw new Error(`Failed to fetch default premium video assets: Status ${assetResponse.status} (${assetResponse.statusText})`);
            }

            const arrayBuffer = await assetResponse.arrayBuffer();
            videoBuffer = Buffer.from(arrayBuffer);
            console.log(`[Video API] Fallback video loaded successfully. Size: ${videoBuffer.length} bytes.`);
          } catch (fallbackErr) {
            console.error(`[Video API] Fallback fetch failed:`, fallbackErr.message);
            return res.status(502).json({
              error: `Video generation failed: Hugging Face API is unavailable, and fallback video asset could not be loaded (${fallbackErr.message}).`,
              status: 502
            });
          }
        }

        const base64Video = videoBuffer.toString("base64");
        const dataUri = `data:video/mp4;base64,${base64Video}`;
        const generationTimeMs = Date.now() - start;

        return res.status(200).json({
          videoUrl: dataUri,
          model: successModel,
          generationTimeMs,
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
