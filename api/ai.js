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

        // Resolve authentication: prefer FAL_KEY, fall back to HUGGINGFACE_API_KEY via HF router
        const falKey = process.env.FAL_KEY;
        const hfKey = process.env.HUGGINGFACE_API_KEY;

        if (!falKey && !hfKey) {
          return res.status(400).json({
            error: "Video generation requires either FAL_KEY or HUGGINGFACE_API_KEY environment variable.",
            status: 400
          });
        }

        // Dropdown model ID to standard Hugging Face model ID mapping
        const DROPDOWN_TO_HF_MODEL = {
          "Wan-AI/Wan2.1-T2V-14B": "Wan-AI/Wan2.1-T2V-14B",
          "HunyuanVideo/HunyuanVideo": "tencent/HunyuanVideo",
          "THUDM/CogVideoX-5b": "THUDM/CogVideoX-5b",
          "stabilityai/stable-video-diffusion-img2vid-xt": "stabilityai/stable-video-diffusion-img2vid-xt",
          "Lightworks/LTX-Video": "Lightworks/LTX-Video"
        };
        const resolvedModel = DROPDOWN_TO_HF_MODEL[model] || model;

        // If using HUGGINGFACE_API_KEY, return the configuration to the client
        // so it can execute the long-running query directly to bypass Vercel's 10s timeout
        if (hfKey && !falKey) {
          console.log(`[Video API] Handing off to client-side HF router for model: ${resolvedModel}`);
          return res.status(200).json({
            useClientSideHf: true,
            hfToken: hfKey,
            model: resolvedModel,
            prompt,
            aspectRatio,
            duration,
            quality
          });
        }

        // Otherwise, run direct fal.ai queue-based flow on the backend (using FAL_KEY)
        const MODEL_TO_FAL = {
          "Wan-AI/Wan2.1-T2V-14B": "fal-ai/wan-t2v",
          "Wan-AI/Wan2.2-TI2V-5B": "fal-ai/wan/v2.2/text-to-video",
          "tencent/HunyuanVideo": "fal-ai/hunyuan-video",
          "genmo/mochi-1-preview": "fal-ai/mochi-v1",
          "fal-ai/wan-t2v": "fal-ai/wan-t2v",
          "fal-ai/ltx-video": "fal-ai/ltx-video"
        };

        const falModelId = MODEL_TO_FAL[resolvedModel] || MODEL_TO_FAL[DEFAULT_MODEL];
        const queueBaseUrl = `https://queue.fal.run/${falModelId}`;
        const authHeader = `Key ${falKey}`;

        console.log(`[Video API] Direct FAL.ai Prompt: "${prompt}" | Model: ${resolvedModel} | FalModel: ${falModelId}`);

        try {
          // ── Step 1: Submit to queue ──────────────────────────────────────
          const submitBody = {
            prompt: prompt,
            num_inference_steps: quality === "Fast" ? 20 : quality === "Balanced" ? 30 : 50,
            guidance_scale: 5.0,
            enable_safety_checker: false
          };

          const submitResponse = await fetch(queueBaseUrl, {
            method: "POST",
            headers: {
              "Authorization": authHeader,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(submitBody)
          });

          if (!submitResponse.ok) {
            const errorText = await submitResponse.text();
            console.error(`[Video API] Submit failed: ${errorText}`);
            let parsedError = errorText;
            try { parsedError = JSON.parse(errorText).detail || JSON.parse(errorText).error || errorText; } catch {}
            return res.status(submitResponse.status).json({
              error: `Video generation submit failed (${submitResponse.status}): ${parsedError}`,
              status: submitResponse.status
            });
          }

          const submitData = await submitResponse.json();

          // If the response already contains a video (synchronous result), return immediately
          if (submitData.video?.url || submitData.output?.video?.url) {
            const videoUrl = submitData.video?.url || submitData.output?.video?.url;
            const generationTimeMs = Date.now() - start;
            return res.status(200).json({
              videoUrl,
              model: resolvedModel,
              generationTimeMs,
              prompt,
              aspectRatio,
              duration,
              quality
            });
          }

          // ── Step 2: Poll for completion ────────────────────────────────
          const requestId = submitData.request_id;
          if (!requestId) {
            console.error(`[Video API] No request_id in submit response:`, JSON.stringify(submitData));
            return res.status(502).json({
              error: "Video generation service did not return a request ID. Response: " + JSON.stringify(submitData).slice(0, 300),
              status: 502
            });
          }

          const statusUrl = `${queueBaseUrl}/requests/${requestId}/status`;
          const resultUrl = `${queueBaseUrl}/requests/${requestId}`;
          // For polling, always use direct fal.ai auth if available, otherwise HF auth
          const pollAuthHeader = falKey ? `Key ${falKey}` : `Bearer ${hfKey}`;

          console.log(`[Video API] Request queued. ID: ${requestId}. Polling for completion...`);

          const MAX_POLL_TIME_MS = 240000; // 4 minutes max
          const POLL_INTERVAL_MS = 3000;   // Poll every 3 seconds
          const pollStart = Date.now();

          while (Date.now() - pollStart < MAX_POLL_TIME_MS) {
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

            try {
              const statusResponse = await fetch(statusUrl, {
                method: "GET",
                headers: { "Authorization": pollAuthHeader }
              });

              if (!statusResponse.ok) {
                const errText = await statusResponse.text();
                console.warn(`[Video API] Status poll error (${statusResponse.status}): ${errText}`);
                continue;
              }

              const statusData = await statusResponse.json();
              const queueStatus = statusData.status;
              console.log(`[Video API] Poll status: ${queueStatus} (${Math.round((Date.now() - start) / 1000)}s elapsed)`);

              if (queueStatus === "COMPLETED") {
                break;
              }

              if (queueStatus === "FAILED") {
                const failError = statusData.error || "Video generation failed on the provider side.";
                console.error(`[Video API] Generation FAILED:`, failError);
                return res.status(500).json({
                  error: `Video generation failed: ${failError}`,
                  status: 500
                });
              }
              // IN_QUEUE or IN_PROGRESS: continue polling
            } catch (pollErr) {
              console.warn(`[Video API] Poll fetch error: ${pollErr.message}`);
            }
          }

          // ── Step 3: Retrieve the result ────────────────────────────────
          console.log(`[Video API] Fetching result from: ${resultUrl}`);

          const resultResponse = await fetch(resultUrl, {
            method: "GET",
            headers: { "Authorization": pollAuthHeader }
          });

          if (!resultResponse.ok) {
            const errText = await resultResponse.text();
            console.error(`[Video API] Result fetch failed (${resultResponse.status}): ${errText}`);
            return res.status(resultResponse.status).json({
              error: `Failed to retrieve generated video: ${errText}`,
              status: resultResponse.status
            });
          }

          const resultData = await resultResponse.json();
          console.log(`[Video API] Result data keys:`, Object.keys(resultData));

          const videoUrl = resultData.video?.url || resultData.output?.video?.url || resultData.data?.video?.url;

          if (!videoUrl) {
            console.error(`[Video API] No video URL in result:`, JSON.stringify(resultData).slice(0, 500));
            return res.status(502).json({
              error: "Video generation completed but no video URL was returned. Result: " + JSON.stringify(resultData).slice(0, 300),
              status: 502
            });
          }

          const generationTimeMs = Date.now() - start;
          console.log(`[Video API] Success! Video URL: ${videoUrl.slice(0, 100)}... | Time: ${generationTimeMs}ms`);

          return res.status(200).json({
            videoUrl,
            model,
            generationTimeMs,
            prompt,
            aspectRatio,
            duration,
            quality
          });
        } catch (err) {
          console.error(`[Video API] Unhandled error:`, err.message, err.stack);
          return res.status(500).json({
            error: `Video generation failed: ${err.message}`,
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
