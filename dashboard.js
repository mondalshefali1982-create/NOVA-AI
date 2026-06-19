const NOVA_BACKEND_BASE_URL = (window.NOVA_BACKEND_BASE_URL || "").replace(/\/$/, "");
const NOVA_AUTH_TOKEN_KEY = "novaAuthToken";
const NOVA_LOGIN_PAGE = "login.html";
const NOVA_CONVERSATIONS_KEY = "novaConversations";
const NOVA_ACTIVE_CONVERSATION_KEY = "novaActiveConversationId";
const NOVA_CONVERSATION_OWNER_KEY = "novaConversationOwnerEmail";
const NOVA_API_ROUTES = {
  chat: "/api/gemini/chat",
  document: "/api/gemini/document",
  planner: "/api/gemini/planner",
  image: "/api/gemini/image",
  login: "/api/auth/login",
  signup: "/api/auth/signup",
  logout: "/api/auth/logout",
  me: "/api/auth/me",
  sync: "/api/conversations/sync"
};

// ─── Local Storage Helpers ────────────────────────────────────────────────────

const store = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// ─── Application State ────────────────────────────────────────────────────────

const state = {
  tasks: store.get("novaTasks", []),
  prompts: store.get("novaPrompts", []),
  conversations: store.get(NOVA_CONVERSATIONS_KEY, []),
  activeConversationId: localStorage.getItem(NOVA_ACTIVE_CONVERSATION_KEY) || "",
  settings: store.get("novaSettings", {
    light: false,
    compact: false,
    accent: "violet",
    wallpaper: "mesh",
    language: "en",
    mode: "freelancer"
  }),
  images: store.get("novaImages", []),
  planner: store.get("novaPlanner", []),
  currentUser: null,
  authToken: localStorage.getItem(NOVA_AUTH_TOKEN_KEY) || "",
  syncTimer: null,
  isSyncingConversations: false,
  requestCount: Number(localStorage.getItem("novaRequestCount") || 0),
  lastUserPrompt: "",
  generatedPrompt: ""
};

// ─── DOM References ───────────────────────────────────────────────────────────

const panels = document.querySelectorAll(".dashboard-panel");
const navLinks = document.querySelectorAll("[data-panel]");
const mobileNavLinks = document.querySelectorAll("[data-mobile-panel]");
const sidebar = document.querySelector(".dashboard-sidebar");
const sidebarToggle = document.querySelector(".sidebar-toggle");
const sidebarOverlay = document.querySelector(".sidebar-overlay");
const sidebarClose = document.querySelector(".sidebar-close");
const chatMessages = document.getElementById("chatMessages");
const overviewMessages = document.getElementById("overviewMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const promptList = document.getElementById("promptList");
const generatedPrompt = document.getElementById("generatedPrompt");
const conversationList = document.getElementById("conversationList");
const greetingTitle = document.getElementById("greetingTitle");
const greetingSubtitle = document.getElementById("greetingSubtitle");
const startupLoader = document.getElementById("startupLoader");
const commandPalette = document.getElementById("commandPalette");
const commandInput = document.getElementById("commandInput");
const commandResults = document.getElementById("commandResults");
const voiceStatus = document.getElementById("voiceStatus");
const voiceToggle = document.getElementById("voiceToggle");
const voiceOrb = document.getElementById("voiceOrb");
const authForm = document.getElementById("authForm");
const authFields = document.getElementById("authFields");
const authDisplayName = document.getElementById("authDisplayName");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authStatus = document.getElementById("authStatus");
const authModeLabel = document.getElementById("authModeLabel");

let recognition = null;
let isListening = false;

// ─── AI Studio Templates ──────────────────────────────────────────────────────

const templates = {
  caption: (input) =>
    `Create 5 premium social captions for: ${input}. Include hooks, concise body copy, and a confident call to action.`,
  prompt: (input) =>
    `Act as an expert prompt engineer. Build a structured reusable prompt for this goal: ${input}. Include context, task, constraints, output format, and quality checks.`,
  startup: (input) =>
    `Generate 7 startup ideas for: ${input}. For each, include target user, pain point, MVP, pricing angle, and first validation step.`,
  writing: (input) =>
    `Rewrite the following copy so it is clearer, more persuasive, and more premium while preserving meaning: ${input}.`
};

// ─── Initialisation ───────────────────────────────────────────────────────────

bootstrapDashboard();

async function bootstrapDashboard() {
  const canOpenDashboard = await requireDashboardSession();
  if (!canOpenDashboard) return;

  createParticles();
  addCursorGlow();
  setGreeting();
  applySettings();
  renderAll();
  loadQuote();
  restoreChat();
  renderImages();
  renderPlanner();
  activatePanelFromHash();
  updateAuthUI();
  initializeAuthSession();
  dismissLoader();
  registerServiceWorker();
}

async function requireDashboardSession() {
  if (!state.authToken) {
    redirectToLogin();
    return false;
  }

  try {
    const data = await callNovaAuth(NOVA_API_ROUTES.me, { method: "GET" });
    state.currentUser = data.user || null;
    return true;
  } catch {
    clearAuthSession();
    redirectToLogin();
    return false;
  }
}

function redirectToLogin() {
  window.location.replace(NOVA_LOGIN_PAGE);
}

// ─── Navigation ───────────────────────────────────────────────────────────────

window.addEventListener("hashchange", activatePanelFromHash);

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    activatePanel(link.dataset.panel);
    closeSidebar();
  });
});

mobileNavLinks.forEach((button) => {
  button.addEventListener("click", () => {
    const panel = button.dataset.mobilePanel;
    window.location.hash = panel;
    activatePanel(panel);
    closeSidebar();
  });
});

document.querySelectorAll("[data-panel-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const panel = button.dataset.panelTarget;
    window.location.hash = panel;
    activatePanel(panel);
  });
});

// ─── Sidebar ──────────────────────────────────────────────────────────────────

sidebarToggle?.addEventListener("click", () => {
  setSidebarState(!sidebar?.classList.contains("open"));
});

sidebarOverlay?.addEventListener("click", closeSidebar);
sidebarClose?.addEventListener("click", closeSidebar);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSidebar();
    closeCommandPalette();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openCommandPalette();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 980) closeSidebar();
});

// ─── Chat ─────────────────────────────────────────────────────────────────────

chatForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  state.lastUserPrompt = message;
  chatInput.value = "";
  autoResizeInput();

  addMessage(chatMessages, "user", message);
  addMessage(overviewMessages, "user", message);
  saveChatMessage("user", message);

  const typing = addTypingMessage(chatMessages);

  try {
    const response = await askFreeAI(message);
    typing.remove();
    const aiMessage = addMessage(chatMessages, "ai", "");
    await streamMessage(aiMessage, response);
    saveChatMessage("ai", response);
    addMessage(overviewMessages, "ai", response);
    state.requestCount += 1;
    localStorage.setItem("novaRequestCount", String(state.requestCount));
    updateCounters();
  } catch {
    typing.remove();
    const fallback = buildFallbackResponse(message);
    const aiMessage = addMessage(chatMessages, "ai", "");
    await streamMessage(aiMessage, fallback);
    saveChatMessage("ai", fallback);
  }
});

chatInput?.addEventListener("input", autoResizeInput);
chatInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm?.dispatchEvent(new Event("submit", { cancelable: true }));
  }
});

function autoResizeInput() {
  if (!chatInput) return;
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 160)}px`;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

taskForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  state.tasks.unshift({ id: crypto.randomUUID(), text, completed: false });
  taskInput.value = "";
  persistTasks();
});

// ─── Prompts ──────────────────────────────────────────────────────────────────

document.getElementById("saveLastPrompt")?.addEventListener("click", () => {
  if (state.lastUserPrompt) savePrompt(state.lastUserPrompt);
});

document.getElementById("saveGeneratedPrompt")?.addEventListener("click", () => {
  if (state.generatedPrompt) savePrompt(state.generatedPrompt);
});

document.getElementById("clearPrompts")?.addEventListener("click", () => {
  state.prompts = [];
  persistPrompts();
});

// ─── Conversations ────────────────────────────────────────────────────────────

document.getElementById("newChatBtn")?.addEventListener("click", startNewChat);
document.getElementById("clearAllChatsBtn")?.addEventListener("click", clearAllChats);

// ─── AI Studio ────────────────────────────────────────────────────────────────

document.querySelectorAll(".dashboard-tools .tool-card button").forEach((button) => {
  button.addEventListener("click", async () => {
    const card = button.closest(".tool-card");
    const textarea = card.querySelector("textarea");
    const type = textarea.dataset.template;
    const input = textarea.value.trim() || "a new AI productivity workflow";
    const prompt = templates[type](input);

    generatedPrompt.textContent = "NOVA is thinking…";

    try {
      const result = await askFreeAI(prompt);
      state.generatedPrompt = result;
      renderFormattedText(generatedPrompt, result);
    } catch {
      generatedPrompt.textContent =
        "NOVA couldn't generate a response right now. Please try again in a moment.";
    }
  });
});

// ─── Settings ────────────────────────────────────────────────────────────────

document.getElementById("themeToggle")?.addEventListener("change", (event) => {
  state.settings.light = event.target.checked;
  persistSettings();
});

document.getElementById("compactToggle")?.addEventListener("change", (event) => {
  state.settings.compact = event.target.checked;
  persistSettings();
});

document.getElementById("accentSelect")?.addEventListener("change", (event) => {
  state.settings.accent = event.target.value;
  persistSettings();
});

document.getElementById("wallpaperSelect")?.addEventListener("change", (event) => {
  state.settings.wallpaper = event.target.value;
  persistSettings();
});

document.getElementById("languageSelect")?.addEventListener("change", (event) => {
  state.settings.language = event.target.value;
  persistSettings();
});

document.getElementById("modeSelect")?.addEventListener("change", (event) => {
  state.settings.mode = event.target.value;
  persistSettings();
  updateModeSuggestion();
});

// ─── Feature Buttons ─────────────────────────────────────────────────────────

document.getElementById("generateDocBtn")?.addEventListener("click", generateDocument);
document.getElementById("copyDocBtn")?.addEventListener("click", copyDocument);
document.getElementById("downloadDocBtn")?.addEventListener("click", downloadDocument);
document.getElementById("generateImageBtn")?.addEventListener("click", generateImage);
document
  .getElementById("enhancePromptBtn")
  ?.addEventListener("click", () => {

    const promptBox =
      document.getElementById("imagePrompt");

    const type =
      document.getElementById("imageType").value;

    if (!promptBox.value.trim()) return;

if (
  promptBox.value.includes("professional logo design") ||
  promptBox.value.includes("high quality wallpaper") ||
  promptBox.value.includes("youtube thumbnail")
) {
  return;
}

if (!promptBox.dataset.enhanced) {
  promptBox.value =
    enhancePrompt(promptBox.value, type);

  promptBox.dataset.enhanced = "true";
}
});
document.getElementById("imageSearch")?.addEventListener("input", renderImages);
document.getElementById("generatePlanBtn")?.addEventListener("click", generatePlan);
document.getElementById("exportMemoryBtn")?.addEventListener("click", exportMemory);
document.getElementById("commandPill")?.addEventListener("click", openCommandPalette);
document.getElementById("refreshQuote")?.addEventListener("click", loadQuote);
voiceToggle?.addEventListener("click", toggleVoiceMode);

// ─── Profile ─────────────────────────────────────────────────────────────────

authForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  loginUser();
});

signupBtn?.addEventListener("click", signupUser);
logoutBtn?.addEventListener("click", logoutUser);

async function initializeAuthSession() {
  if (!state.authToken) {
    updateAuthUI();
    return;
  }

  if (state.currentUser) {
    updateAuthUI();
    setGreeting();
    await loadCloudConversations();
    setAuthStatus(`Cloud sync active for ${state.currentUser?.name || "NOVA user"}.`);
    return;
  }

  setAuthStatus("Checking your NOVA cloud session...");

  try {
    const data = await callNovaAuth(NOVA_API_ROUTES.me, { method: "GET" });
    state.currentUser = data.user || null;
    updateAuthUI();
    setGreeting();
    await loadCloudConversations();
    setAuthStatus(`Cloud sync active for ${state.currentUser?.name || "NOVA user"}.`);
  } catch {
    clearAuthSession();
    setAuthStatus("Session expired. Guest mode is active again.");
  }
}

async function loginUser() {
  const email = authEmail?.value.trim();
  const password = authPassword?.value;

  if (!email || !password) {
    setAuthStatus("Enter your email and password to log in.");
    return;
  }

  setAuthButtonsBusy(true);
  setAuthStatus("Logging in...");

  try {
    const data = await callNovaAuth(NOVA_API_ROUTES.login, {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    completeAuthSession(data);
    await loadCloudConversations();
    setAuthStatus(`Welcome back, ${state.currentUser?.name || "NOVA user"}. Cloud sync is on.`);
  } catch (error) {
    setAuthStatus(error.message || "Login failed. Check your email and password.");
  } finally {
    setAuthButtonsBusy(false);
  }
}

async function signupUser() {
  const name = authDisplayName?.value.trim();
  const email = authEmail?.value.trim();
  const password = authPassword?.value;

  if (!name || !email || !password) {
    setAuthStatus("Display name, email, and password are required for signup.");
    return;
  }

  setAuthButtonsBusy(true);
  setAuthStatus("Creating your NOVA account...");

  try {
    const data = await callNovaAuth(NOVA_API_ROUTES.signup, {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });
    completeAuthSession(data);
    await loadCloudConversations();
    setAuthStatus(`Account ready for ${state.currentUser?.name || "NOVA user"}. Cloud sync is on.`);
  } catch (error) {
    setAuthStatus(error.message || "Signup failed. Try another email or password.");
  } finally {
    setAuthButtonsBusy(false);
  }
}

async function logoutUser() {
  setAuthButtonsBusy(true);

  try {
    if (state.authToken) {
      await callNovaAuth(NOVA_API_ROUTES.logout, { method: "POST" }).catch(() => {});
    }
  } finally {
    clearAuthSession();
    setAuthButtonsBusy(false);
    redirectToLogin();
  }
}

function completeAuthSession(data) {
  if (!data?.token) {
    throw new Error("The backend did not return a JWT token.");
  }

  state.authToken = data.token;
  state.currentUser = data.user || null;
  localStorage.setItem(NOVA_AUTH_TOKEN_KEY, state.authToken);
  if (authPassword) authPassword.value = "";
  updateAuthUI();
  setGreeting();
}

function clearAuthSession() {
  clearVisibleConversations();
  state.authToken = "";
  state.currentUser = null;
  localStorage.removeItem(NOVA_AUTH_TOKEN_KEY);
  updateAuthUI();
  setGreeting();
}

function updateAuthUI() {
  const isLoggedIn = Boolean(state.authToken && state.currentUser);

  authForm?.classList.toggle("is-authenticated", isLoggedIn);
  if (authFields) authFields.hidden = isLoggedIn;
  if (loginBtn) loginBtn.hidden = isLoggedIn;
  if (signupBtn) signupBtn.hidden = isLoggedIn;
  if (logoutBtn) logoutBtn.hidden = !isLoggedIn;
  if (authModeLabel) authModeLabel.textContent = isLoggedIn ? "Cloud" : "Guest";

  if (isLoggedIn) {
    if (authDisplayName) authDisplayName.value = state.currentUser?.name || "";
    if (authEmail) authEmail.value = state.currentUser?.email || "";
  }
}

function setAuthStatus(message) {
  if (authStatus) authStatus.textContent = message;
}

function setAuthButtonsBusy(isBusy) {
  [loginBtn, signupBtn, logoutBtn].forEach((button) => {
    if (button) button.disabled = isBusy;
  });
}

// ─── Command Palette ─────────────────────────────────────────────────────────

commandPalette?.addEventListener("click", (event) => {
  if (event.target === commandPalette) closeCommandPalette();
});

commandInput?.addEventListener("input", renderCommands);

// ─── Panel Management ─────────────────────────────────────────────────────────

function activatePanelFromHash() {
  const requested = window.location.hash.replace("#", "") || "overview";
  activatePanel(requested);
}

function activatePanel(id) {
  const validPanel = document.getElementById(id) ? id : "overview";
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === validPanel));
  navLinks.forEach((link) => link.classList.toggle("active", link.dataset.panel === validPanel));
  mobileNavLinks.forEach((link) =>
    link.classList.toggle("active", link.dataset.mobilePanel === validPanel)
  );
}

// ─── Sidebar Management ───────────────────────────────────────────────────────

function setSidebarState(isOpen) {
  sidebar?.classList.toggle("open", isOpen);
  sidebarOverlay?.classList.toggle("open", isOpen);
  document.body.classList.toggle("sidebar-open", isOpen);
  sidebarToggle?.setAttribute("aria-expanded", String(isOpen));
  sidebarToggle?.setAttribute(
    "aria-label",
    isOpen ? "Close dashboard menu" : "Open dashboard menu"
  );
}

function closeSidebar() {
  setSidebarState(false);
}

// ─── Chat & Conversations ─────────────────────────────────────────────────────

function restoreChat() {
  migrateSingleChatHistory();
  if (!state.activeConversationId || !getActiveConversation()) {
    createConversation("New chat");
  }
  renderActiveConversation();
  renderConversationList();
}

async function askFreeAI(message) {
  const response = await callNovaBackend(
    NOVA_API_ROUTES.chat,
    {
      message:
        "Respond in clean professional text. Do not use markdown symbols like #, ##, ###, **, *, ---, code blocks.\n\n" +
        message,
      history: getActiveConversation()?.messages.slice(-8) || []
    }
  );

  return cleanAIResponse(response.text);
}

async function callNovaBackend(route, payload) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (state.authToken) {
    headers.Authorization = `Bearer ${state.authToken}`;
  }

  const response = await fetch(`${NOVA_BACKEND_BASE_URL}${route}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(
      "The AI service is temporarily unavailable. Please try again shortly."
    );
  }

  return response.json();
}
async function callNovaAuth(route, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.authToken) {
    headers.Authorization = `Bearer ${state.authToken}`;
  }

  const response = await fetch(`${NOVA_BACKEND_BASE_URL}${route}`, {
    ...options,
    headers
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "NOVA authentication request failed.");
  }

  return data;
}
function cleanAIResponse(text) {
  if (!text) return "";

  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/__/g, "")
    .replace(/_/g, "")
    .replace(/`/g, "")
    .replace(/---+/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function buildFallbackResponse(message) {
  return `I'm having trouble reaching the AI service right now.\n\nHere's a quick framework to move forward with **"${message}"**:\n\n1. **Clarify the goal** — What's the single most important outcome?\n2. **Break it down** — Identify 3 focused next steps.\n3. **Start with the fastest win** — Pick the step you can complete right now.\n4. **Save your best prompt** — Use the prompt library to reuse this later.\n\nTry again in a moment and NOVA will give you a full response.`;
}

// ─── Message Rendering ────────────────────────────────────────────────────────

/**
 * Converts markdown-like text into clean HTML for chat messages.
 * Optimised block regex structures prevent catastrophic backtracking during token processing.
 */
function parseMarkdown(text) {
  if (!text) return "";

  let html = text;

  // Fenced code blocks (``` lang\n...\n```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = escapeHtml(code.trim());
    const langLabel = lang ? `<span class="nova-code-lang">${escapeHtml(lang)}</span>` : "";
    return `<div class="nova-code-block">${langLabel}<pre><code>${escaped}</code></pre></div>`;
  });

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, (_, code) => {
    return `<code class="nova-inline-code">${escapeHtml(code)}</code>`;
  });

  // Headings (### ## #)
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Horizontal rule
  html = html.replace(/^---+$/gm, "<hr>");

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

  // Bold + italic (***text***)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");

  // Bold (**text** or __text__)
  html = html.replace(/\*\txt?(.?.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic (*text* or _text_)
  html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_\n]+)_/g, "<em>$1</em>");

  // Unordered lists (lines starting with - or *)
  html = html.replace(/((?:^[\s]*[-*] .+\n?)+)/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => `<li>${line.replace(/^[\s]*[-*] /, "")}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  });

  // Ordered lists (lines starting with 1. 2. etc.)
  html = html.replace(/((?:^[\s]*\d+\. .+\n?)+)/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => `<li>${line.replace(/^[\s]*\d+\. /, "")}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  });

  // Paragraphs: split on double newlines, wrap non-block elements
  const blockTags = /^<(h[1-6]|ul|ol|li|blockquote|pre|div|hr)/;
  html = html
    .split(/\n{2,}/)
    .map((segment) => {
      const trimmed = segment.trim();
      if (!trimmed) return "";
      if (blockTags.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");

  return html;
}

/**
 * High-speed simple plaintext converter used during active streaming to prevent 
 * full regular expression engine sweeps and layout thrashing across every frame iteration.
 */
function parseSimpleText(text) {
  if (!text) return "";
  return text
    .replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]))
    .split(/\n{2,}/)
    .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Renders formatted markdown content into a container element.
 */
function renderFormattedText(container, text) {
  if (!container) return;
  container.innerHTML = parseMarkdown(text);
  container.classList.add("nova-formatted");
}

/**
 * Adds a message bubble to a container. AI messages are rendered with markdown.
 */
function addMessage(container, type, text) {
  if (!container) return null;

  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${type}`;

  const bubble = document.createElement("div");
  bubble.className = `message ${type}`;

  if (type === "ai" && text) {
    bubble.innerHTML = parseMarkdown(text);
    bubble.classList.add("nova-formatted");
  } else {
    bubble.textContent = text;
  }

  wrapper.appendChild(bubble);

  if (type === "ai" && text) {
    const actions = buildMessageActions(text);
    wrapper.appendChild(actions);
  }

  container.appendChild(wrapper);
  trimMessages(container);
  
  container.scrollTop = container.scrollHeight;
  return bubble;
}

/**
 * Builds copy/thumbs action bar for AI messages.
 */
function buildMessageActions(text) {
  const bar = document.createElement("div");
  bar.className = "message-actions";

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "msg-action-btn";
  copyBtn.setAttribute("aria-label", "Copy message");
  copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
  copyBtn.addEventListener("click", async () => {
    await navigator.clipboard?.writeText(text).catch(() => {});
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
    }, 2000);
  });

  bar.appendChild(copyBtn);
  return bar;
}

/**
 * Streams text into an AI message bubble with blazing fast character block integration.
 * Employs massive chunk sizes, ultra-low animation timers, and downscaled structural parsing 
 * during execution frames to minimize UI locks and eliminate layout reflow limits.
 */
async function streamMessage(element, text) {
  if (!element) return;

  element.innerHTML = "";
  element.classList.add("nova-formatted", "streaming");

  const totalChars = text.length;
  // Maximum throughput configuration speeds up render processing across layout frameworks
  const chunkSize = totalChars > 1200 ? 45 : totalChars > 600 ? 30 : totalChars > 200 ? 16 : 8;
  const frameDelay = 4; // Blazing fast step iteration delay loop

  let index = 0;
  let buffer = "";
  const scrollContainer = element.closest("#chatMessages") || element.parentElement?.parentElement;

  const renderFrame = () => {
    if (index < totalChars) {
      buffer += text.slice(index, index + chunkSize);
      index += chunkSize;

      // Downscaled parsing during dynamic stream minimizes processing load per iteration tick
      const hasStructuralMarkdown = buffer.includes("```") || buffer.includes("- ") || buffer.includes("1. ");
      element.innerHTML = hasStructuralMarkdown ? parseMarkdown(buffer) : parseSimpleText(buffer);

      if (scrollContainer) {
        const shouldScroll = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 200;
        if (shouldScroll) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
      setTimeout(() => requestAnimationFrame(renderFrame), frameDelay);
    } else {
      // Final comprehensive syntax verification structure pass
      element.innerHTML = parseMarkdown(text);
      element.classList.remove("streaming");

      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }

      const wrapper = element.closest(".message-wrapper");
      if (wrapper && !wrapper.querySelector(".message-actions")) {
        wrapper.appendChild(buildMessageActions(text));
      }
    }
  };

  requestAnimationFrame(renderFrame);

  return new Promise((resolve) => {
    const checkDone = setInterval(() => {
      if (index >= totalChars) {
        clearInterval(checkDone);
        resolve();
      }
    }, 20);
  });
}

// ─── Conversation Management ──────────────────────────────────────────────────

function saveChatMessage(type, text) {
  const conversation = getActiveConversation() || createConversation("New chat");
  conversation.messages.push({ type, text, createdAt: Date.now() });
  conversation.updatedAt = Date.now();

  if (type === "user" && conversation.title === "New chat") {
    conversation.title = buildConversationTitle(text);
  }

  persistConversations();
  renderConversationList();
}

function startNewChat() {
  createConversation("New chat");
  state.lastUserPrompt = "";
  renderActiveConversation();
  renderConversationList();
}

function getActiveConversation() {
  return state.conversations.find((c) => c.id === state.activeConversationId);
}

function createConversation(title, options = {}) {
  const conversation = {
    id: crypto.randomUUID(),
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [
      {
        type: "ai",
        text: "Hello! I'm NOVA. What would you like to create, plan, or explore today?",
        createdAt: Date.now()
      }
    ]
  };

  state.conversations.unshift(conversation);
  state.activeConversationId = conversation.id;
  persistConversations(options);
  return conversation;
}

function renderActiveConversation() {
  const chatFragment = document.createDocumentFragment();
  const overviewFragment = document.createDocumentFragment();

  if (chatMessages) chatMessages.innerHTML = "";
  if (overviewMessages) overviewMessages.innerHTML = "";

  const conversation = getActiveConversation();
  if (!conversation) return;

  conversation.messages.slice(-14).forEach((msg) => {
    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper ${msg.type}`;
    const bubble = document.createElement("div");
    bubble.className = `message ${msg.type}`;

    if (msg.type === "ai" && msg.text) {
      bubble.innerHTML = parseMarkdown(msg.text);
      bubble.classList.add("nova-formatted");
      wrapper.appendChild(bubble);
      wrapper.appendChild(buildMessageActions(msg.text));
    } else {
      bubble.textContent = msg.text;
      wrapper.appendChild(bubble);
    }
    chatFragment.appendChild(wrapper);
  });

  conversation.messages.slice(-2).forEach((msg) => {
    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper ${msg.type}`;
    const bubble = document.createElement("div");
    bubble.className = `message ${msg.type}`;

    if (msg.type === "ai" && msg.text) {
      bubble.innerHTML = parseMarkdown(msg.text);
      bubble.classList.add("nova-formatted");
      wrapper.appendChild(bubble);
    } else {
      bubble.textContent = msg.text;
      wrapper.appendChild(bubble);
    }
    overviewFragment.appendChild(wrapper);
  });

  if (chatMessages) {
    chatMessages.appendChild(chatFragment);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  if (overviewMessages) {
    overviewMessages.appendChild(overviewFragment);
    overviewMessages.scrollTop = overviewMessages.scrollHeight;
  }
}

function renderConversationList() {
  if (!conversationList) return;
  conversationList.innerHTML = "";

  if (!state.conversations.length) {
    conversationList.innerHTML =
      '<div class="conversation-empty">No saved chats yet.</div>';
    return;
  }

  const listFragment = document.createDocumentFragment();

  state.conversations.forEach((conversation) => {
    const item = document.createElement("article");
    item.className = `conversation-item ${
      conversation.id === state.activeConversationId ? "active" : ""
    }`;
    item.innerHTML = `
      <button class="conversation-open" type="button">
        <strong>${escapeHtml(conversation.title)}</strong>
        <span>${formatConversationTime(conversation.updatedAt)}</span>
      </button>
      <button class="conversation-delete" type="button" aria-label="Delete ${escapeHtml(
        conversation.title
      )}">Delete</button>
    `;

    item.querySelector(".conversation-open").addEventListener("click", () => {
      state.activeConversationId = conversation.id;
      localStorage.setItem(NOVA_ACTIVE_CONVERSATION_KEY, state.activeConversationId);
      renderActiveConversation();
      renderConversationList();
    });

    item.querySelector(".conversation-delete").addEventListener("click", () => {
      deleteConversation(conversation.id);
    });

    listFragment.appendChild(item);
  });

  conversationList.appendChild(listFragment);
}

function deleteConversation(id) {
  state.conversations = state.conversations.filter((c) => c.id !== id);
  if (state.activeConversationId === id) {
    state.activeConversationId = state.conversations[0]?.id || "";
  }
  if (!state.activeConversationId) createConversation("New chat");
  persistConversations();
  deleteCloudConversation(id);
  renderActiveConversation();
  renderConversationList();
}

function clearAllChats() {
  const deletedIds = state.conversations.map((conversation) => conversation.id);
  state.conversations = [];
  state.activeConversationId = "";
  createConversation("New chat");
  deletedIds.forEach(deleteCloudConversation);
  renderActiveConversation();
  renderConversationList();
}

function persistConversations(options = {}) {
  state.conversations = state.conversations
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 20);
  store.set(getConversationStorageKey(), state.conversations);
  localStorage.setItem(NOVA_ACTIVE_CONVERSATION_KEY, state.activeConversationId);
  if (state.currentUser?.email) {
    localStorage.setItem(NOVA_CONVERSATION_OWNER_KEY, state.currentUser.email.toLowerCase());
  }
  if (options.sync !== false) scheduleCloudConversationSync();
}

async function loadCloudConversations() {
  if (!state.authToken) return;

  const data = await callNovaAuth(NOVA_API_ROUTES.sync, { method: "GET" });
  const cloudConversations = Array.isArray(data.conversations) ? data.conversations : [];
  const migrationCandidates = getLocalMigrationCandidates(cloudConversations);

  if (cloudConversations.length) {
    replaceConversations(cloudConversations);
    return;
  }

  if (migrationCandidates.length) {
    replaceConversations(migrationCandidates);
    await syncAllConversationsToCloud();
    return;
  }

  replaceConversations([]);
}

function replaceConversations(conversations = []) {
  const merged = new Map();

  conversations.forEach((conversation) => {
    const normalized = normalizeConversation(conversation);
    if (!normalized?.id) return;

    const existing = merged.get(normalized.id);
    if (!existing || Number(normalized.updatedAt || 0) >= Number(existing.updatedAt || 0)) {
      merged.set(normalized.id, normalized);
    }
  });

  state.conversations = [...merged.values()]
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .slice(0, 20);

  if (!state.activeConversationId || !getActiveConversation()) {
    state.activeConversationId = state.conversations[0]?.id || "";
  }

  if (!state.activeConversationId) {
    createConversation("New chat", { sync: false });
    return;
  }

  persistConversations({ sync: false });
  renderActiveConversation();
  renderConversationList();
}

function getLocalMigrationCandidates(cloudConversations = []) {
  if (cloudConversations.length) return [];

  const currentOwner = state.currentUser?.email?.toLowerCase() || "";
  const storedOwner = localStorage.getItem(NOVA_CONVERSATION_OWNER_KEY) || "";

  if (storedOwner && storedOwner !== currentOwner) return [];

  const userScoped = store.get(getConversationStorageKey(), []);
  if (Array.isArray(userScoped) && userScoped.length) return userScoped;

  const legacy = store.get(NOVA_CONVERSATIONS_KEY, []);
  return Array.isArray(legacy) ? legacy : [];
}

function getConversationStorageKey() {
  const email = state.currentUser?.email?.toLowerCase();
  return email ? `${NOVA_CONVERSATIONS_KEY}:${encodeURIComponent(email)}` : NOVA_CONVERSATIONS_KEY;
}

function clearVisibleConversations() {
  clearTimeout(state.syncTimer);
  state.conversations = [];
  state.activeConversationId = "";
  localStorage.removeItem(NOVA_CONVERSATIONS_KEY);
  localStorage.removeItem(NOVA_ACTIVE_CONVERSATION_KEY);
  localStorage.removeItem(NOVA_CONVERSATION_OWNER_KEY);
  if (chatMessages) chatMessages.innerHTML = "";
  if (overviewMessages) overviewMessages.innerHTML = "";
  renderConversationList();
}

function normalizeConversation(conversation) {
  if (!conversation || typeof conversation !== "object") return null;
  const now = Date.now();
  return {
    id: conversation.id || crypto.randomUUID(),
    title: conversation.title || "New chat",
    createdAt: Number(conversation.createdAt || now),
    updatedAt: Number(conversation.updatedAt || conversation.createdAt || now),
    messages: Array.isArray(conversation.messages)
      ? conversation.messages
          .filter((message) => message && message.type && typeof message.text === "string")
          .map((message) => ({
            type: message.type === "user" ? "user" : "ai",
            text: message.text,
            createdAt: Number(message.createdAt || now)
          }))
      : []
  };
}

function scheduleCloudConversationSync() {
  if (!state.authToken || state.isSyncingConversations) return;
  clearTimeout(state.syncTimer);
  state.syncTimer = window.setTimeout(syncAllConversationsToCloud, 900);
}

async function syncAllConversationsToCloud() {
  if (!state.authToken || state.isSyncingConversations) return;

  state.isSyncingConversations = true;

  try {
    for (const conversation of state.conversations) {
      await callNovaAuth(NOVA_API_ROUTES.sync, {
        method: "POST",
        body: JSON.stringify({
          action: "upsert",
          conversation: normalizeConversation(conversation)
        })
      });
    }
  } catch (error) {
    setAuthStatus(`Cloud sync paused: ${error.message}`);
  } finally {
    state.isSyncingConversations = false;
  }
}

async function deleteCloudConversation(id) {
  if (!state.authToken || !id) return;

  try {
    await callNovaAuth(NOVA_API_ROUTES.sync, {
      method: "POST",
      body: JSON.stringify({ action: "delete", id })
    });
  } catch (error) {
    setAuthStatus(`Cloud delete paused: ${error.message}`);
  }
}

function migrateSingleChatHistory() {
  const oldHistory = store.get("novaChatHistory", []);
  if (!oldHistory.length || state.conversations.length) return;

  state.conversations = [
    {
      id: crypto.randomUUID(),
      title: "Previous NOVA chat",
      createdAt: oldHistory[0]?.createdAt || Date.now(),
      updatedAt: oldHistory.at(-1)?.createdAt || Date.now(),
      messages: oldHistory
    }
  ];
  state.activeConversationId = state.conversations[0].id;
  persistConversations();
  localStorage.removeItem("novaChatHistory");
}

function buildConversationTitle(text) {
  return text.length > 42 ? `${text.slice(0, 42)}…` : text;
}

function formatConversationTime(timestamp) {
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function addTypingMessage(container) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper ai";

  const bubble = document.createElement("div");
  bubble.className = "message ai typing-bubble";
  bubble.innerHTML = `
    <span class="typing">
      <span></span>
      <span></span>
      <span></span>
    </span>`;

  wrapper.appendChild(bubble);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
  return wrapper;
}

function trimMessages(container) {
  while (container.children.length > 40) {
    container.removeChild(container.firstElementChild);
  }
}

// ─── Voice Mode ───────────────────────────────────────────────────────────────

function toggleVoiceMode() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (voiceStatus) {
      voiceStatus.textContent =
        "Voice recognition isn't supported in this browser. Try Chrome on desktop or Android.";
    }
    return;
  }

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.lang =
      state.settings.language === "hi"
        ? "hi-IN"
        : state.settings.language === "bn"
        ? "bn-IN"
        : "en-US";
    recognition.interimResults = false;

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      if (voiceStatus) voiceStatus.textContent = `You said: ${transcript}`;
      const response = await askFreeAI(transcript).catch(() =>
  buildFallbackResponse(transcript)
);

const cleanResponse = cleanAIResponse(response);

if (voiceStatus) {
  voiceStatus.textContent = cleanResponse;
}

speakResponse(cleanResponse);

saveChatMessage("user", transcript);
saveChatMessage("ai", cleanResponse);
    };

    recognition.onend = () => setVoiceState(false);
  }

  if (isListening) {
    recognition.stop();
    setVoiceState(false);
  } else {
    recognition.start();
    setVoiceState(true);
  }
}

function setVoiceState(active) {
  isListening = active;
  voiceOrb?.classList.toggle("listening", active);
  if (voiceToggle) voiceToggle.textContent = active ? "Stop Listening" : "Start Listening";
  if (active && voiceStatus) voiceStatus.textContent = "Listening…";
}

function speakResponse(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}

// ─── Command Palette ─────────────────────────────────────────────────────────

const commands = [
  { label: "Open AI Chat", panel: "ai-chat" },
  { label: "Open Voice Mode", panel: "voice-mode" },
  { label: "Open AI Studio", panel: "studio" },
  { label: "Open Planner", panel: "planner" },
  { label: "Open Tasks", panel: "tasks" },
  { label: "Open Cloud Sync", panel: "cloud" },
  { label: "Open Settings", panel: "settings" },
  { label: "Start New Chat", action: startNewChat }
];

function openCommandPalette() {
  commandPalette?.classList.add("open");
  commandPalette?.setAttribute("aria-hidden", "false");
  if (commandInput) commandInput.value = "";
  renderCommands();
  commandInput?.focus();
}

function closeCommandPalette() {
  commandPalette?.classList.remove("open");
  commandPalette?.setAttribute("aria-hidden", "true");
}

function renderCommands() {
  if (!commandResults) return;
  const query = commandInput?.value.toLowerCase() || "";
  commandResults.innerHTML = "";

  const fragment = document.createDocumentFragment();

  commands
    .filter((cmd) => cmd.label.toLowerCase().includes(query))
    .forEach((cmd) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = cmd.label;
      button.addEventListener("click", () => {
        if (cmd.panel) {
          window.location.hash = cmd.panel;
          activatePanel(cmd.panel);
        }
        if (cmd.action) cmd.action();
        closeCommandPalette();
      });
      fragment.appendChild(button);
    });

  commandResults.appendChild(fragment);
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

function renderTasks() {
  taskList.innerHTML = "";
  if (!state.tasks.length) {
    taskList.innerHTML =
      '<li class="task-item"><span>No tasks yet. Add your next focused move.</span></li>';
    return;
  }

  const fragment = document.createDocumentFragment();

  state.tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item ${task.completed ? "completed" : ""}`;
    item.innerHTML = `
      <input type="checkbox" ${task.completed ? "checked" : ""} aria-label="Complete task">
      <span>${escapeHtml(task.text)}</span>
      <button type="button">Delete</button>
    `;
    item.querySelector("input").addEventListener("change", () => {
      task.completed = !task.completed;
      persistTasks();
    });
    item.querySelector("button").addEventListener("click", () => {
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
      persistTasks();
    });
    fragment.appendChild(item);
  });

  taskList.appendChild(fragment);
}

// ─── Saved Prompts ────────────────────────────────────────────────────────────

function renderPrompts() {
  promptList.innerHTML = "";
  if (!state.prompts.length) {
    promptList.innerHTML = '<div class="prompt-item"><span>No saved prompts yet.</span></div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  state.prompts.forEach((prompt) => {
    const item = document.createElement("div");
    item.className = "prompt-item";
    item.innerHTML = `
      <span>${escapeHtml(prompt.text)}</span>
      <button type="button">Delete</button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      state.prompts = state.prompts.filter((p) => p.id !== prompt.id);
      persistPrompts();
    });
    fragment.appendChild(item);
  });

  promptList.appendChild(fragment);
}

function savePrompt(text) {
  state.prompts.unshift({ id: crypto.randomUUID(), text, createdAt: Date.now() });
  persistPrompts();
  activatePanel("saved-prompts");
  window.location.hash = "saved-prompts";
}

// ─── Persist Helpers ──────────────────────────────────────────────────────────

function persistTasks() {
  store.set("novaTasks", state.tasks);
  renderTasks();
  updateCounters();
}

function persistPrompts() {
  store.set("novaPrompts", state.prompts);
  renderPrompts();
  updateCounters();
}

function persistSettings() {
  store.set("novaSettings", state.settings);
  applySettings();
}

// ─── Settings & Theming ───────────────────────────────────────────────────────

function applySettings() {
  document.body.classList.toggle("light-mode", state.settings.light);
  document.body.classList.toggle("compact-ui", state.settings.compact);
  document.body.dataset.accent = state.settings.accent;
  document.body.dataset.wallpaper = state.settings.wallpaper;
  document.body.dataset.mode = state.settings.mode;

  const fields = {
    themeToggle: (el) => (el.checked = state.settings.light),
    compactToggle: (el) => (el.checked = state.settings.compact),
    accentSelect: (el) => (el.value = state.settings.accent),
    wallpaperSelect: (el) => (el.value = state.settings.wallpaper),
    languageSelect: (el) => (el.value = state.settings.language),
    modeSelect: (el) => (el.value = state.settings.mode)
  };

  Object.entries(fields).forEach(([id, apply]) => {
    const el = document.getElementById(id);
    if (el) apply(el);
  });

  updateModeSuggestion();
}

function updateModeSuggestion() {
  const themePreview = document.getElementById("themePreview");
  if (!themePreview) return;
  const modeText = {
    freelancer: "Proposal writing, client tasks, invoices, and outreach.",
    agency: "Campaign planning, team execution, and reporting workflows.",
    creator: "Content ideas, thumbnails, captions, and posting schedules.",
    student: "Study plans, notes, assignments, and focus sessions."
  };
  themePreview.querySelector("small").textContent =
    modeText[state.settings.mode] || modeText.freelancer;
}

// ─── Render All ───────────────────────────────────────────────────────────────

function renderAll() {
  renderTasks();
  renderPrompts();
  updateCounters();
}

// ─── Greeting ─────────────────────────────────────────────────────────────────

function setGreeting() {
  const hour = new Date().getHours();
  let greeting = "Good Evening";
  if (hour < 12) greeting = "Good Morning";
  else if (hour < 17) greeting = "Good Afternoon";

  const name = state.currentUser?.name || "Rohan";
  if (greetingTitle) greetingTitle.textContent = `${greeting}, ${name}`;
  if (greetingSubtitle) {
    greetingSubtitle.textContent =
      "Build, plan, and automate your next focused move with NOVA.";
  }
}

// ─── Counters ─────────────────────────────────────────────────────────────────

function updateCounters() {
  const rc = document.getElementById("requestCount");
  const tc = document.getElementById("taskCount");
  const pc = document.getElementById("promptCount");
  if (rc) rc.textContent = state.requestCount;
  if (tc) tc.textContent = state.tasks.filter((t) => !t.completed).length;
  if (pc) pc.textContent = state.prompts.length;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

function dismissLoader() {
  if (!startupLoader) return;
  window.setTimeout(() => startupLoader.classList.add("hidden"), 850);
}

// ─── Document Generation ──────────────────────────────────────────────────────

async function generateDocument() {
  const type = document.getElementById("docType").value;
  const input =
    document.getElementById("docInput").value.trim() ||
    "a premium AI productivity project";
  let output;
  try {
    const response = await callNovaBackend(NOVA_API_ROUTES.document, { type, input });
    output = response.text;
  } catch {
    output = createLocalDocument(type, input);
  }
  document.getElementById("docOutput").textContent = output;
  state.prompts.unshift({
    id: crypto.randomUUID(),
    text: `Generated ${type}: ${input}`,
    createdAt: Date.now()
  });
  persistPrompts();
}

function createLocalDocument(type, input) {
  return `NOVA ${type.toUpperCase()}\n\nObjective:\n${input}\n\nSuggested Structure:\n1. Start with a clear hook and context.\n2. Present the most important achievement or value proposition.\n3. Add specific proof, metrics, or examples.\n4. Close with a confident next step.\n\nPolished Draft:\nDear reader,\n\nI am sharing this ${type} to communicate a focused, high-quality outcome around ${input}. The goal is to make the message concise, useful, and professional while keeping a premium tone.\n\nKey points:\n- Clear purpose and audience fit\n- Strong opening statement\n- Practical evidence and outcomes\n- Confident call to action\n\nBest,\nNOVA AI`;
}

async function copyDocument() {
  const text = document.getElementById("docOutput").textContent;
  await navigator.clipboard?.writeText(text);
}

function downloadDocument() {
  const text = document.getElementById("docOutput").textContent;
  const blob = new Blob([text], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "nova-ai-document.txt";
  link.click();
  URL.revokeObjectURL(link.href);
}

// ─── Image Generation ─────────────────────────────────────────────────────────

const imageGenerationMessages = [
  "\uD83E\uDDE0 Understanding prompt...",
  "\uD83C\uDFA8 Planning composition...",
  "\u2728 Creating visual concepts...",
  "\uD83C\uDF08 Selecting colors...",
  "\uD83D\uDE80 Enhancing details...",
  "\u26A1 Rendering image...",
  "\uD83D\uDD2E Optimizing quality..."
];
let imageStatusTimer = null;
let imageStatusFadeTimer = null;
let imageTitleFadeTimer = null;
let imageSuccessTimer = null;
let imageSkeletonCount = 0;
const freshImageIds = new Set();
function getPromptVariations(type) {

  const variationMap = {

    Wallpaper: [
  "cinematic composition",
  "ultra realistic photography",
  "epic environment design",
  "creative artistic interpretation"
],

    Logo: [
      "minimalist style",
      "premium luxury style",
      "modern futuristic style",
      "creative geometric style"
    ],

    Thumbnail: [
      "viral youtube style",
      "high contrast style",
      "professional creator style",
      "clickworthy composition"
    ],

    Poster: [
      "cinematic poster style",
      "advertising campaign style",
      "premium marketing style",
      "minimal modern style"
    ],

    "Social Graphic": [
      "instagram style",
      "linkedin professional style",
      "facebook advertising style",
      "modern social design"
    ]
  };

  return variationMap[type] || [];
}

  function enhancePrompt(prompt, type) {
  const styles = {
    Logo: "professional logo design, vector, clean branding, premium quality",
    Wallpaper: "ultra HD wallpaper, cinematic lighting, detailed environment",
    Thumbnail: "viral youtube thumbnail, high contrast, eye catching",
    Poster: "professional advertising poster, marketing quality",
    "Social Graphic": "modern social media graphic, engaging design"
  };

  return `${prompt}, ${styles[type] || ""}, highly detailed, 8k quality, professional composition`;
}

function getRandomStyle() {

  const styles = [
    "photorealistic",
    "cinematic photography",
    "concept art",
    "fantasy illustration",
    "digital painting",
    "3D render",
    "ultra realistic",
    "award winning artwork"
  ];

  return styles[
    Math.floor(Math.random() * styles.length)
  ];
}

async function generateImage() {
  const loading = document.getElementById("imageLoading");
  const generateButton = document.getElementById("generateImageBtn");

  if (loading) loading.style.display = "block";
  if (generateButton) generateButton.disabled = true;

  const type = document.getElementById("imageType").value;
  const prompt =
    document.getElementById("imagePrompt").value.trim() ||
    "NOVA AI futuristic SaaS platform neon blue purple";
  const imageStyles = {   "Logo": "professional logo design",   "Wallpaper": "high quality wallpaper",   "Thumbnail": "youtube thumbnail",   "Poster": "professional advertising poster",   "Social Graphic": "social media graphic" };  const fullPrompt = `${prompt}, ${imageStyles[type] || ""}`;
  const imageCount = Number(document.getElementById("imageCount").value);

  imageSkeletonCount = imageCount;
  renderImages();
  showImageGenerationOverlay(imageCount);

  try {
    const artStyles = [
  "digital art",
  "photorealistic",
  "cinematic",
  "concept art"
];
    const variations = getPromptVariations(type);
   

    for (let i = 0; i < imageCount; i++) {
      updateImageGenerationOverlay(i, imageCount);

      if (i > 0) {
        await delay(1400);
      }

  const randomSeed =
Date.now() +
Math.floor(Math.random() * 9999999);

const imagePrompt = `
${fullPrompt}
Art Style:
${getRandomStyle()}

STYLE: ${variations[i] || "unique style"}

Camera:
${[
  "close up shot",
  "wide angle shot",
  "bird eye view",
  "cinematic perspective"
][i % 4]}

Lighting:
${[
  "golden hour",
  "neon lighting",
  "dramatic shadows",
  "soft studio lighting"
][i % 4]}

Color Palette:
${[
  "blue and purple",
  "orange and teal",
  "black and gold",
  "vibrant rainbow"
][i % 4]}

Composition:
${[
  "centered subject",
  "rule of thirds",
  "symmetrical design",
  "dynamic diagonal composition"
][i % 4]}

Variation ${i + 1}
Different composition
Different camera angle
Different perspective
Different color palette
Ultra detailed
High quality

Seed: ${randomSeed}
`;
      const response = await generateImageWithRetry({ prompt: imagePrompt, type });
      const image = {
        id: crypto.randomUUID(),
        prompt: `${prompt} (${i + 1})`,
        url: response.url,
        createdAt: Date.now()
      };

      freshImageIds.add(image.id);
      state.images.unshift(image);
      state.images = state.images.slice(0, 50);
      store.set("novaImages", state.images);
      imageSkeletonCount = Math.max(0, imageSkeletonCount - 1);
      updateImageProgress(Math.round(((i + 1) / imageCount) * 100));
      renderImages();
    }

    showImageGenerationSuccess();
    await delay(2200);
  } catch (error) {
    setImageGenerationStatus(error.message || "Image generation paused. Please try again.");
    await delay(1300);
  } finally {
    imageSkeletonCount = 0;
    renderImages();
    hideImageGenerationOverlay();
    if (loading) loading.style.display = "none";
    if (generateButton) generateButton.disabled = false;
  }
}

// Pollinations can briefly rate-limit bursts; this keeps retries inside image generation only.
async function generateImageWithRetry(payload, attempt = 1) {
  try {
    const response = await callNovaImageBackend(payload);
    await waitForGeneratedImageLoad(response.url);
    return response;
  } catch (error) {
    if (error.status === 429 && attempt <= 3) {
      setImageGenerationStatus("\u26A0\uFE0F Pollinations is busy. Retrying...");
      await delay(1800 * attempt);
      return generateImageWithRetry(payload, attempt + 1);
    }

    throw error;
  }
}

async function callNovaImageBackend(payload) {
  const headers = { "Content-Type": "application/json" };

  if (state.authToken) {
    headers.Authorization = `Bearer ${state.authToken}`;
  }

  const response = await fetch(`${NOVA_BACKEND_BASE_URL}${NOVA_API_ROUTES.image}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.error || "Image generation failed.");
    error.status = response.status;
    throw error;
  }

  return data;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForGeneratedImageLoad(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error("Image generation did not return a valid URL."));
      return;
    }

    const image = new Image();
    const timeout = window.setTimeout(() => {
      image.onload = null;
      image.onerror = null;
      reject(new Error("Image is taking too long to load. Please try again."));
    }, 45000);

    image.onload = () => {
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      resolve();
    };

    image.onerror = () => {
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      const error = new Error("\u26A0\uFE0F Pollinations is busy. Retrying...");
      error.status = 429;
      reject(error);
    };

    image.src = url;
  });
}

// Overlay helpers are created once and reused to avoid duplicate DOM work/listeners.
function showImageGenerationOverlay(total) {
  const overlay = document.getElementById("imageGenerationOverlay");
  const success = document.getElementById("imageGenerationSuccess");
  if (!overlay) return;

  overlay.classList.add("active");
  overlay.classList.remove("success");
  overlay.setAttribute("aria-hidden", "false");
  if (success) success.hidden = true;
  updateImageProgress(0);
  updateImageGenerationOverlay(0, total);
  startImageStatusRotation();
}

function hideImageGenerationOverlay() {
  const overlay = document.getElementById("imageGenerationOverlay");
  if (!overlay) return;

  stopImageStatusRotation();
  clearTimeout(imageTitleFadeTimer);
  clearTimeout(imageStatusFadeTimer);
  clearTimeout(imageSuccessTimer);
  overlay.classList.remove("active");
  overlay.classList.remove("success");
  overlay.setAttribute("aria-hidden", "true");
}

function startImageStatusRotation() {
  stopImageStatusRotation();
  let index = 0;

  setImageGenerationStatus(imageGenerationMessages[index]);
  imageStatusTimer = window.setInterval(() => {
    index = (index + 1) % imageGenerationMessages.length;
    setImageGenerationStatus(imageGenerationMessages[index]);
  }, 1350);
}

function stopImageStatusRotation() {
  if (imageStatusTimer) {
    clearInterval(imageStatusTimer);
    imageStatusTimer = null;
  }
}

function updateImageGenerationOverlay(index, total) {
  const title = document.getElementById("imageGenerationTitle");
  if (!title) return;

  clearTimeout(imageTitleFadeTimer);
  title.classList.add("fading");
  imageTitleFadeTimer = window.setTimeout(() => {
    title.textContent = `Generating image ${index + 1} of ${total}...`;
    title.classList.remove("fading");
  }, 160);
}

function setImageGenerationStatus(message) {
  const status = document.getElementById("imageGenerationStatus");
  if (!status) return;

  clearTimeout(imageStatusFadeTimer);
  status.classList.add("fading");
  imageStatusFadeTimer = window.setTimeout(() => {
    status.textContent = message;
    status.classList.remove("fading");
  }, 160);
}

function updateImageProgress(percent) {
  const ring = document.getElementById("imageProgressRing");
  const text = document.getElementById("imageProgressText");
  const safePercent = Math.max(0, Math.min(100, percent));

  if (ring) ring.style.setProperty("--progress", `${safePercent}%`);
  if (ring) ring.style.setProperty("--progress-angle", `${safePercent * 3.6}deg`);
  if (text) text.textContent = `${safePercent}%`;
}

function showImageGenerationSuccess() {
  const success = document.getElementById("imageGenerationSuccess");
  const overlay = document.getElementById("imageGenerationOverlay");
  if (!success) return;

  updateImageProgress(100);
  stopImageStatusRotation();
  setImageGenerationStatus("\u2705 Finalizing output...");
  if (overlay) overlay.classList.add("success");
  success.hidden = false;
  clearTimeout(imageSuccessTimer);
  imageSuccessTimer = window.setTimeout(() => {
    success.hidden = true;
    if (overlay) overlay.classList.remove("success");
  }, 1400);
}

function createPlaceholderImage(prompt) {
  const svg = `
    <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="768" height="512" viewBox="0 0 768 512">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#6C63FF"/>
          <stop offset="1" stop-color="#00D4FF"/>
        </linearGradient>
      </defs>
      <rect width="768" height="512" rx="28" fill="#060816"/>
      <rect x="36" y="36" width="696" height="440" rx="24" fill="url(#bg)" opacity="0.22"/>
      <text x="54" y="96" fill="#FFFFFF" font-family="Arial" font-size="34" font-weight="700">NOVA AI Image Brief</text>
      <foreignObject x="54" y="130" width="660" height="280">
        <div xmlns="[http://www.w3.org/1999/xhtml](http://www.w3.org/1999/xhtml)" style="color:white;font-family:Arial;font-size:22px;line-height:1.45">${escapeHtml(prompt)}</div>
      </foreignObject>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function renderImages() {
  const gallery = document.getElementById("imageGallery");
  if (!gallery) return;

  gallery.innerHTML = state.images.length || imageSkeletonCount
    ? ""
    : '<p class="conversation-empty">Generated images will appear here.</p>';

  const fragment = document.createDocumentFragment();

const searchTerm =
  document.getElementById("imageSearch")
    ?.value
    .toLowerCase() || "";

const filteredImages = state.images.filter(image =>
  image.prompt.toLowerCase().includes(searchTerm)
);

filteredImages.forEach((image) => {
    const card = document.createElement("article");
    if (freshImageIds.has(image.id)) {
      card.classList.add("image-card-enter");
      window.setTimeout(() => freshImageIds.delete(image.id), 700);
    }

    card.innerHTML = `
  <img src="${image.url}" alt="${escapeHtml(image.prompt)}">
  <p>${escapeHtml(image.prompt)}</p>

  <div class="image-actions">
    <button class="download-image-btn">⬇ Download JPG</button>
    <button class="delete-image-btn">🗑 Delete</button>
  </div>
`;
    card.querySelector(".download-image-btn").addEventListener("click", async () => {
  try {
    const response = await fetch(image.url);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `nova-ai-${Date.now()}.jpg`;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download failed:", error);
  }
});
card.querySelector(".delete-image-btn").addEventListener("click", () => {
  state.images = state.images.filter(img => img.id !== image.id);

  store.set("novaImages", state.images);

  renderImages();
});
    const imageElement = card.querySelector("img");

imageElement.style.cursor = "pointer";

imageElement.addEventListener("click", () => {
  document.getElementById("imageModal").style.display = "flex";

  document.getElementById("modalImage").src = image.url;

  document.getElementById("modalPrompt").textContent =
    image.prompt;
});

    fragment.appendChild(card);
  });

  for (let index = 0; index < imageSkeletonCount; index += 1) {
    const skeleton = document.createElement("article");
    skeleton.className = "image-skeleton-card";
    skeleton.innerHTML = `
      <div class="image-skeleton-frame"></div>
      <div class="image-skeleton-line"></div>
      <div class="image-actions">
        <span class="image-skeleton-button"></span>
        <span class="image-skeleton-button"></span>
      </div>
    `;
    fragment.appendChild(skeleton);
  }

  gallery.appendChild(fragment);
}

// ─── Planner ──────────────────────────────────────────────────────────────────

async function generatePlan() {
  const input =
    document.getElementById("plannerInput").value.trim() ||
    "finish priority tasks, study, and ship one project improvement";
  let blocks;
  try {
    const response = await callNovaBackend(NOVA_API_ROUTES.planner, { input });
    blocks = response.blocks;
  } catch {
    blocks = [
      ["09:00", "Deep work", `Start with the hardest part of: ${input}`],
      ["11:00", "AI assist", "Use NOVA to summarize, draft, or generate missing assets."],
      ["14:00", "Execution sprint", "Complete the next visible deliverable and update tasks."],
      ["17:00", "Review", "Check progress, save prompts, and plan tomorrow."]
    ];
  }
  state.planner = blocks.map((block) => {
    const [time, title, text] = Array.isArray(block)
      ? block
      : [block.time, block.title, block.text];
    return { id: crypto.randomUUID(), time, title, text };
  });
  store.set("novaPlanner", state.planner);
  renderPlanner();
}

function renderPlanner() {
  const timeline = document.getElementById("plannerTimeline");
  if (!timeline) return;
  timeline.innerHTML = state.planner.length
    ? ""
    : '<p class="conversation-empty">Generate a plan to build your day.</p>';

  const fragment = document.createDocumentFragment();

  state.planner.forEach((block) => {
    const item = document.createElement("article");
    item.className = "planner-block";
    item.innerHTML = `<span>${block.time}</span><strong>${escapeHtml(
      block.title
    )}</strong><p>${escapeHtml(block.text)}</p>`;
    fragment.appendChild(item);
  });

  timeline.appendChild(fragment);
}

// ─── Memory Export ────────────────────────────────────────────────────────────

function exportMemory() {
  const data = {
    conversations: state.conversations,
    prompts: state.prompts,
    tasks: state.tasks,
    settings: state.settings,
    planner: state.planner,
    images: state.images,
    user: state.currentUser,
    auth: state.authToken ? "authenticated" : "guest"
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "nova-ai-memory.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

// ─── Quote ────────────────────────────────────────────────────────────────────

async function loadQuote() {
  const quoteText = document.getElementById("quoteText");
  const quoteAuthor = document.getElementById("quoteAuthor");

  try {
    const response = await fetch("[https://api.quotable.io/random](https://api.quotable.io/random)");
    if (!response.ok) throw new Error("Quote request failed");
    const data = await response.json();
    if (quoteText) quoteText.textContent = `"${data.content}"`;
    if (quoteAuthor) quoteAuthor.textContent = data.author ? `— ${data.author}` : "";
  } catch {
    if (quoteText) quoteText.textContent = "Small focused actions compound into serious momentum.";
    if (quoteAuthor) quoteAuthor.textContent = "— NOVA AI";
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  if (!value) return "";
  return String(value).replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])
  );
}

// ─── Ambient Effects ──────────────────────────────────────────────────────────

function addCursorGlow() {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  glow.style.willChange = "transform, opacity";
  document.body.appendChild(glow);

  let transformX = 0;
  let transformY = 0;
  let isMoving = false;

  const updateGlowPosition = () => {
    glow.style.transform = `translate3d(${transformX - 110}px, ${transformY - 110}px, 0)`;
    isMoving = false;
  };

  window.addEventListener("pointermove", (event) => {
    transformX = event.clientX;
    transformY = event.clientY;
    glow.style.opacity = "1";
    
    if (!isMoving) {
      requestAnimationFrame(updateGlowPosition);
      isMoving = true;
    }
  }, { passive: true });

  window.addEventListener("pointerleave", () => {
    glow.style.opacity = "0";
  }, { passive: true });
}

function createParticles() {
  const scene = document.querySelector(".ambient-scene");
  if (!scene) return;

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < 28; i++) {
    const particle = document.createElement("span");
    particle.className = "particle";
    particle.style.setProperty("--x", `${Math.random() * 100}%`);
    particle.style.setProperty("--y", `${Math.random() * 100}%`);
    particle.style.setProperty("--size", `${Math.random() * 2.2 + 1}px`);
    particle.style.setProperty("--duration", `${Math.random() * 8 + 8}s`);
    particle.style.setProperty("--delay", `${Math.random() * -10}s`);
    fragment.appendChild(particle);
  }

  scene.appendChild(fragment);
}

// ─── Service Worker ───────────────────────────────────────────────────────────

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .then((registration) => registration.update())
      .catch(() => {});
  }
  document
  .getElementById("closeImageModal")
  ?.addEventListener("click", () => {

    document.getElementById("imageModal")
      .style.display = "none";
});

document
  .getElementById("imageModal")
  ?.addEventListener("click", (e) => {

    if (e.target.id === "imageModal") {

      document.getElementById("imageModal")
        .style.display = "none";
    }
});
}

