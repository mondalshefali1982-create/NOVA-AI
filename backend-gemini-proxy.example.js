// Example only. Deploy this as a serverless function, not on GitHub Pages.
// Store GEMINI_API_KEY as a backend environment variable.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-1.5-flash";

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  if (!response.ok) {
    throw new Error("Gemini request failed.");
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function handleChat(request) {
  const { message, history = [] } = await request.json();
  const context = history.map((item) => `${item.type}: ${item.text}`).join("\n");
  const text = await callGemini(`You are NOVA AI.\n${context}\nUser: ${message}`);
  return Response.json({ text });
}

export async function handleDocument(request) {
  const { type, input } = await request.json();
  const text = await callGemini(`Create a polished ${type} for this request:\n${input}`);
  return Response.json({ text });
}

export async function handlePlanner(request) {
  const { input } = await request.json();
  const text = await callGemini(`Create a concise daily plan for:\n${input}`);
  return Response.json({
    blocks: [
      ["09:00", "Priority sprint", text.slice(0, 140)],
      ["11:00", "AI support", "Use NOVA to draft, summarize, or refine the next asset."],
      ["14:00", "Execution", "Complete the most visible deliverable."],
      ["17:00", "Review", "Review outcomes and save reusable prompts."]
    ]
  });
}
