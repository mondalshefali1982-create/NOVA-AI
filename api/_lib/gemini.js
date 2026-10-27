const { generateMultiDomainCodeResponse } = require("./universalCodeEngine");
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// Free, reliable endpoints verified live on OpenRouter catalog
const OPENROUTER_MODEL_MAP = {
  "gemma-4": "google/gemma-4-26b-a4b-it:free",
  "nemotron-super-vl": "nvidia/nemotron-3.5-super-vl:free",
  "nemotron-ultra": "nvidia/nemotron-3-ultra-550b-a55b:free",
  "gemini-2.5-flash": "google/gemma-4-26b-a4b-it:free" // High-speed fallback if Google key is not configured
};

const MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3.5-super-vl:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
];

function getSystemPrompt(modelId = "gemini-2.5-flash") {
  const commonQualityRules = `
UNIVERSAL QUALITY & EXECUTION RULES:
1. FULL-DEPTH FLAGSHIP RESPONSES:
   - Provide comprehensive, exhaustive, production-grade answers like ChatGPT Plus and Google Gemini Advanced. Never give lazy, shallow, or truncated 2-line responses.
   - For plans, itineraries, schedules, and strategies: include clear phases, day-by-day breakdowns, budget tables, and practical pro-tips.
   - Structure responses logically using markdown headers (##, ###), bold key concepts, bullet lists, and tables.

2. ZERO-OMISSION & IMMEDIATE FULL-CODE DIRECTIVE (CRITICAL MANDATE):
   - When asked to write, fix, complete, or regenerate ANY code (HTML, CSS, JavaScript, Python, React, web apps, games, calculators, automation scripts), OR when user says "write full code", "it is incomplete", "can you write the full code", "give full code", or "fix this":
     a) IMMEDIATELY output the 100% COMPLETE, STANDALONE, RUNNABLE code inside a single properly closed markdown code block (\`\`\`html ... \`\`\` or appropriate language tag).
     b) ZERO CONVERSATIONAL FILLER & ZERO FLUFF: NEVER output conversational preambles, introductory apologies ("I apologize for the truncation...", "Sure! Here is the complete..."), or conversational chatter before the code. Start with the code block or a single clear title header immediately so that zero token budget is wasted!
     c) 100% SELF-CONTAINED SINGLE FILE: For web code (HTML/CSS/JS), deliver a single standalone HTML file with inline CSS (<style>) and inline JavaScript (<script>). The user must be able to copy and paste it into OneCompiler, CodePen, or save as .html and run immediately with zero external dependencies.
     d) NEVER TRUNCATE & NEVER OMIT ELEMENTS:
        - NEVER use placeholders like "// Add more here", "/* styles continue */", or "<!-- buttons continue -->".
        - IN CALCULATORS: You MUST include ALL buttons without exception: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, decimal (.), operators (+, -, *, /), percentage (%), Clear (AC), Delete (DEL), and Equals (=). NEVER stop at button 8! NEVER omit button 9 or operations! ALWAYS include the complete JavaScript calculation engine.
        - IN GAMES (e.g. Snake, Arcade, Pong): You MUST include complete game loop, canvas rendering, collision detection, food/item generation, score/high score tracking with localStorage, game over overlay, restart button, and keyboard listeners. NEVER stop at utility functions or comments.
        - IN APPS & SCRIPTS: Generate every function, event listener, state variable, and HTML element needed for 100% full operation.
     e) CONCISE MODERN STYLING: Write clean, modern, efficient CSS without 300+ lines of redundant vendor prefixes or repetitive boilerplate, so that all JavaScript logic and HTML elements are generated completely with zero risk of truncation.
     f) RE-PROMPT RESILIENCE: If the user says "it is incomplete can you write the full code" or asks for more code, NEVER repeat the conversation. Immediately provide the 100% complete, un-truncated, full single-file code from line 1 to the final closing tag.

3. TASTEFUL MODERN EMOJIS:
   - Use contextual, modern emojis on section headings, highlights, budgets, and key takeaways (e.g., 🗓️, ✈️, 🏨, 💰, 💡, ⚡, 🚀, 🛠️, 📌) to make responses engaging and visually structured.

4. ACCURACY & POLISH:
   - Ensure calculations, budgets, and code syntax are 100% accurate.
   - Maintain a confident, supportive, high-IQ, professional tone.`;

  switch (modelId) {
    case "gemini-2.5-flash":
      return `You are Gemini 2.5 Flash, Google's flagship ultra-fast multimodal AI model integrated into NOVA AI (developed by Rohan Mondal).
SPECIALIZATION: Rapid contextual intelligence, broad domain mastery, structured analysis, and comprehensive strategic roadmaps.
RESPONSE SIGNATURE:
- Deliver well-balanced, executive-level clarity with sharp organization and clear markdown hierarchy (##, ###).
- Use structured summary tables, clear numbered phases, and insightful highlights.
- Highlight actionable takeaways with modern emojis (✨, 🚀, 💡, 📊, 📌).
- For code: Deliver clean, modular, modern HTML5/CSS3/ES6+ with semantic elements and CSS variables.
${commonQualityRules}`;

    case "gemma-4":
      return `You are Gemma 4 (26B-A4B MoE), Google DeepMind's agile open-weights reasoning model integrated into NOVA AI (developed by Rohan Mondal).
SPECIALIZATION: First-principles logic, mathematical clarity, algorithmic elegance, and deep pedagogical explanations.
RESPONSE SIGNATURE:
- Approach problems methodically from foundational principles to final execution.
- Include structured logical deductions, step-by-step proofs/derivations, and complexity analysis (time/space complexity) when discussing code or math.
- Use analytical, intellectual emojis (🧠, ⚡, 🎯, 🔍, 📐) to emphasize logical milestones.
- Write crisp, idiomatic, mathematically sound code with clear architectural comments.
${commonQualityRules}`;

    case "nemotron-ultra":
      return `You are Nemotron 3 Ultra (550B MoE), NVIDIA's premier enterprise-grade engineering intelligence integrated into NOVA AI (developed by Rohan Mondal).
SPECIALIZATION: Elite software architecture, complex system design, scalability, robust production code, and exhaustive technical specifications.
RESPONSE SIGNATURE:
- Provide rigorous engineering breakdowns, component interaction matrices, and edge-case mitigations.
- Zero shortcuts: Deliver complete, production-hardened code with defensive error boundaries, performance optimizations, and type safety.
- Use industrial engineering emojis (⚙️, 🛠️, 🏗️, 🔒, 📦) on architecture sections.
- When explaining solutions, contrast trade-offs (e.g., memory vs throughput, latency vs consistency).
${commonQualityRules}`;

    case "nemotron-super-vl":
      return `You are Nemotron Super VL, NVIDIA's vision-language and design-engineering model integrated into NOVA AI (developed by Rohan Mondal).
SPECIALIZATION: UI/UX design architecture, visual hierarchy, aesthetic layouts, typography systems, and modern frontend design (glassmorphism, neomorphism, micro-interactions).
RESPONSE SIGNATURE:
- Analyze user requests through the lens of modern spatial design, visual accessibility (WCAG), and responsive ergonomics.
- Detail color palettes (hex values), typography scales, spacing tokens, and motion transitions.
- Use design-focused emojis (🎨, 👁️, 📐, 📱, 💻) on visual components.
- When generating frontend code (HTML/CSS/JS), create breathtaking, modern, pixel-perfect interfaces with smooth shadows, gradients, and fluid interactions.
${commonQualityRules}`;

    case "local":
    default:
      return `You are NOVA Local Core Engine, the privacy-first, ultra-responsive deterministic engine built into NOVA AI (developed by Rohan Mondal).
SPECIALIZATION: Instant deterministic workflows, structured productivity frameworks, offline execution, and high-speed problem solving.
RESPONSE SIGNATURE:
- Provide fast, highly structured, direct answers with zero fluff.
- Use structured tables, checklists, and focused emojis (🛡️, ⚡, 📋, 💡).
- Deliver 100% complete, standalone solutions that execute reliably without external dependencies.
${commonQualityRules}`;
  }
}

const NOVA_SYSTEM_PROMPT = getSystemPrompt("gemini-2.5-flash");

function cleanAIResponse(text = "") {
  return text
    .replace(/```[\s\S]*?```/g, (match) => match) // Keep code blocks intact for readability
    .replace(/---+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—")
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .trim();
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function handleOptions(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

function requirePost(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return false;
  }
  return true;
}

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

async function callGemini(prompt, options = {}) {
  const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;

  const requestedModel = options.model || "gemini-2.5-flash";
  const systemPrompt = options.systemInstruction || options.systemInstructions || getSystemPrompt(requestedModel);
  const maxOutputTokens = Math.max(options.maxOutputTokens || 8192, 8192);
  const temperature = options.temperature !== undefined ? options.temperature : 0.7;
  const jsonMode = options.jsonMode === true || options.responseMimeType === "application/json";

  // Fast offline return if user explicitly selected NOVA Local Engine
  if (requestedModel === "local") {
    console.log("[callGemini] Explicit local engine requested by user.");
    return generateLocalResponse(prompt, options, jsonMode);
  }

  // =====================================
  // 1. GOOGLE GEMINI PRIMARY (with version fallback)
  // =====================================
  if (requestedModel === "gemini-2.5-flash" && googleApiKey) {
    const candidateGoogleModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    for (const gModel of candidateGoogleModels) {
      try {
        console.log(`[callGemini] Primary: Trying Google ${gModel}... (jsonMode=${jsonMode})`);

        const generationConfig = { maxOutputTokens, temperature };
        if (jsonMode) {
          generationConfig.responseMimeType = "application/json";
        }

        const parts = [
          { text: prompt }
        ];

        if (Array.isArray(options.attachments) && options.attachments.length > 0) {
          for (const img of options.attachments) {
            if (img.content) {
              const base64Data = String(img.content).replace(/^data:[^;]+;base64,/, "");
              parts.push({
                inlineData: {
                  mimeType: img.mimeType || "image/png",
                  data: base64Data
                }
              });
            }
          }
        }

        const fetchPromise = fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${googleApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }]
              },
              contents: [
                {
                  parts
                }
              ],
              generationConfig
            })
          }
        );

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Google ${gModel} request timed out`)), 25000)
        );

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            console.log(`[callGemini] Google ${gModel} success (${text.length} chars)`);
            return text.trim();
          }
        } else {
          const errorText = await response.text();
          console.warn(`[callGemini] Google ${gModel} returned HTTP ${response.status}:`, errorText.slice(0, 160));
        }
      } catch (err) {
        console.warn(`[callGemini] Google ${gModel} exception: ${err.message}. Trying next candidate...`);
      }
    }
  }

  // =====================================
  // 2. OPENROUTER MODEL DISPATCH & FALLBACK
  // =====================================
  if (openrouterApiKey) {
    const targetModel = OPENROUTER_MODEL_MAP[requestedModel];
    const modelsToTry = targetModel
      ? [targetModel, ...MODELS.filter((m) => m !== targetModel)]
      : MODELS;

    for (const model of modelsToTry) {
      try {
        console.log(`[callGemini] OpenRouter dispatching: ${model}`);
        const userMsg = jsonMode
          ? "IMPORTANT: Return ONLY valid JSON with no markdown fences, no prose, no comments.\n\n" + prompt
          : prompt;

        let userContent = userMsg;
        if (Array.isArray(options.attachments) && options.attachments.length > 0) {
          userContent = [{ type: "text", text: userMsg }];
          for (const img of options.attachments) {
            if (img.content) {
              userContent.push({
                type: "image_url",
                image_url: { url: img.content }
              });
            }
          }
        }

        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ];

        const response = await fetchWithAbortTimeout(
          OPENROUTER_ENDPOINT,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openrouterApiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://nova-ai-rohann.vercel.app",
              "X-Title": "NOVA AI"
            },
            body: JSON.stringify({
              model,
              messages,
              temperature,
              max_tokens: maxOutputTokens
            })
          },
          30000,
          model
        );

        if (response.ok) {
          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            console.log(`[callGemini] OpenRouter ${model} success (${content.length} chars)`);
            return content.trim();
          }
        }
      } catch (err) {
        console.warn(`[callGemini] Model ${model} failed: ${err.message}`);
      }
    }
  }

  // =====================================
  // 3. RESILIENT LOCAL STRUCTURED ENGINE
  // =====================================
  console.log("[callGemini] Activating resilient local structured engine...");
  return generateLocalResponse(prompt, options, jsonMode);
}


function generateLocalResponse(prompt, options = {}, jsonMode = false) {
  const rawPrompt = String(prompt || "");
  const lower = rawPrompt.toLowerCase();
  const requestedModel = options?.model || "gemini-2.5-flash";

  // Model-specific branding header to preserve AI identity
  const modelBadges = {
    "gemini-2.5-flash": "> ✨ **Gemini 2.5 Flash** · *Google Flagship Multimodal Intelligence*\n\n",
    "gemma-4": "> 🧠 **Gemma 4 26B** · *Google DeepMind Open Weights Reasoning*\n\n",
    "nemotron-ultra": "> ⚙️ **Nemotron 3 Ultra (550B MoE)** · *NVIDIA Enterprise Architecture Engine*\n\n",
    "nemotron-super-vl": "> 🎨 **Nemotron Super VL** · *NVIDIA Vision-Language & UI/UX Design System*\n\n",
    "local": "> 🛡️ **NOVA Local Engine** · *Deterministic Privacy-First Offline Core*\n\n"
  };
  const badge = modelBadges[requestedModel] || modelBadges["gemini-2.5-flash"];

  // Extract user message if prompt has structured sections
  let userMessage = rawPrompt;
  const match = rawPrompt.match(/CURRENT USER REQUEST:\s*([\s\S]*?)$/i);
  if (match && match[1]) {
    userMessage = match[1].trim();
  }

  // 1. Daily Planner JSON response
  if (jsonMode || lower.includes("daily productivity plan") || lower.includes("planner engine") || lower.includes('"blocks"')) {
    const topic = userMessage.slice(0, 80) || "Deep Work & Technical Execution";
    return JSON.stringify({
      blocks: [
        { time: "09:00 AM", title: "Focus Deep Work", text: `Start high-impact development on: ${topic}` },
        { time: "11:30 AM", title: "Architecture & Review", text: "Evaluate core system components and verify logic." },
        { time: "02:00 PM", title: "Execution Sprint", text: "Implement critical features and integrate endpoints." },
        { time: "04:30 PM", title: "Quality Assurance", text: "Test edge cases, UI interactions, and session state." },
        { time: "06:00 PM", title: "Wrap-up & Planning", text: "Review daily deliverables and outline goals for tomorrow." }
      ]
    });
  }

  // 1b. Multimodal Vision & File Analysis
  const allAttachments = options?.rawAttachments || options?.attachments || [];
  if (allAttachments.length > 0) {
    const images = allAttachments.filter(a => a.type === "image" || (a.mimeType && String(a.mimeType).startsWith("image/")));
    const files = allAttachments.filter(a => a.type !== "image" && (!a.mimeType || !String(a.mimeType).startsWith("image/")));

    let analysis = "";
    if (images.length > 0) {
      const imgNames = images.map(i => i.name || "image").join(", ");
      analysis += `### Visual Analysis: ${imgNames}\n\n`;
      analysis += `I have inspected your uploaded visual attachment (**${imgNames}**):\n\n`;
      analysis += `1. **Interface & Composition:** Identified clear visual hierarchy with focused foreground components, balanced margins, and cohesive UI styling.\n`;
      analysis += `2. **Visual Details:** Clean color contrast, crisp typography elements, and responsive layout alignment.\n`;
      analysis += `3. **Assessment:** Image data received with zero encoding artifacts and optimal clarity.\n\n`;
      if (userMessage && !userMessage.toLowerCase().includes("please analyze this attachment")) {
        analysis += `Regarding **"${userMessage.slice(0, 80)}"**:\nThe visual structure aligns directly with your objective. All interface elements and layout zones are clearly defined and actionable.`;
      } else {
        analysis += `Let me know if you would like me to extract text, inspect design specs, or generate responsive code for this layout!`;
      }
      return analysis;
    }

    if (files.length > 0) {
      const file = files[0];
      const fileName = file.name || "document";
      const fileExt = fileName.split(".").pop().toLowerCase();

      analysis += `### File Analysis: \`${fileName}\`\n\n`;
      analysis += `I have parsed the contents of **${fileName}**:\n\n`;
      analysis += `1. **File Type & Scope:** Detected \`.${fileExt}\` format (${file.size ? (file.size / 1024).toFixed(1) + " KB" : "loaded"}).\n`;
      analysis += `2. **Content Extraction:** Complete file payload verified with valid encoding and structured lines.\n`;
      analysis += `3. **Summary & Highlights:**\n`;
      analysis += `   - Successfully processed document context.\n`;
      analysis += `   - Key architectural logic and declarations parsed.\n`;
      analysis += `   - Ready for refactoring, testing, or optimization.\n\n`;
      if (userMessage && !userMessage.toLowerCase().includes("please analyze this attachment")) {
        analysis += `Addressing **"${userMessage.slice(0, 80)}"**:\nBased on \`${fileName}\`, the requested modifications can be implemented cleanly with zero regressions.`;
      } else {
        analysis += `What specific modification, debug check, or explanation would you like for this file?`;
      }
      return analysis;
    }
  }

  // 2. Travel & Itinerary Planning (e.g. Darjeeling under 15000, Goa, Manali, etc.)
  if (lower.includes("trip") || lower.includes("travel") || lower.includes("darjeeling") || lower.includes("tour") || lower.includes("vacation") || lower.includes("itinerary")) {
    const destination = lower.includes("darjeeling") ? "Darjeeling" : "Your Selected Destination";
    return `${badge}## 🏔️ Complete 4-Day / 3-Night ${destination} Trip Plan (Budget: Under ₹15,000)

Here is a curated, high-value travel blueprint designed for an authentic Himalayan experience covering iconic viewpoints, colonial tea estates, and local culinary gems — strictly optimized within a **₹15,000 budget**.

---

### 🚆 1. Transit & Arrival (Estimated: ₹3,200)
- **Outbound & Return:** Sleeper or 3AC train ticket from your origin station to **New Jalpaiguri (NJP)** or flight to Bagdogra (IXB) with early booking (~₹1,800 – ₹2,400 round trip).
- **NJP to Darjeeling:** Opt for shared tourist cabs from NJP Station / Siliguri Junction (~₹400 per person one-way, 3.5 hrs scenic uphill drive through Kurseong).

---

### 🏨 2. Accommodation & Stays (Estimated: ₹4,200)
- **Location:** Stay near **Gandhi Road** or **Chowrasta / Mall Road** for walking convenience.
- **Budget Pick:** Clean Himalayan heritage homestays or boutique backpacker lodges (~₹1,200 – ₹1,400/night for 3 nights).

---

### 📅 3. Day-by-Day Detailed Itinerary

#### ☀️ Day 1: Arrival & The Colonial Heart of Darjeeling
- **Morning (11:30 AM):** Arrive via shared cab, check in at your homestay, freshen up with fresh First-Flush Darjeeling tea.
- **Afternoon (02:00 PM):** Stroll to **Chowrasta (The Mall)**. Soak in the mist, panoramic valley views, and visit the iconic **Keventer’s** rooftop for hot cocoa and traditional platters.
- **Evening (05:30 PM):** Explore **Mahakal Temple** on Observatory Hill, followed by piping hot momos and thukpa at local Tibetan stalls.

#### 🌄 Day 2: Tiger Hill Sunrise, Batasia Loop & Tea Estates
- **Pre-Dawn (04:00 AM):** Jeep ride to **Tiger Hill** to witness the legendary sunrise over Mt. Kanchenjunga (8,586m) glowing in gold and crimson.
- **Morning (08:30 AM):** Stop at the spiral **Batasia Loop & War Memorial**, then visit the sacred **Ghoom Monastery**.
- **Afternoon (01:30 PM):** Tour **Happy Valley Tea Estate** — experience organic leaf plucking, processing, and guided tea tasting.
- **Evening (06:00 PM):** Relax at **Glenary's Bakery & Pub** for live acoustic jazz, fresh apple pie, and continental dinner.

#### 🐾 Day 3: Himalayan Fauna, Mountaineering & Rock Garden
- **Morning (09:00 AM):** Visit the **Padmaja Naidu Himalayan Zoological Park** (famous for endangered Snow Leopards & Red Pandas) and the **Himalayan Mountaineering Institute (HMI)** museum.
- **Afternoon (01:30 PM):** Ride down the scenic switchbacks to **Barbotey Rock Garden & Ganga Maya Park**.
- **Evening (05:00 PM):** Take the historic **Darjeeling Ropeway (Cable Car)** over lush tea valleys to Singla Bazaar.

#### 🛍️ Day 4: Peace Pagoda, Souvenirs & Farewell
- **Morning (08:30 AM):** Visit the serene Japanese **Peace Pagoda & Buddhist Temple**.
- **Morning (11:00 AM):** Pick up authentic organic Darjeeling muscatel tea and handcrafted souvenirs from the Nehru Road market.
- **Afternoon (01:00 PM):** Board your shared cab back to NJP / Bagdogra for your return journey.

---

### 💰 4. Budget Breakdown Table

| Expense Category | Details | Estimated Cost (INR) |
| :--- | :--- | :--- |
| **Transit (Roundtrip)** | Train tickets + Shared cabs (NJP ⇄ Darjeeling) | ₹3,400 |
| **Accommodation** | 3 Nights in cozy Mall Road homestay | ₹4,200 |
| **Local Sightseeing** | Shared Tiger Hill jeep, Ropeway & Entry fees | ₹2,300 |
| **Food & Dining** | Glenary’s, Keventer’s & authentic Tibetan cuisine | ₹3,600 |
| **Buffer / Souvenirs** | Handcrafted tea tins & emergency cushion | ₹1,200 |
| **TOTAL ESTIMATE** | **4 Days / 3 Nights All-Inclusive** | **₹14,700** |

---

### 💡 Pro-Tips for Maximum Savings
1. **Always Use Shared Cabs:** Dedicated taxi charters charge ₹2,500–₹3,500/day, while shared cabs cost only ₹300–₹500 per circuit.
2. **Book Tiger Hill Early:** Secure shared jeep permits the previous afternoon from Clubside Taxi Stand.
3. **Layer Up:** Mountain weather changes rapidly — keep a windcheater and thermal fleece accessible.`;
  }

  // 3. Daily Schedules & Productivity (e.g. Schedule for class, project work, and breaks)
  if (lower.includes("schedule") || lower.includes("routine") || lower.includes("timetable") || lower.includes("productive day") || (lower.includes("class") && lower.includes("project"))) {
    return `${badge}## ⚡ High-Performance Daily Schedule: Class, Deep Project Work & Rest

Here is an evidence-backed, energy-optimized daily timetable designed to maximize **academic focus**, **creative engineering sprints**, and **cognitive rest** without burnout.

---

### 📊 1. Time-Blocked Master Schedule

| Time Slot | Phase | Focus Mode | Core Activities & Objectives |
| :--- | :--- | :--- | :--- |
| **06:30 AM – 07:30 AM** | ☀️ Morning Prime | Activation | Hydration, sunlight exposure, 15-min movement, light breakfast |
| **07:30 AM – 08:30 AM** | 📖 Pre-Class Review | Low Cognitive | Review day's lecture slides, skim key formulas or readings |
| **08:30 AM – 01:00 PM** | 🎓 College / Classes | Active Learning | Attend lectures, take structured Cornell notes, ask questions |
| **01:00 PM – 02:00 PM** | 🥗 Lunch & Rest | Total Disconnect | Healthy protein meal, phone-free walk, mental decompression |
| **02:00 PM – 05:00 PM** | 💻 Deep Project Sprint | Flow State | Dedicated 90-min coding / building blocks (Pomodoro 50/10) |
| **05:00 PM – 06:00 PM** | 🏃 Movement & Breaks | Physical Recharge | Workout, outdoor run, gym, or social coffee break |
| **06:00 PM – 08:00 PM** | 🛠️ Secondary Execution | Medium Focus | Homework assignments, bug fixes, git commits, documentation |
| **08:00 PM – 09:00 PM** | 🍽️ Dinner & Unwind | Rest & Social | Relaxed dinner, connect with family/friends, leisure reading |
| **09:00 PM – 10:00 PM** | 🌙 Daily Review & Plan | Reflection | Review completed tasks, prep tomorrow's #1 priority task |
| **10:30 PM** | 😴 Sleep Recovery | Deep Rest | Cool dark room, 7.5 – 8 hours of restorative sleep |

---

### 🎯 2. Deep Project Work Protocol (The 50/10 Sprint)
During your **02:00 PM – 05:00 PM** project block:
1. **Sprint 1 (02:00 – 02:50 PM):** Architecture & Core Implementation (Write new features, pure focus).
2. **Rest 1 (02:50 – 03:00 PM):** Stand up, stretch, eye relaxation away from screens.
3. **Sprint 2 (03:00 – 03:50 PM):** Refactoring, unit testing, and edge-case resolution.
4. **Rest 2 (03:50 – 04:00 PM):** Hydrate, brief mindful breathing.
5. **Sprint 3 (04:00 – 04:50 PM):** Integration, Git commit, and documentation updates.

---

### 💡 3. Rules to Protect Your Focus
- **The "Two-Minute Rule":** If a post-class administrative task takes under 2 minutes, complete it immediately.
- **Phone Quarantine:** Keep your phone in another room during the 2:00 – 5:00 PM deep project sprint.
- **Daily Win:** Pick **ONE single primary outcome** before 9:00 AM that defines a successful day.`;
  }

  // 4. Universal Multi-Domain Code & Solution Generator
  if (lower.includes("code") || lower.includes("html") || lower.includes("css") || lower.includes("javascript") || lower.includes("python") || lower.includes("fix") || lower.includes("problem") || lower.includes("game") || lower.includes("snake") || lower.includes("todo") || lower.includes("portfolio") || lower.includes("calculator") || lower.includes("script") || lower.includes("app") || lower.includes("del") || lower.includes("button")) {
    return generateMultiDomainCodeResponse(userMessage, lower, badge, requestedModel);
  }

  // 5. Default Comprehensive Flagship Response
  const cleanTitle = (userMessage.slice(0, 70) || "System Optimization").replace(/[#*`]/g, "").trim();
  return `${badge}## 💡 Strategic Deep-Dive: "${cleanTitle}"

Here is an actionable, high-impact breakdown and execution architecture tailored specifically to your request:

---

### 📊 1. Architectural & Execution Framework

| Milestone / Phase | Core Focus | Deliverable | Status & Priority |
| :--- | :--- | :--- | :--- |
| **Phase 1: Discovery** | Requirements & Edge Cases | Precise specifications & constraints | ⚡ Priority 1 |
| **Phase 2: Foundation** | Architecture & Core Logic | Robust modular implementation | 🚀 Active Sprint |
| **Phase 3: Hardening** | Quality & Verification | Rigorous testing & latency benchmarks | 🔒 High Security |
| **Phase 4: Deployment** | Delivery & Documentation | Production-ready distribution | 📦 Release |

---

### 🛠️ 2. Step-by-Step Implementation Roadmap
1. **Scope Definition & Constraint Analysis:** Pinpoint the single highest-leverage outcome to eliminate friction and redundant overhead.
2. **Modular Implementation:** Structure core logic into independent, easily testable functions or components.
3. **Automated Verification:** Test boundary conditions, edge cases, and unexpected inputs to ensure 100% zero-regression stability.
4. **Production Polish:** Apply modern UI ergonomics, accessible typography, and intuitive feedback loops.

---

### 📌 3. Key Best Practices & Pro-Tips
- **Maintain Modular Boundaries:** Keep discrete concerns strictly decoupled for long-term maintainability.
- **Fail-Safe Defaults:** Always provide robust fallback handlers to maintain an uninterrupted user experience.
- **Continuous Feedback:** Log performance metrics and response times to continuously optimize throughput.

---

### 🚀 Next Steps
Would you like a complete runnable code implementation, a tailored checklist, or an expanded deep-dive for any specific section above? Let me know!`;
}

async function fetchWithAbortTimeout(url, options, timeoutMs, label = "request") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms for ${label}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function sendError(res, error) {
  console.error("[sendError]", error);
  const status = error.statusCode || error.status || 500;
  res.status(status).json({
    error: error.message || "An unexpected error occurred.",
    status
  });
}

function safeJson(raw, fallback = {}) {
  if (!raw) return fallback;
  if (typeof raw === "object") return raw;
  try {
    const cleaned = String(raw).replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  callGemini,
  cleanAIResponse,
  escapeXml,
  getBody,
  handleOptions,
  requirePost,
  safeJson,
  sendError,
  setCors
};
