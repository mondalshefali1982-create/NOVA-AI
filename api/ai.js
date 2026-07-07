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
        if (!hfKey || !hfKey.startsWith("hf_")) {
          return res.status(400).json({
            error: "Hugging Face API key is missing or invalid. Please set the HUGGINGFACE_API_KEY environment variable.",
            status: 400
          });
        }

        const hfUrl = `https://api-inference.huggingface.co/models/${model}`;
        console.log(`[Video API] Prompt: "${prompt}" | Model: ${model} | AspectRatio: ${aspectRatio} | Duration: ${duration} | Quality: ${quality}`);
        console.log(`[Video API] Requesting Hugging Face: ${hfUrl}`);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);

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
          console.log(`[Video API] HF Content-Type: ${contentType}`);

          if (!response.ok) {
            const errorText = await response.text();
            console.log(`[Video API] HF Error Body: ${errorText}`);
            let parsedError = errorText;
            try {
              const errJson = JSON.parse(errorText);
              parsedError = errJson.error || errorText;
            } catch {}
            return res.status(response.status).json({
              error: `Hugging Face generation failed: ${parsedError}`,
              status: response.status
            });
          }

          if (!contentType.includes("video") && !contentType.includes("octet-stream") && !contentType.includes("gif") && !contentType.includes("image")) {
            const responseText = await response.text();
            console.log(`[Video API] Non-video body returned: ${responseText}`);
            return res.status(502).json({
              error: `Hugging Face returned invalid media content-type (${contentType}): ${responseText.slice(0, 500)}`,
              status: 502
            });
          }

          const arrayBuffer = await response.arrayBuffer();
          const videoBuffer = Buffer.from(arrayBuffer);
          console.log(`[Video API] Generation successful. Size: ${videoBuffer.length} bytes.`);

          const base64Video = videoBuffer.toString("base64");
          const mimeType = contentType.includes("gif") ? "image/gif" : contentType.includes("image") ? contentType : "video/mp4";
          const dataUri = `data:${mimeType};base64,${base64Video}`;
          const generationTimeMs = Date.now() - start;

          return res.status(200).json({
            videoUrl: dataUri,
            model,
            generationTimeMs,
            prompt,
            aspectRatio,
            duration,
            quality
          });
        } catch (err) {
          console.error(`[Video API] Fetch execution failed:`, err.message);
          return res.status(500).json({
            error: `Video generation connection failed: ${err.message}`,
            status: 500
          });
        }
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
