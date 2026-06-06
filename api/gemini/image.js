const { callGemini, escapeXml, getBody, handleOptions, requirePost, safeJson, sendError, setCors } = require("../_lib/gemini");

function createSvgDataUrl({ title, prompt, palette }) {
  const safeTitle = escapeXml(title || "NOVA AI Visual");
  const safePrompt = escapeXml(prompt || "Futuristic AI startup visual");
  const colors = Array.isArray(palette) && palette.length >= 2 ? palette : ["#6C63FF", "#00D4FF"];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#060816"/>
          <stop offset="0.48" stop-color="${escapeXml(colors[0])}"/>
          <stop offset="1" stop-color="${escapeXml(colors[1])}"/>
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="18" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="1024" height="768" fill="url(#bg)"/>
      <circle cx="780" cy="150" r="210" fill="#00D4FF" opacity="0.18" filter="url(#glow)"/>
      <circle cx="210" cy="610" r="250" fill="#8B5CF6" opacity="0.22" filter="url(#glow)"/>
      <rect x="70" y="80" width="884" height="608" rx="38" fill="#0B1020" opacity="0.72" stroke="#00D4FF" stroke-opacity="0.42"/>
      <text x="110" y="165" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="54" font-weight="800">${safeTitle}</text>
      <foreignObject x="110" y="215" width="804" height="360">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:white;font-family:Arial,sans-serif;font-size:32px;line-height:1.35">${safePrompt}</div>
      </foreignObject>
      <text x="110" y="640" fill="#00D4FF" font-family="Arial, sans-serif" font-size="26" font-weight="700">Generated visual brief by NOVA AI + Gemini 2.0 Flash</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  try {
    const { prompt = "", type = "visual" } = getBody(req);
    const raw = await callGemini(
      `Create a premium image-generation brief for a ${type}.\nUser prompt: ${prompt}\nReturn only JSON: {"title":"short title","prompt":"detailed visual prompt","palette":["#6C63FF","#00D4FF"]}`,
      {
        systemInstruction: "You are NOVA AI's visual director. Return strict JSON only.",
        responseMimeType: "application/json",
        maxOutputTokens: 700
      }
    );

    const concept = safeJson(raw, {
      title: "NOVA AI Visual",
      prompt: prompt || "Futuristic premium AI startup graphic with neon blue and purple glow.",
      palette: ["#6C63FF", "#00D4FF"]
    });

    res.status(200).json({
      url: createSvgDataUrl(concept),
      prompt: concept.prompt,
      title: concept.title
    });
  } catch (error) {
    sendError(res, error);
  }
};
