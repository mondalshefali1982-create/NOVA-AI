const { callGemini, getBody, handleOptions, requirePost, safeJson, sendError, setCors } = require("../_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  try {
    const { input = "" } = getBody(req);
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

    res.status(200).json({ blocks });
  } catch (error) {
    sendError(res, error);
  }
};
