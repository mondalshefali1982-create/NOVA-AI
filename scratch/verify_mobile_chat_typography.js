const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "C:\\Users\\Rohan Mondal\\.gemini\\antigravity\\brain\\96dbc175-278e-4e7e-a2a6-ed5a0b0a9e56";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DASHBOARD_URL = "file:///C:/Users/Rohan%20Mondal/OneDrive/Desktop/nova/dashboard.html";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log("=== STARTING MOBILE TYPOGRAPHY & OVERLAP VERIFICATION ===");
  const port = 9224;
  const tempProfile = path.join(ARTIFACTS_DIR, "scratch", "chrome_cdp_typo_test");
  fs.mkdirSync(tempProfile, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempProfile}`,
    "--headless=new",
    "--disable-gpu",
    "--window-size=390,844",
    DASHBOARD_URL
  ]);

  try {
    let version = null;
    for (let i = 0; i < 20; i++) {
      await sleep(400);
      try {
        version = await fetchJson(`http://127.0.0.1:${port}/json/version`);
        if (version) break;
      } catch (e) {}
    }

    if (!version) throw new Error("Chrome debug port not responding");

    const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
    const pageTarget = targets.find((t) => t.type === "page") || targets[0];
    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("DOM.enable");
    await client.send("CSS.enable");

    // Set mobile device emulation (390 x 844, DPR: 3, mobile: true)
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true
    });

    await sleep(1500);

    // 1. Switch to AI Chat panel and render test conversation
    console.log("Injecting test conversation matching user screenshot...");
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        activatePanel("ai-chat");
        
        const welcome = document.getElementById("geminiWelcomeContainer");
        if (welcome) {
          welcome.classList.add("hidden");
          welcome.style.display = "none";
        }

        const container = document.getElementById("chatMessages");
        const testUserText = "Hiii";
        const testAiText = "Hiii there! 👋 It's great to hear from you again.\\n\\nI remember you're building\\n# elevatexdigitalsolutions\\n! That's an exciting venture.\\n\\nHow can I assist you today with elevatexdigitalsolutions?\\nWhether you're brainstorming ideas, refining your strategy, tackling a specific challenge, or just want to chat, I'm here to help.";
        
        addMessage(container, "user", testUserText);
        addMessage(container, "ai", testAiText);
        
        // Scroll to the bottom so active input is focused
        window.scrollTo(0, document.body.scrollHeight);
      })()`
    });

    await sleep(800);

    // 2. Measure Typography and Bottom Nav vs Chat Form Positions
    const evalRes = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const chatForm = document.getElementById("chatForm");
        const bottomNav = document.querySelector(".mobile-bottom-nav");
        const formRect = chatForm ? chatForm.getBoundingClientRect() : null;
        const navRect = bottomNav ? bottomNav.getBoundingClientRect() : null;
        const formStyle = chatForm ? window.getComputedStyle(chatForm) : null;

        // Check if form and nav overlap
        // If form bottom <= nav top, there is ZERO overlap!
        const isFormAboveNav = formRect && navRect ? (formRect.bottom <= navRect.top + 2) : false;

        const aiBubbles = document.querySelectorAll("#chatMessages .message.ai");
        const aiBubble = aiBubbles.length ? aiBubbles[aiBubbles.length - 1] : null;
        const pElem = aiBubble ? aiBubble.querySelector("p") : null;
        const h1Elem = aiBubble ? aiBubble.querySelector("h1") : null;

        const pStyle = pElem ? window.getComputedStyle(pElem) : null;
        const h1Style = h1Elem ? window.getComputedStyle(h1Elem) : null;
        const bubbleStyle = aiBubble ? window.getComputedStyle(aiBubble) : null;

        return {
          typography: {
            paragraphFontSize: pStyle ? pStyle.fontSize : null,
            paragraphLineHeight: pStyle ? pStyle.lineHeight : null,
            paragraphMarginBottom: pStyle ? pStyle.marginBottom : null,
            heading1FontSize: h1Style ? h1Style.fontSize : null,
            heading1LineHeight: h1Style ? h1Style.lineHeight : null,
            heading1Margin: h1Style ? (h1Style.marginTop + ' ' + h1Style.marginBottom) : null,
            bubblePadding: bubbleStyle ? bubbleStyle.padding : null,
            bubbleBorderRadius: bubbleStyle ? bubbleStyle.borderRadius : null
          },
          layoutPosition: {
            formPosition: formStyle ? formStyle.position : null,
            formBottomY: formRect ? Math.round(formRect.bottom) : null,
            navTopY: navRect ? Math.round(navRect.top) : null,
            clearancePx: (formRect && navRect) ? Math.round(navRect.top - formRect.bottom) : null,
            isFormCleanlyVisible: isFormAboveNav
          }
        };
      })()`,
      returnByValue: true
    });

    console.log("Evaluation Results:", JSON.stringify(evalRes.result.value, null, 2));

    // Capture screenshot of mobile chat panel
    const chatScreenshot = await client.send("Page.captureScreenshot", { format: "png" });
    const chatScreenshotPath = path.join(ARTIFACTS_DIR, "live_mobile_chat_typography_verified.png");
    fs.writeFileSync(chatScreenshotPath, Buffer.from(chatScreenshot.data, "base64"));
    console.log("Captured: live_mobile_chat_typography_verified.png");

    client.close();
  } finally {
    try {
      chromeProc.kill();
    } catch (e) {}
  }

  console.log("=== VERIFICATION COMPLETED ===");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
