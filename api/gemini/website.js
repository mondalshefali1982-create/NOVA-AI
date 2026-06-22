const { callGemini, getBody, handleOptions, requirePost, safeJson, sendError, setCors } = require("../_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  try {
    const { prompt = "", type = "Landing Page" } = getBody(req);

    if (!prompt.trim()) {
      return res.status(400).json({
        error: "Website description is required.",
        status: 400
      });
    }

    const enhancedPrompt = `
Create a complete ${type} from this user request:
${prompt}

Automatically infer the design style, branding, color palette, layout direction, visual tone, and animations from the user's words.

Requirements:
- Responsive design
- Mobile-first layout
- Modern UI/UX
- Professional styling
- Clean code structure
- Accessibility support
- SEO-friendly HTML
- Production-ready code
- Smooth animations
- High-quality user experience
- Semantic HTML
- Clean CSS
- Vanilla JavaScript only
- No external paid APIs
- No markdown fences

Return only valid JSON in this exact shape:
{
  "html": "complete index.html code",
  "css": "complete style.css code",
  "js": "complete script.js code"
}
`;

    const raw = await callGemini(enhancedPrompt, {
      systemInstruction:
        "You are NOVA AI's senior website generator. Return strict JSON only with production-ready HTML, CSS, and vanilla JavaScript. Do not include markdown.",
      responseMimeType: "application/json",
      maxOutputTokens: 6000
    });

    const project = parseWebsiteProject(raw);

    if (!project?.html || !project?.css) {
      return res.status(502).json({
        error: "NOVA could not generate a valid website project. Please try again.",
        status: 502
      });
    }

    res.status(200).json({
      html: project.html,
      css: project.css,
      js: project.js || ""
    });
  } catch (error) {
    sendError(res, error);
  }
};

function parseWebsiteProject(raw) {
  const direct = safeJson(raw, null);
  if (direct?.html && direct?.css) return direct;

  const jsonMatch = String(raw || "").match(/\{[\s\S]*\}/);
  return jsonMatch ? safeJson(jsonMatch[0], null) : null;
}
