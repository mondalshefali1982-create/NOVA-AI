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
  console.log("=== STARTING MOBILE RESPONSIVENESS VERIFICATION ===");
  const port = 9223;
  const tempProfile = path.join(ARTIFACTS_DIR, "scratch", "chrome_cdp_mobile_test");
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

    // 1. Audit Layout Geometry & Overflow
    const auditRes = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const bodyWidth = document.body.clientWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        const docScrollWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const hasHorizontalScroll = (docScrollWidth > winWidth + 1) || (bodyScrollWidth > winWidth + 1);

        const sidebar = document.querySelector(".dashboard-sidebar");
        const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
        const sidebarComputed = sidebar ? window.getComputedStyle(sidebar) : null;

        const main = document.querySelector(".dashboard-main");
        const mainRect = main ? main.getBoundingClientRect() : null;
        const mainComputed = main ? window.getComputedStyle(main) : null;

        const bottomNav = document.querySelector(".mobile-bottom-nav");
        const navButtons = bottomNav ? Array.from(bottomNav.querySelectorAll("button")) : [];
        const buttonCount = navButtons.length;
        const buttonLabels = navButtons.map(b => b.textContent.trim());

        return {
          windowWidth: winWidth,
          bodyWidth: bodyWidth,
          docScrollWidth: docScrollWidth,
          hasHorizontalScroll: hasHorizontalScroll,
          sidebar: {
            left: sidebarRect ? Math.round(sidebarRect.left) : null,
            width: sidebarRect ? Math.round(sidebarRect.width) : null,
            position: sidebarComputed ? sidebarComputed.position : null,
            transform: sidebarComputed ? sidebarComputed.transform : null
          },
          main: {
            left: mainRect ? Math.round(mainRect.left) : null,
            width: mainRect ? Math.round(mainRect.width) : null,
            paddingLeft: mainComputed ? mainComputed.paddingLeft : null,
            paddingRight: mainComputed ? mainComputed.paddingRight : null
          },
          bottomNav: {
            buttonCount: buttonCount,
            buttonLabels: buttonLabels,
            display: bottomNav ? window.getComputedStyle(bottomNav).display : null,
            columns: bottomNav ? window.getComputedStyle(bottomNav).gridTemplateColumns : null
          }
        };
      })()`,
      returnByValue: true
    });

    console.log("Initial Mobile Audit Results:", JSON.stringify(auditRes.result.value, null, 2));

    // Capture Home Screenshot
    const homeScreenshot = await client.send("Page.captureScreenshot", { format: "png" });
    const homeScreenshotPath = path.join(ARTIFACTS_DIR, "live_mobile_home_verified.png");
    fs.writeFileSync(homeScreenshotPath, Buffer.from(homeScreenshot.data, "base64"));
    console.log("Captured: live_mobile_home_verified.png");

    // 2. Test Mobile Menu Button Click (Open Sidebar Drawer)
    console.log("Testing Mobile Menu Toggle...");
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const menuBtn = document.getElementById("mobileMenuBtn");
        if (menuBtn) menuBtn.click();
      })()`
    });

    await sleep(600);

    const sidebarOpenAudit = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const sidebar = document.querySelector(".dashboard-sidebar");
        const overlay = document.querySelector(".sidebar-overlay");
        const rect = sidebar ? sidebar.getBoundingClientRect() : null;
        return {
          isOpenClass: sidebar ? sidebar.classList.contains("open") : false,
          sidebarLeft: rect ? Math.round(rect.left) : null,
          overlayVisible: overlay ? window.getComputedStyle(overlay).opacity : null
        };
      })()`,
      returnByValue: true
    });
    console.log("Sidebar Open Audit:", JSON.stringify(sidebarOpenAudit.result.value, null, 2));

    const drawerScreenshot = await client.send("Page.captureScreenshot", { format: "png" });
    const drawerScreenshotPath = path.join(ARTIFACTS_DIR, "live_mobile_drawer_verified.png");
    fs.writeFileSync(drawerScreenshotPath, Buffer.from(drawerScreenshot.data, "base64"));
    console.log("Captured: live_mobile_drawer_verified.png");

    // Close Sidebar
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const closeBtn = document.querySelector(".sidebar-close");
        if (closeBtn) closeBtn.click();
      })()`
    });
    await sleep(400);

    // 3. Test Switching to AI Chat Tab
    console.log("Testing Switch to AI Chat Panel...");
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const chatNavBtn = document.querySelector('button[data-mobile-panel="ai-chat"]');
        if (chatNavBtn) chatNavBtn.click();
      })()`
    });

    await sleep(600);

    const chatPanelAudit = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const chatPanel = document.getElementById("ai-chat");
        const chatForm = document.getElementById("chatForm");
        const chatInput = document.getElementById("chatInput");
        const attachBtn = document.getElementById("attachBtn");
        const micBtn = document.getElementById("voicePromptBtn");

        const formStyle = chatForm ? window.getComputedStyle(chatForm) : null;
        const inputStyle = chatInput ? window.getComputedStyle(chatInput) : null;

        return {
          isChatActive: chatPanel ? chatPanel.classList.contains("active") : false,
          formFlexDirection: formStyle ? formStyle.flexDirection : null,
          formAlignItems: formStyle ? formStyle.alignItems : null,
          inputWidth: chatInput ? Math.round(chatInput.getBoundingClientRect().width) : null,
          attachBtnWidth: attachBtn ? Math.round(attachBtn.getBoundingClientRect().width) : null,
          micBtnWidth: micBtn ? Math.round(micBtn.getBoundingClientRect().width) : null
        };
      })()`,
      returnByValue: true
    });
    console.log("Chat Panel Mobile Audit:", JSON.stringify(chatPanelAudit.result.value, null, 2));

    const chatScreenshot = await client.send("Page.captureScreenshot", { format: "png" });
    const chatScreenshotPath = path.join(ARTIFACTS_DIR, "live_mobile_chat_verified.png");
    fs.writeFileSync(chatScreenshotPath, Buffer.from(chatScreenshot.data, "base64"));
    console.log("Captured: live_mobile_chat_verified.png");

    client.close();
  } finally {
    try {
      chromeProc.kill();
    } catch (e) {}
  }

  console.log("=== MOBILE VERIFICATION COMPLETED ===");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
