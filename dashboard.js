const NOVA_BACKEND_BASE_URL = (window.NOVA_BACKEND_BASE_URL || "").replace(/\/$/, "");
const NOVA_AUTH_TOKEN_KEY = "novaAuthToken";
const NOVA_LOGIN_PAGE = "login.html";
const NOVA_CONVERSATIONS_KEY = "novaConversations";
const NOVA_ACTIVE_CONVERSATION_KEY = "novaActiveConversationId";
const NOVA_CONVERSATION_OWNER_KEY = "novaConversationOwnerEmail";
const NOVA_API_ROUTES = {
  ai: "/api/ai",
  auth: "/api/auth",
  sync: "/api/sync"
};

// â”€â”€â”€ Local Storage Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Application State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  websites: store.get("novaWebsites", []),
  activeWebsiteId: localStorage.getItem("novaActiveWebsiteId") || "",
  currentWebsite: null,
  currentWebsitePrompt: "",
  activeWebsiteCodeTab: "index.html",
  websiteSyncTimer: null,
  isSyncingWebsites: false,
  videos: store.get("novaVideos", []),
  activeVideoId: localStorage.getItem("novaActiveVideoId") || "",
  videoSyncTimer: null,
  isSyncingVideos: false,
  planner: store.get("novaPlanner", []),
  currentUser: null,
  authToken: localStorage.getItem(NOVA_AUTH_TOKEN_KEY) || "",
  syncTimer: null,
  isSyncingConversations: false,
  requestCount: Number(localStorage.getItem("novaRequestCount") || 0),
  lastUserPrompt: "",
  generatedPrompt: ""
};

// â”€â”€â”€ DOM References â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
const websitePrompt = document.getElementById("websitePrompt");
const websitePromptCount = document.getElementById("websitePromptCount");
const websiteStatus = document.getElementById("websiteStatus");
const websiteProjectInfo = document.getElementById("websiteProjectInfo");
const websitePreviewFrame = document.getElementById("websitePreviewFrame");
const websitePreviewShell = document.getElementById("websitePreviewShell");
const websiteCodeViewer = document.getElementById("websiteCodeViewer");
const generateWebsiteBtn = document.getElementById("generateWebsiteBtn");
const regenerateWebsiteBtn = document.getElementById("regenerateWebsiteBtn");
const downloadWebsiteBtn = document.getElementById("downloadWebsiteBtn");
const downloadWebsiteHtmlBtn = document.getElementById("downloadWebsiteHtmlBtn");
const copyWebsiteBtn = document.getElementById("copyWebsiteBtn");
const editWebsiteBtn = document.getElementById("editWebsiteBtn");
const duplicateWebsiteBtn = document.getElementById("duplicateWebsiteBtn");
const enhanceWebsitePromptBtn = document.getElementById("enhanceWebsitePromptBtn");
const websiteEditPrompt = document.getElementById("websiteEditPrompt");
const websiteHistory = document.getElementById("websiteHistory");
const websiteHistorySearch = document.getElementById("websiteHistorySearch");
const websiteProgressBar = document.getElementById("websiteProgressBar");

let recognition = null;
let isListening = false;

// â”€â”€â”€ AI Studio Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Initialisation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

bootstrapDashboard();

async function bootstrapDashboard() {
  try {
    const canOpenDashboard = await requireDashboardSession();
    if (!canOpenDashboard) return;

    createParticles();
    addCursorGlow();
    setGreeting();
    applySettings();
    renderAll();
    loadQuote();
    restoreChat();
    restoreWebsites();
    restoreVideos();
    renderImages();
    renderPlanner();
    activatePanelFromHash();
    updateAuthUI();
    initializeAuthSession();
  } catch (error) {
    console.error("Dashboard initialization error:", error);
  } finally {
    dismissLoader();
    registerServiceWorker();
  }
}

async function requireDashboardSession() {
  if (!state.authToken) {
    redirectToLogin();
    return false;
  }

  try {
    const data = await callNovaAuth(NOVA_API_ROUTES.auth, { method: "POST", body: JSON.stringify({ action: "me" }) });
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

// â”€â”€â”€ Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    renderVideoHistory();
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

// â”€â”€â”€ Tasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

taskForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  state.tasks.unshift({ id: crypto.randomUUID(), text, completed: false });
  taskInput.value = "";
  persistTasks();
});

// â”€â”€â”€ Prompts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Conversations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

document.getElementById("newChatBtn")?.addEventListener("click", startNewChat);
document.getElementById("clearAllChatsBtn")?.addEventListener("click", clearAllChats);

// â”€â”€â”€ AI Studio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

document.querySelectorAll(".dashboard-tools .tool-card button").forEach((button) => {
  button.addEventListener("click", async () => {
    const card = button.closest(".tool-card");
    const textarea = card.querySelector("textarea");
    const type = textarea.dataset.template;
    const input = textarea.value.trim() || "a new AI productivity workflow";
    const prompt = templates[type](input);

    generatedPrompt.textContent = "NOVA is thinkingâ€¦";

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

websitePrompt?.addEventListener("input", updateWebsitePromptCount);
websiteHistorySearch?.addEventListener("input", renderWebsiteHistory);
generateWebsiteBtn?.addEventListener("click", () => generateWebsite());
regenerateWebsiteBtn?.addEventListener("click", () =>
  generateWebsite("Improve the previous result with stronger visual polish, sharper copy, and the same user intent.")
);
downloadWebsiteBtn?.addEventListener("click", downloadWebsiteZip);
downloadWebsiteHtmlBtn?.addEventListener("click", downloadWebsiteHtml);
copyWebsiteBtn?.addEventListener("click", copyWebsiteCode);
editWebsiteBtn?.addEventListener("click", editWebsite);
duplicateWebsiteBtn?.addEventListener("click", duplicateActiveWebsite);
enhanceWebsitePromptBtn?.addEventListener("click", enhanceWebsitePrompt);

document.querySelectorAll("[data-website-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!websitePrompt) return;
    websitePrompt.value = button.dataset.websitePrompt || "";
    updateWebsitePromptCount();
    websitePrompt.focus();
  });
});

document.querySelectorAll("[data-preview-size]").forEach((button) => {
  button.addEventListener("click", () => setWebsitePreviewSize(button.dataset.previewSize));
});

document.querySelectorAll("[data-code-tab]").forEach((button) => {
  button.addEventListener("click", () => setWebsiteCodeTab(button.dataset.codeTab));
});

// â”€â”€â”€ Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Feature Buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    promptBox.value =
      enhancePrompt(promptBox.value, type);
});
document
  .getElementById("imagePrompt")
  ?.addEventListener("input", (e) => {
    delete e.target.dataset.enhanced;
});
document.getElementById("imageSearch")?.addEventListener("input", renderImages);
document.getElementById("generatePlanBtn")?.addEventListener("click", generatePlan);
document.getElementById("exportMemoryBtn")?.addEventListener("click", exportMemory);
document.getElementById("commandPill")?.addEventListener("click", openCommandPalette);
document.getElementById("refreshQuote")?.addEventListener("click", loadQuote);
voiceToggle?.addEventListener("click", toggleVoiceMode);

// â”€â”€â”€ Profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    try {
      await loadCloudConversations();
      await loadCloudWebsites();
      await loadCloudVideos();
      setAuthStatus(`Cloud sync active for ${state.currentUser?.name || "NOVA user"}.`);
    } catch (syncError) {
      console.error("Cloud sync load error:", syncError);
    }
    return;
  }

  setAuthStatus("Checking your NOVA cloud session...");

  try {
    const data = await callNovaAuth(NOVA_API_ROUTES.auth, { method: "POST", body: JSON.stringify({ action: "me" }) });
    state.currentUser = data.user || null;
    updateAuthUI();
    setGreeting();
  } catch {
    clearAuthSession();
    setAuthStatus("Session expired. Guest mode is active again.");
    return;
  }

  try {
    await loadCloudConversations();
    await loadCloudWebsites();
    await loadCloudVideos();
    setAuthStatus(`Cloud sync active for ${state.currentUser?.name || "NOVA user"}.`);
  } catch (syncError) {
    console.error("Cloud sync load error:", syncError);
    setAuthStatus(`Cloud sync pending: ${syncError.message}`);
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
    const data = await callNovaAuth(NOVA_API_ROUTES.auth, {
      method: "POST",
      body: JSON.stringify({ action: "login", email, password })
    });
    completeAuthSession(data);
    await loadCloudConversations();
    await loadCloudWebsites();
    await loadCloudVideos();
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
    const data = await callNovaAuth(NOVA_API_ROUTES.auth, {
      method: "POST",
      body: JSON.stringify({ action: "signup", name, email, password })
    });
    completeAuthSession(data);
    await loadCloudConversations();
    await loadCloudWebsites();
    await loadCloudVideos();
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
      await callNovaAuth(NOVA_API_ROUTES.auth, { method: "POST", body: JSON.stringify({ action: "logout" }) }).catch(() => {});
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
  clearVisibleWebsites();
  clearVisibleVideos();
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

// â”€â”€â”€ Command Palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

commandPalette?.addEventListener("click", (event) => {
  if (event.target === commandPalette) closeCommandPalette();
});

commandInput?.addEventListener("input", renderCommands);

// â”€â”€â”€ Panel Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Sidebar Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Chat & Conversations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function restoreChat() {
  migrateSingleChatHistory();

  if (!state.activeConversationId || !getActiveConversation()) {
    renderConversationList();
    return;
  }

  renderActiveConversation();
  renderConversationList();
}

async function askFreeAI(message) {
  const response = await callNovaBackend(
    NOVA_API_ROUTES.ai,
    {
      action: "chat",
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
  const errorText = await response.text();
  console.error("Backend Error:", errorText);

  throw new Error(
    `Backend Error ${response.status}: ${errorText}`
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
  return `I'm having trouble reaching the AI service right now.\n\nHere's a quick framework to move forward with **"${message}"**:\n\n1. **Clarify the goal** â€” What's the single most important outcome?\n2. **Break it down** â€” Identify 3 focused next steps.\n3. **Start with the fastest win** â€” Pick the step you can complete right now.\n4. **Save your best prompt** â€” Use the prompt library to reuse this later.\n\nTry again in a moment and NOVA will give you a full response.`;
}

// â”€â”€â”€ Message Rendering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// new file
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

// â”€â”€â”€ Conversation Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  try {
    const data = await callNovaAuth(`${NOVA_API_ROUTES.sync}?action=conversation`, { method: "GET" });
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
  } catch (error) {
    console.error("Failed to load cloud conversations:", error.message);
  }
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
          action: "conversation",
          subAction: "upsert",
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
      body: JSON.stringify({ action: "conversation", subAction: "delete", id })
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
  return text.length > 42 ? `${text.slice(0, 42)}â€¦` : text;
}

function formatConversationTime(timestamp) {
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

// â”€â”€â”€ Typing Indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Voice Mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  if (active && voiceStatus) voiceStatus.textContent = "Listeningâ€¦";
}

function speakResponse(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}

// â”€â”€â”€ Command Palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function updateWebsitePromptCount() {
  if (!websitePromptCount || !websitePrompt) return;
  websitePromptCount.textContent = `${websitePrompt.value.length} / 3000`;
}

function restoreWebsites() {
  state.websites = state.websites.map(normalizeWebsiteRecord).filter(Boolean);
  if (!state.activeWebsiteId || !state.websites.some((website) => website.id === state.activeWebsiteId)) {
    state.activeWebsiteId = state.websites[0]?.id || "";
  }
  state.currentWebsite = getActiveWebsite();
  renderWebsiteResult();
  renderWebsiteHistory();
}

function enhanceWebsitePrompt() {
  if (!websitePrompt) return;
  const value = websitePrompt.value.trim();
  if (!value) {
    websitePrompt.value = "Create a premium Italian restaurant website for an intimate dinner spot with a cinematic hero, chef story, signature menu, reservation CTA, gallery, reviews, location details, and warm editorial styling.";
  } else if (!value.includes("Include")) {
    websitePrompt.value = `${value}\n\nInternally analyze the industry, audience, brand personality, color psychology, content hierarchy, imagery, animations, page structure, accessibility, SEO, and responsive behavior. Preserve the original intent but generate a real custom website, not a template or prompt echo.`;
  }
  updateWebsitePromptCount();
}

async function generateWebsite(regenerateNote = "") {
  if (!websitePrompt || !generateWebsiteBtn) return;
  const active = getActiveWebsite();
  const prompt = websitePrompt.value.trim() || active?.prompt || regenerateNote.trim();
  const shouldUpdateActive = Boolean(regenerateNote && active);

  if (prompt.length < 12) {
    setWebsiteStatus("Describe the website in a little more detail.", false);
    websitePrompt.focus();
    return;
  }

  const steps = [
    "Planning Website...",
    "Analyzing Prompt...",
    "Designing Layout...",
    "Generating HTML...",
    "Generating CSS...",
    "Generating JavaScript...",
    "Optimizing Responsive Design...",
    "Creating Assets...",
    "Final Quality Check...",
    "Launching Preview..."
  ];
  let stepIndex = 0;
  let progress = 4;
  generateWebsiteBtn.disabled = true;
  if (regenerateWebsiteBtn) regenerateWebsiteBtn.disabled = true;
  if (downloadWebsiteBtn) downloadWebsiteBtn.disabled = true;
  if (downloadWebsiteHtmlBtn) downloadWebsiteHtmlBtn.disabled = true;
  if (copyWebsiteBtn) copyWebsiteBtn.disabled = true;
  if (editWebsiteBtn) editWebsiteBtn.disabled = true;
  if (duplicateWebsiteBtn) duplicateWebsiteBtn.disabled = true;
  setWebsiteStatus(steps[stepIndex], true);
  updateWebsiteProgress(progress);

  const progressTimer = window.setInterval(() => {
    stepIndex = Math.min(stepIndex + 1, steps.length - 1);
    progress = Math.min(progress + Math.ceil(92 / steps.length), 96);
    setWebsiteStatus(steps[stepIndex], true);
    updateWebsiteProgress(progress);
  }, 900);

  try {
    const website = await callNovaBackend(NOVA_API_ROUTES.ai, {
      action: "website",
      prompt,
      regenerateNote,
      existingHtml: regenerateNote && active ? active.html || active.files?.["index.html"] || "" : ""
    });
    const record = createWebsiteRecord(website, prompt, shouldUpdateActive ? active : null);
    upsertWebsiteRecord(record);
    updateWebsiteProgress(100);
    renderWebsiteResult();
    renderWebsiteHistory();
    setWebsiteStatus(`Preview launched with ${website.meta?.modelUsed || "AI model"}. Website saved to history.`, false);
    state.requestCount += 1;
    localStorage.setItem("novaRequestCount", String(state.requestCount));
    renderVideoHistory();
  updateCounters();
  } catch (error) {
    console.error(error);
    setWebsiteStatus("NOVA could not generate the website right now. Please retry.", false);
  } finally {
    window.clearInterval(progressTimer);
    generateWebsiteBtn.disabled = false;
    if (regenerateWebsiteBtn) regenerateWebsiteBtn.disabled = !state.currentWebsite;
    if (downloadWebsiteBtn) downloadWebsiteBtn.disabled = !state.currentWebsite;
    if (downloadWebsiteHtmlBtn) downloadWebsiteHtmlBtn.disabled = !state.currentWebsite;
    if (copyWebsiteBtn) copyWebsiteBtn.disabled = !state.currentWebsite;
    if (editWebsiteBtn) editWebsiteBtn.disabled = !state.currentWebsite;
    if (duplicateWebsiteBtn) duplicateWebsiteBtn.disabled = !state.currentWebsite;
    window.setTimeout(() => updateWebsiteProgress(0), 900);
  }
}

function setWebsiteStatus(message, loading) {
  if (!websiteStatus) return;
  websiteStatus.textContent = message;
  websiteStatus.classList.toggle("loading", Boolean(loading));
}

function updateWebsiteProgress(value) {
  if (!websiteProgressBar) return;
  websiteProgressBar.style.width = `${Math.max(0, Math.min(100, value))}%`;
}

function normalizeClientWebsite(website) {
  const html = website?.html || website?.files?.["index.html"] || "";
  return {
    meta: website?.meta || {},
    logs: website?.logs || {},
    html,
    files: { "index.html": html }
  };
}

function createWebsiteRecord(website, prompt, existing = null) {
  const normalized = normalizeClientWebsite(website);
  const now = Date.now();
  return normalizeWebsiteRecord({
    id: existing?.id || crypto.randomUUID(),
    name: existing?.name || normalized.meta.name || inferWebsiteName(prompt, normalized.meta.websiteType),
    prompt,
    websiteType: normalized.meta.websiteType || "Custom Website",
    thumbnail: extractFirstImage(normalized.files),
    html: normalized.html,
    modelUsed: normalized.meta.modelUsed || "",
    generationTimeMs: normalized.meta.generationTimeMs || normalized.logs?.totalMs || 0,
    logs: normalized.logs || {},
    meta: normalized.meta,
    files: normalized.files,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  });
}

function upsertWebsiteRecord(record) {
  state.websites = [record, ...state.websites.filter((website) => website.id !== record.id)].slice(0, 50);
  state.activeWebsiteId = record.id;
  state.currentWebsite = record;
  persistWebsites();
}

function renderWebsiteResult() {
  const website = getActiveWebsite();
  if (!website) return;
  const meta = website.meta || {};
  if (websiteProjectInfo) {
    websiteProjectInfo.innerHTML = `
      <span>Type: ${escapeHtml(meta.websiteType || "Custom Website")}</span>
      <span>Model: ${escapeHtml(website.modelUsed || meta.modelUsed || "Pending")}</span>
      <span>Time: ${Math.round((website.generationTimeMs || meta.generationTimeMs || 0) / 100) / 10}s</span>
    `;
  }
  renderWebsitePreview();
  setWebsiteCodeTab(state.activeWebsiteCodeTab || "index.html");
  if (regenerateWebsiteBtn) regenerateWebsiteBtn.disabled = false;
  if (downloadWebsiteBtn) downloadWebsiteBtn.disabled = false;
  if (downloadWebsiteHtmlBtn) downloadWebsiteHtmlBtn.disabled = false;
  if (copyWebsiteBtn) copyWebsiteBtn.disabled = false;
  if (editWebsiteBtn) editWebsiteBtn.disabled = false;
  if (duplicateWebsiteBtn) duplicateWebsiteBtn.disabled = false;
}

function renderWebsitePreview() {
  const website = getActiveWebsite();
  if (!websitePreviewFrame || !website) return;
  websitePreviewFrame.srcdoc = website.html || website.files?.["index.html"] || "";
}

function setWebsitePreviewSize(size = "desktop") {
  if (!websitePreviewShell) return;
  websitePreviewShell.classList.remove("desktop", "tablet", "mobile");
  websitePreviewShell.classList.add(size);
  document.querySelectorAll("[data-preview-size]").forEach((button) => {
    button.classList.toggle("active", button.dataset.previewSize === size);
  });
}

function setWebsiteCodeTab(tab = "index.html") {
  state.activeWebsiteCodeTab = tab;
  const website = getActiveWebsite();
  renderCodeTabButtons();
  document.querySelectorAll("[data-code-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.codeTab === tab);
  });
  if (websiteCodeViewer) {
    websiteCodeViewer.textContent = website?.html || website?.files?.["index.html"] || "Generated index.html will appear here.";
  }
  renderWebsitePreview();
}

function downloadWebsiteZip() {
  const website = getActiveWebsite();
  if (!website) return;
  const zipBlob = createZip({ "index.html": website.html || website.files?.["index.html"] || "" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(zipBlob);
  link.download = `${slugify(website.name || "nova-ai-website")}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function downloadWebsiteHtml() {
  const website = getActiveWebsite();
  if (!website) return;
  downloadTextFile("index.html", website.html || website.files?.["index.html"] || "", "text/html");
}

async function copyWebsiteCode() {
  const website = getActiveWebsite();
  if (!website) return;
  await navigator.clipboard?.writeText(website.html || website.files?.["index.html"] || "");
  setWebsiteStatus("index.html copied to clipboard.", false);
}

async function editWebsite() {
  const website = getActiveWebsite();
  const editPrompt = websiteEditPrompt?.value.trim();
  if (!website || !editPrompt) {
    setWebsiteStatus("Open a website and describe the edit you want.", false);
    return;
  }
  await generateWebsite(editPrompt);
}

function duplicateActiveWebsite() {
  const website = getActiveWebsite();
  if (!website) return;
  handleWebsiteHistoryAction("duplicate", website.id);
}

function downloadTextFile(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function getActiveWebsite() {
  if (!state.activeWebsiteId || !state.websites.some((website) => website.id === state.activeWebsiteId)) {
    state.activeWebsiteId = state.websites[0]?.id || "";
  }
  state.currentWebsite = state.websites.find((website) => website.id === state.activeWebsiteId) || null;
  return state.currentWebsite;
}

function normalizeWebsiteRecord(website) {
  if (!website || typeof website !== "object") return null;
  const now = Date.now();
  const files = website.files && typeof website.files === "object" ? website.files : {};
  const html = website.html || files["index.html"] || "";
  return {
    id: website.id || crypto.randomUUID(),
    name: website.name || website.meta?.name || inferWebsiteName(website.prompt, website.websiteType),
    prompt: website.prompt || "",
    websiteType: website.websiteType || website.meta?.websiteType || "Custom Website",
    thumbnail: website.thumbnail || extractFirstImage({ "index.html": html }),
    html,
    modelUsed: website.modelUsed || website.meta?.modelUsed || "",
    generationTimeMs: Number(website.generationTimeMs || website.meta?.generationTimeMs || 0),
    logs: website.logs || {},
    meta: website.meta || {},
    files: { "index.html": html },
    createdAt: Number(website.createdAt || now),
    updatedAt: Number(website.updatedAt || website.createdAt || now)
  };
}

function renderWebsiteHistory() {
  if (!websiteHistory) return;
  const query = (websiteHistorySearch?.value || "").toLowerCase().trim();
  const websites = state.websites
    .map(normalizeWebsiteRecord)
    .filter(Boolean)
    .filter((website) => {
      if (!query) return true;
      return [website.name, website.prompt, website.websiteType].some((value) =>
        String(value || "").toLowerCase().includes(query)
      );
    });

  websiteHistory.innerHTML = "";
  if (!websites.length) {
    websiteHistory.innerHTML = '<div class="conversation-empty">No saved websites yet.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  websites.forEach((website) => {
    const item = document.createElement("article");
    item.className = `website-history-item ${website.id === state.activeWebsiteId ? "active" : ""}`;
    item.innerHTML = `
      <button class="website-history-open" type="button">
        <span class="website-history-thumb">${website.thumbnail ? `<img src="${escapeHtml(website.thumbnail)}" alt="">` : "W"}</span>
        <span><strong>${escapeHtml(website.name)}</strong><small>${escapeHtml(website.websiteType)} - ${formatConversationTime(website.updatedAt)}</small></span>
      </button>
      <div class="website-history-actions">
        <button type="button" data-website-action="rename">Rename</button>
        <button type="button" data-website-action="duplicate">Duplicate</button>
        <button type="button" data-website-action="regenerate">Regenerate</button>
        <button type="button" data-website-action="delete">Delete</button>
      </div>
    `;

    item.querySelector(".website-history-open").addEventListener("click", () => openWebsite(website.id));
    item.querySelectorAll("[data-website-action]").forEach((button) => {
      button.addEventListener("click", () => handleWebsiteHistoryAction(button.dataset.websiteAction, website.id));
    });
    fragment.appendChild(item);
  });
  websiteHistory.appendChild(fragment);
}

function openWebsite(id) {
  state.activeWebsiteId = id;
  localStorage.setItem("novaActiveWebsiteId", id);
  state.currentWebsite = getActiveWebsite();
  renderWebsiteResult();
  renderWebsiteHistory();
  setWebsiteStatus("Website opened from history.", false);
}

function handleWebsiteHistoryAction(action, id) {
  const website = state.websites.find((item) => item.id === id);
  if (!website) return;

  if (action === "rename") {
    const nextName = prompt("Rename website", website.name);
    if (!nextName?.trim()) return;
    website.name = nextName.trim().slice(0, 80);
    website.updatedAt = Date.now();
    persistWebsites();
    renderWebsiteHistory();
    renderWebsiteResult();
  }

  if (action === "duplicate") {
    const copy = normalizeWebsiteRecord({
      ...website,
      id: crypto.randomUUID(),
      name: `${website.name} Copy`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    state.websites.unshift(copy);
    state.activeWebsiteId = copy.id;
    persistWebsites();
    renderWebsiteResult();
    renderWebsiteHistory();
  }

  if (action === "regenerate") {
    state.activeWebsiteId = website.id;
    if (websitePrompt) websitePrompt.value = website.prompt;
    updateWebsitePromptCount();
    generateWebsite("Regenerate this saved website with a fresh unique layout, stronger imagery, and the same business intent.");
  }

  if (action === "delete") {
    if (!confirm("Delete this website from history?")) return;
    state.websites = state.websites.filter((item) => item.id !== id);
    if (state.activeWebsiteId === id) state.activeWebsiteId = state.websites[0]?.id || "";
    persistWebsites();
    deleteCloudWebsite(id);
    renderWebsiteResult();
    renderWebsiteHistory();
  }
}

function renderCodeTabButtons() {
  const tabs = document.querySelector(".website-tabs");
  if (!tabs) return;
  const tabFiles = ["index.html"];
  tabs.innerHTML = "";
  tabFiles.forEach((file) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.codeTab = file;
    button.textContent = file;
    button.className = file === state.activeWebsiteCodeTab ? "active" : "";
    button.addEventListener("click", () => setWebsiteCodeTab(file));
    tabs.appendChild(button);
  });
  if (!tabFiles.includes(state.activeWebsiteCodeTab)) state.activeWebsiteCodeTab = tabFiles[0] || "index.html";
}

function persistWebsites(options = {}) {
  state.websites = state.websites.map(normalizeWebsiteRecord).filter(Boolean);
  store.set("novaWebsites", state.websites);
  localStorage.setItem("novaActiveWebsiteId", state.activeWebsiteId || "");
  if (options.sync !== false) scheduleCloudWebsiteSync();
}

async function loadCloudWebsites() {
  if (!state.authToken) return;
  try {
    const data = await callNovaAuth(`${NOVA_API_ROUTES.sync}?action=website`, { method: "GET" });
    const cloudWebsites = Array.isArray(data.websites) ? data.websites.map(normalizeWebsiteRecord).filter(Boolean) : [];
    if (cloudWebsites.length) {
      state.websites = cloudWebsites;
      state.activeWebsiteId = state.websites[0]?.id || "";
      persistWebsites({ sync: false });
    } else if (state.websites.length) {
      await syncAllWebsitesToCloud();
    }
    state.currentWebsite = getActiveWebsite();
    renderWebsiteResult();
    renderWebsiteHistory();
  } catch (error) {
    setWebsiteStatus(`Website cloud sync paused: ${error.message}`, false);
  }
}

function scheduleCloudWebsiteSync() {
  if (!state.authToken || state.isSyncingWebsites) return;
  clearTimeout(state.websiteSyncTimer);
  state.websiteSyncTimer = window.setTimeout(syncAllWebsitesToCloud, 900);
}

async function syncAllWebsitesToCloud() {
  if (!state.authToken || state.isSyncingWebsites) return;
  state.isSyncingWebsites = true;
  try {
    for (const website of state.websites) {
      await callNovaAuth(NOVA_API_ROUTES.sync, {
      method: "POST",
      body: JSON.stringify({
        action: "website",
        subAction: "upsert",
        website: normalizeWebsiteRecord(website)
      })
    });
    }
  } catch (error) {
    setWebsiteStatus(`Website cloud sync paused: ${error.message}`, false);
  } finally {
    state.isSyncingWebsites = false;
  }
}

async function deleteCloudWebsite(id) {
  if (!state.authToken || !id) return;
  try {
    await callNovaAuth(NOVA_API_ROUTES.sync, {
    method: "POST",
    body: JSON.stringify({
      action: "website",
      subAction: "delete",
      id
    })
  });
  } catch (error) {
    setWebsiteStatus(`Website delete sync paused: ${error.message}`, false);
  }
}

function clearVisibleWebsites() {
  clearTimeout(state.websiteSyncTimer);
  state.websites = [];
  state.activeWebsiteId = "";
  state.currentWebsite = null;
  localStorage.removeItem("novaActiveWebsiteId");
  renderWebsiteHistory();
}

function inferWebsiteName(promptText = "", type = "Website") {
  const match = String(promptText).match(/(?:for|called|named)\s+([A-Z][A-Za-z0-9&'\-\s]{2,48})/);
  if (match?.[1]) return match[1].replace(/[.?!].*$/, "").trim();
  return String(type || "Generated Website").replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractFirstImage(files = {}) {
  const html = Object.values(files).find((value) => /<img/i.test(String(value))) || "";
  const match = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || "";
}

function slugify(value) {
  return String(value || "nova-ai-website")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "nova-ai-website";
}

function createZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(String(content));
    const crc = crc32(data);
    const localHeader = zipHeader(0x04034b50, [20, 0, 0, 0, 0, crc, data.length, data.length, nameBytes.length, 0], [2, 2, 2, 2, 2, 4, 4, 4, 2, 2]);
    localParts.push(localHeader, nameBytes, data);
    const centralHeader = zipHeader(0x02014b50, [20, 20, 0, 0, 0, 0, crc, data.length, data.length, nameBytes.length, 0, 0, 0, 0, 0, offset], [2, 2, 2, 2, 2, 2, 4, 4, 4, 2, 2, 2, 2, 2, 4, 4]);
    centralParts.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + data.length;
  });

  const fileCount = Object.keys(files).length;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endHeader = zipHeader(0x06054b50, [0, 0, fileCount, fileCount, centralSize, offset, 0], [2, 2, 2, 2, 4, 4, 2]);
  return new Blob([...localParts, ...centralParts, endHeader], { type: "application/zip" });
}

function zipHeader(signature, values, sizes) {
  const buffer = new ArrayBuffer(4 + sizes.reduce((sum, size) => sum + size, 0));
  const view = new DataView(buffer);
  view.setUint32(0, signature, true);
  let cursor = 4;
  values.forEach((value, index) => {
    if (sizes[index] === 2) view.setUint16(cursor, value, true);
    if (sizes[index] === 4) view.setUint32(cursor, value >>> 0, true);
    cursor += sizes[index];
  });
  return new Uint8Array(buffer);
}

function crc32(data) {
  let crc = -1;
  for (let i = 0; i < data.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const commands = [
  { label: "Open AI Chat", panel: "ai-chat" },
  { label: "Open Voice Mode", panel: "voice-mode" },
  { label: "Open AI Studio", panel: "studio" },
  { label: "Open Website Generator", panel: "website-generator" },
  { label: "Open Planner", panel: "planner" },
  { label: "Open Tasks", panel: "tasks" },
  { label: "Open Cloud Sync", panel: "cloud" },
  { label: "Open Settings", panel: "settings" },
  { label: "Open Video Generator", panel: "video-generator" },
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

// â”€â”€â”€ Tasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Saved Prompts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Persist Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function persistTasks() {
  store.set("novaTasks", state.tasks);
  renderTasks();
  renderVideoHistory();
  updateCounters();
}

function persistPrompts() {
  store.set("novaPrompts", state.prompts);
  renderPrompts();
  renderVideoHistory();
  updateCounters();
}

function persistSettings() {
  store.set("novaSettings", state.settings);
  applySettings();
}

// â”€â”€â”€ Settings & Theming â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Render All â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderAll() {
  renderTasks();
  renderPrompts();
  renderVideoHistory();
  updateCounters();
}

// â”€â”€â”€ Greeting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Counters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function updateCounters() {
  const rc = document.getElementById("requestCount");
  const tc = document.getElementById("taskCount");
  const pc = document.getElementById("promptCount");
  if (rc) rc.textContent = state.requestCount;
  if (tc) tc.textContent = state.tasks.filter((t) => !t.completed).length;
  if (pc) pc.textContent = state.prompts.length;
}

// â”€â”€â”€ Loader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function dismissLoader() {
  if (!startupLoader) return;
  window.setTimeout(() => startupLoader.classList.add("hidden"), 850);
}

// â”€â”€â”€ Document Generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function generateDocument() {
  const type = document.getElementById("docType").value;
  const input =
    document.getElementById("docInput").value.trim() ||
    "a premium AI productivity project";
  let output;
  try {
    const response = await callNovaBackend(NOVA_API_ROUTES.ai, { action: "document", type, input });
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

// â”€â”€â”€ Image Generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

function getRandomMood() {
 const moods = [
 "epic",
 "dreamlike",
 "dark",
 "luxurious",
 "minimalist",
 "magical",
 "retro",
 "futuristic",
 "vintage",
 "mysterious"
];

  return moods[
    Math.floor(Math.random() * moods.length)
  ];
}

function getPromptVariations(type) {
  const variationMap = {
   Wallpaper: [
  "close up cinematic shot, subject fills the frame",

  "drone view from high above, huge environment visible",

  "side profile composition, dynamic motion blur",

  "top down perspective, completely different layout",

  "low angle shot looking upward",

  "wide landscape scene with tiny subject",

  "first person perspective view",

  "extreme close up detailed shot"
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

  return `${prompt}, ${styles[type] || ""}`;
}

async function generateImage() {
  const loading = document.getElementById("imageLoading");
  const generateButton = document.getElementById("generateImageBtn");

  if (loading) loading.style.display = "block";
  if (generateButton) generateButton.disabled = true;

  const type = document.getElementById("imageType").value;
  const model =
  document.getElementById("imageModel").value;
  const prompt =
    document.getElementById("imagePrompt").value.trim() ||
    "NOVA AI futuristic SaaS platform neon blue purple";
  const imageStyles = {   "Logo": "professional logo design",   "Wallpaper": "high quality wallpaper",   "Thumbnail": "youtube thumbnail",   "Poster": "professional advertising poster",   "Social Graphic": "social media graphic" };  let modelPrompt = "";

 
if (model === "creative") {
  modelPrompt =
    "creative artwork, unique composition, imaginative design";
}

if (model === "realistic") {
  modelPrompt =
    "photorealistic, ultra realistic, professional photography";
}

if (model === "anime") {
  modelPrompt =
    "anime style, manga artwork, vibrant colors";
}

if (model === "logo") {
  modelPrompt =
    "professional logo design, vector, clean branding";
}

const fullPrompt =
`${prompt}, ${imageStyles[type] || ""}, ${modelPrompt}`;
  const imageCount = Number(document.getElementById("imageCount").value);

  imageSkeletonCount = imageCount;
  renderImages();
  showImageGenerationOverlay(imageCount);

  try {
   
    const variations = getPromptVariations(type);
   

    for (let i = 0; i < imageCount; i++) {
      updateImageGenerationOverlay(i, imageCount);

      if (i > 0) {
        await delay(1400);
      }

  const randomSeed =
Date.now() +
Math.floor(Math.random() * 9999999);

     const randomCamera = [
  "close up shot",
  "wide angle shot",
  "bird eye view",
  "drone shot",
  "low angle shot",
  "top down shot",
  "cinematic perspective",
  "macro photography",
  "side view",
  "front view"
][Math.floor(Math.random() * 10)];
      const randomLighting = [
  "golden hour lighting",
  "sunset lighting",
  "neon lighting",
  "dramatic shadows",
  "studio lighting",
  "soft natural lighting"
][Math.floor(Math.random() * 6)];
      const randomColors = [
  "blue and purple",
  "orange and teal",
  "black and gold",
  "red and cyan",
  "pastel colors",
  "green and yellow"
][Math.floor(Math.random() * 6)];
      const randomStyle = [
  "photorealistic",
  "anime",
  "digital art",
  "concept art",
  "cinematic photography",
  "3D render",
  "watercolor painting",
  "oil painting",
  "comic book style",
  "cyberpunk artwork"
][Math.floor(Math.random() * 10)];
      
      
const imagePrompt = `
${fullPrompt}

Camera Angle:
${randomCamera}

Lighting:
${randomLighting}

Color Palette:
${randomColors}

Art Style:
${randomStyle}

Mood:
${getRandomMood()}
IMPORTANT VARIATION:
${variations[i] || "unique style"}

Make this image completely different from previous images.
Use a unique composition, unique framing,
unique camera angle, unique color grading,
and unique artistic direction.

Variation ${i + 1}

Different composition
Different perspective
Different framing
Different visual style

Seed: ${randomSeed}
`;

console.log("IMAGE", i + 1);
console.log(imagePrompt);
      
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

  const response = await fetch(`${NOVA_BACKEND_BASE_URL}${NOVA_API_ROUTES.ai}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "image", ...payload })
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
    <svg xmlns="http://www.w3.org/2000/svg" width="768" height="512" viewBox="0 0 768 512">
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
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:white;font-family:Arial;font-size:22px;line-height:1.45">${escapeHtml(prompt)}</div>
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
  <button class="download-image-btn">â¬‡ Download JPG</button>
  <button class="delete-image-btn">ðŸ—‘ Delete</button>
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

// â”€â”€â”€ Planner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function generatePlan() {
  const input =
    document.getElementById("plannerInput").value.trim() ||
    "finish priority tasks, study, and ship one project improvement";
  let blocks;
  try {
    const response = await callNovaBackend(NOVA_API_ROUTES.ai, { action: "planner", input });
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

// â”€â”€â”€ Memory Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Quote â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function loadQuote() {
  const quoteText = document.getElementById("quoteText");
  const quoteAuthor = document.getElementById("quoteAuthor");

  try {
    const response = await fetch("https://dummyjson.com/quotes");
    if (!response.ok) throw new Error("Quote request failed");
    const data = await response.json();
    if (quoteText) quoteText.textContent = `"${data.content}"`;
    if (quoteAuthor) quoteAuthor.textContent = data.author ? `— ${data.author}` : "";
  } catch {
    if (quoteText) quoteText.textContent = "Small focused actions compound into serious momentum.";
    if (quoteAuthor) quoteAuthor.textContent = "— NOVA AI";
  }
}

// â”€â”€â”€ Utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  if (!value) return "";
  return String(value).replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])
  );
}

// â”€â”€â”€ Ambient Effects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Service Worker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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










// ==========================================================================
// AI Video Generator Integration
// ==========================================================================

// Global variable to allow cancelling active fetch request
let activeVideoAbortController = null;
let videoTimerInterval = null;
let videoProgressInterval = null;

// Element references
const videoPrompt = document.getElementById("videoPrompt");
const videoPromptCount = document.getElementById("videoPromptCount");
const videoModel = document.getElementById("videoModel");
const videoAspectRatio = document.getElementById("videoAspectRatio");
const videoDuration = document.getElementById("videoDuration");
const videoQuality = document.getElementById("videoQuality");
const generateVideoBtn = document.getElementById("generateVideoBtn");
const enhanceVideoPromptBtn = document.getElementById("enhanceVideoPromptBtn");
const stopVideoGenerationBtn = document.getElementById("stopVideoGenerationBtn");
const videoStatus = document.getElementById("videoStatus");
const videoHistory = document.getElementById("videoHistory");
const videoHistorySearch = document.getElementById("videoHistorySearch");
const videoHistorySort = document.getElementById("videoHistorySort");

// Player references
const videoPlayerTitle = document.getElementById("videoPlayerTitle");
const videoPlayer = document.getElementById("videoPlayer");
const videoPlaceholder = document.getElementById("videoPlaceholder");
const videoPreviewShell = document.getElementById("videoPreviewShell");
const videoCustomControls = document.getElementById("videoCustomControls");
const videoProjectInfo = document.getElementById("videoProjectInfo");

// Custom Controls
const videoPlayPause = document.getElementById("videoPlayPause");
const videoSeekBar = document.getElementById("videoSeekBar");
const videoCurrentTime = document.getElementById("videoCurrentTime");
const videoMute = document.getElementById("videoMute");
const videoVolumeBar = document.getElementById("videoVolumeBar");
const videoLoop = document.getElementById("videoLoop");
const videoFullscreen = document.getElementById("videoFullscreen");

// Active Control buttons
const copyVideoPromptBtn = document.getElementById("copyVideoPromptBtn");
const downloadVideoBtn = document.getElementById("downloadVideoBtn");
const shareVideoBtn = document.getElementById("shareVideoBtn");
const deleteVideoBtn = document.getElementById("deleteVideoBtn");
const regenerateVideoBtn = document.getElementById("regenerateVideoBtn");

// Loading Overlay elements
const videoGenerationOverlay = document.getElementById("videoGenerationOverlay");
const videoProgressRing = document.getElementById("videoProgressRing");
const videoProgressText = document.getElementById("videoProgressText");
const videoTimerElapsed = document.getElementById("videoTimerElapsed");
const videoTimerRemaining = document.getElementById("videoTimerRemaining");
const videoGenerationStatus = document.getElementById("videoGenerationStatus");

// Startup setup
function restoreVideos() {
  state.videos = store.get("novaVideos", []);
  state.activeVideoId = localStorage.getItem("novaActiveVideoId") || "";

  // Register listeners
  setupVideoGeneratorListeners();

  // Load history
  renderVideoHistory();

  // Open active video if present
  if (state.activeVideoId) {
    const activeVideo = state.videos.find(v => v.id === state.activeVideoId);
    if (activeVideo) {
      openVideo(activeVideo);
    }
  }
}

// Register Listeners
function setupVideoGeneratorListeners() {
  videoPrompt?.addEventListener("input", updateVideoPromptCount);
  enhanceVideoPromptBtn?.addEventListener("click", enhanceActiveVideoPrompt);
  generateVideoBtn?.addEventListener("click", startVideoGeneration);
  stopVideoGenerationBtn?.addEventListener("click", abortVideoGeneration);
  
  // Custom Player Controls
  if (videoPlayer) {
    videoPlayer.addEventListener("play", () => {
      if (videoPlayPause) videoPlayPause.textContent = "Pause";
    });
    videoPlayer.addEventListener("pause", () => {
      if (videoPlayPause) videoPlayPause.textContent = "Play";
    });
    videoPlayer.addEventListener("timeupdate", updateVideoPlayerProgress);
  }

  videoPlayPause?.addEventListener("click", toggleVideoPlay);
  videoSeekBar?.addEventListener("input", seekVideoPlayer);
  videoMute?.addEventListener("click", toggleVideoMute);
  videoVolumeBar?.addEventListener("input", adjustVideoVolume);
  videoLoop?.addEventListener("click", toggleVideoLoop);
  videoFullscreen?.addEventListener("click", enterVideoFullscreen);

  // Active video control buttons
  copyVideoPromptBtn?.addEventListener("click", copyActiveVideoPrompt);
  downloadVideoBtn?.addEventListener("click", downloadActiveVideo);
  shareVideoBtn?.addEventListener("click", shareActiveVideo);
  deleteVideoBtn?.addEventListener("click", () => {
    if (state.activeVideoId) deleteVideoItem(state.activeVideoId);
  });
  regenerateVideoBtn?.addEventListener("click", () => {
    const activeVideo = state.videos.find(v => v.id === state.activeVideoId);
    if (activeVideo) {
      if (videoPrompt) videoPrompt.value = activeVideo.prompt;
      startVideoGeneration();
    }
  });

  // History controls
  videoHistorySearch?.addEventListener("input", renderVideoHistory);
  videoHistorySort?.addEventListener("change", renderVideoHistory);
}

// Update character counter
function updateVideoPromptCount() {
  if (!videoPrompt || !videoPromptCount) return;
  videoPromptCount.textContent = `${videoPrompt.value.length} / 2000`;
}

// Enhance Prompt
function enhanceActiveVideoPrompt() {
  if (!videoPrompt || !videoPrompt.value.trim()) return;
  enhanceVideoPromptBtn.disabled = true;
  enhanceVideoPromptBtn.textContent = "✨ Enhancing...";

  setTimeout(() => {
    const original = videoPrompt.value.trim();
    const cinematicInjections = [
      "highly detailed, photorealistic 8k, majestic cinematography, soft atmospheric haze, warm volumetric lighting, golden hour reflection, smooth camera pan, professional color grading",
      "cinematic lighting, ultra-realistic textures, slow motion camera orbit, Unreal Engine 5 rendering style, hyper-detailed, neon glowing reflections, dramatic shadows",
      "epic composition, high fidelity render, gorgeous depth of field, steady camera slide, volumetric fog effects, vibrant color correction, crisp motion focus"
    ];
    const injection = cinematicInjections[Math.floor(Math.random() * cinematicInjections.length)];
    videoPrompt.value = `${original}, ${injection}`;
    updateVideoPromptCount();
    enhanceVideoPromptBtn.disabled = false;
    enhanceVideoPromptBtn.textContent = "✨ Enhance Prompt";
  }, 600);
}

// Video Generation Start
async function startVideoGeneration() {
  const prompt = videoPrompt?.value.trim();
  if (!prompt) {
    updateVideoStatusText("❌ Please enter a video prompt to begin.");
    return;
  }

  // Initialise AbortController
  activeVideoAbortController = new AbortController();

  // Reset status
  updateVideoStatusText("Generating video project...");

  // Show Overlay
  if (videoGenerationOverlay) {
    videoGenerationOverlay.classList.add("active");
    videoGenerationOverlay.setAttribute("aria-hidden", "false");
  }

  // Animation variables
  let progress = 0;
  let elapsedSeconds = 0;

  // Visual percentages to step through smoothly
  const progressSteps = [0, 2, 5, 9, 15, 21, 29, 38, 47, 58, 67, 74, 82, 89, 94, 97, 99];
  let stepIndex = 0;

  // Sequence of changing AI messages
  const statusMessages = [
    "Initializing AI Engine...",
    "Understanding your prompt...",
    "Planning scenes...",
    "Writing storyboard...",
    "Generating cinematic shots...",
    "Creating camera movements...",
    "Rendering frames...",
    "Applying lighting...",
    "Enhancing consistency...",
    "Improving motion...",
    "Upscaling quality...",
    "Encoding video...",
    "Optimizing output...",
    "Finalizing...",
    "Almost Ready...",
    "Generation Complete."
  ];

  // Set initial timer values
  if (videoTimerElapsed) videoTimerElapsed.textContent = "00:00";
  if (videoTimerRemaining) videoTimerRemaining.textContent = "~01:30";

  // Start elapsed timer
  clearInterval(videoTimerInterval);
  videoTimerInterval = setInterval(() => {
    elapsedSeconds++;
    const min = Math.floor(elapsedSeconds / 60).toString().padStart(2, "0");
    const sec = (elapsedSeconds % 60).toString().padStart(2, "0");
    if (videoTimerElapsed) videoTimerElapsed.textContent = `${min}:${sec}`;

    // Estimated remaining time counts down dynamically
    const remaining = Math.max(0, 90 - elapsedSeconds);
    const remMin = Math.floor(remaining / 60).toString().padStart(2, "0");
    const remSec = (remaining % 60).toString().padStart(2, "0");
    if (videoTimerRemaining) videoTimerRemaining.textContent = `~${remMin}:${remSec}`;
  }, 1000);

  // Smooth percentage simulation
  clearInterval(videoProgressInterval);
  videoProgressInterval = setInterval(() => {
    if (stepIndex < progressSteps.length) {
      progress = progressSteps[stepIndex];
      stepIndex++;
    } else {
      // Crawl slowly at 99% until backend responds
      progress = 99;
    }
    updateProgressUI(progress);

    // Update status text dynamically based on progress benchmarks
    const messageIndex = Math.min(
      Math.floor((progress / 100) * statusMessages.length),
      statusMessages.length - 2
    );
    if (videoGenerationStatus) {
      videoGenerationStatus.textContent = statusMessages[messageIndex];
    }
  }, 1800);

  try {
    const payload = {
      prompt,
      model: videoModel?.value || "Wan-AI/Wan2.1-T2V-14B",
      aspectRatio: videoAspectRatio?.value || "16:9",
      duration: videoDuration?.value || "5 seconds",
      quality: videoQuality?.value || "Fast"
    };

    const response = await callNovaBackend(NOVA_API_ROUTES.ai, { action: "video", ...payload });

    let videoUrl = response.videoUrl;
    if (response.useClientSideHf) {
      if (videoGenerationStatus) videoGenerationStatus.textContent = "Generating video on Hugging Face (approx. 30-60 seconds)...";
      
      const targetUrl = response.submitUrl || `https://router.huggingface.co/fal-ai/models/${response.model}`;
      const hfResponse = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${response.hfToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: response.prompt,
          parameters: {
            guidance_scale: 5.0,
            num_inference_steps: response.quality === "Fast" ? 20 : response.quality === "Balanced" ? 30 : 50
          }
        })
      });

      if (!hfResponse.ok) {
        let errText = await hfResponse.text();
        try { errText = JSON.parse(errText).error || errText; } catch {}
        throw new Error(`Hugging Face generation failed: ${errText}`);
      }

      const blob = await hfResponse.blob();
      videoUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to process generated video data."));
        reader.readAsDataURL(blob);
      });
    }

    // Cancel dynamic loop and finish instantly
    clearInterval(videoProgressInterval);
    updateProgressUI(100);
    if (videoGenerationStatus) videoGenerationStatus.textContent = "Generation Complete.";
    if (videoTimerRemaining) videoTimerRemaining.textContent = "00:00";

    // Play visual complete state animation
    setTimeout(() => {
      // Hide overlay
      closeVideoGenerationOverlay();

      const newVideo = {
        id: crypto.randomUUID(),
        prompt: response.prompt || prompt,
        model: response.model || payload.model,
        aspectRatio: response.aspectRatio || payload.aspectRatio,
        duration: response.duration || payload.duration,
        quality: response.quality || payload.quality,
        videoUrl: videoUrl,
        thumbnail: videoUrl,
        generationTimeMs: response.generationTimeMs || (elapsedSeconds * 1000),
        downloadCount: 0,
        status: "completed",
        name: "Video " + new Date().toLocaleDateString(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      state.videos.unshift(newVideo);
      store.set("novaVideos", state.videos);
      state.activeVideoId = newVideo.id;
      localStorage.setItem("novaActiveVideoId", newVideo.id);

      renderVideoHistory();
      openVideo(newVideo);
      updateVideoStatusText("✅ Video generated successfully!");

      // Update global requests counters
      state.requestCount += 1;
      localStorage.setItem("novaRequestCount", String(state.requestCount));
      updateCounters();

      // Trigger Cloud Sync
      scheduleCloudVideoSync();
    }, 1000);

  } catch (error) {
    clearInterval(videoTimerInterval);
    clearInterval(videoProgressInterval);
    closeVideoGenerationOverlay();
    
    if (error.name === "AbortError") {
      updateVideoStatusText("⏹️ Video generation stopped by user.");
    } else {
      console.error(error);
      updateVideoStatusText("❌ Generation failed. API error or model offline.");
      showVideoErrorCard(error.message);
    }
  }
}

// UI Progress updater
function updateProgressUI(pct) {
  if (videoProgressText) videoProgressText.textContent = `${pct}%`;
  if (videoProgressRing) {
    videoProgressRing.style.setProperty("--progress", `${pct}%`);
    const angle = (pct / 100) * 360;
    videoProgressRing.style.setProperty("--progress-angle", `${angle}deg`);
  }
}

// Stop Video Generation
function abortVideoGeneration() {
  if (activeVideoAbortController) {
    activeVideoAbortController.abort();
  }
  clearInterval(videoTimerInterval);
  clearInterval(videoProgressInterval);
  closeVideoGenerationOverlay();
}

// Close generation overlay helper
function closeVideoGenerationOverlay() {
  if (videoGenerationOverlay) {
    videoGenerationOverlay.classList.remove("active");
    videoGenerationOverlay.setAttribute("aria-hidden", "true");
  }
}

// Display error card in player area
function showVideoErrorCard(msg) {
  if (videoPlaceholder) {
    videoPlaceholder.style.display = "flex";
    videoPlaceholder.innerHTML = `
      <div class="placeholder-icon" style="color:var(--violet);">⚠️</div>
      <h3 style="margin-bottom:8px;color:#fff;">Generation Failed</h3>
      <p style="font-size:0.85rem;color:rgba(255,255,255,0.6);margin-bottom:16px;">${msg || "Request timed out or API key missing."}</p>
      <button class="btn secondary" onclick="startVideoGeneration()">🔄 Retry Generation</button>
    `;
  }
}

// Status message bar helper
function updateVideoStatusText(text) {
  if (videoStatus) videoStatus.textContent = text;
}

// Open / Select Video
function openVideo(video) {
  if (!video) return;

  if (videoPlayerTitle) videoPlayerTitle.textContent = video.name || "Generated Asset";
  
  if (videoPlaceholder) videoPlaceholder.style.display = "none";
  if (videoPlayer) {
    videoPlayer.style.display = "block";
    videoPlayer.src = video.videoUrl;
    videoPlayer.load();
  }
  if (videoCustomControls) videoCustomControls.style.display = "flex";
  
  if (videoProjectInfo) {
    videoProjectInfo.style.display = "flex";
    const timeSec = (video.generationTimeMs / 1000).toFixed(1);
    videoProjectInfo.innerHTML = `
      <span>Model: <strong>${video.model}</strong></span>
      <span>Duration: <strong>${video.duration}</strong></span>
      <span>Aspect: <strong>${video.aspectRatio}</strong></span>
      <span>Render: <strong>${timeSec}s</strong></span>
    `;
  }

  // Enable control buttons
  if (copyVideoPromptBtn) copyVideoPromptBtn.disabled = false;
  if (downloadVideoBtn) downloadVideoBtn.disabled = false;
  if (shareVideoBtn) shareVideoBtn.disabled = false;
  if (deleteVideoBtn) deleteVideoBtn.disabled = false;
  if (regenerateVideoBtn) regenerateVideoBtn.disabled = false;

  // Add active state styling in history list
  document.querySelectorAll(".video-history-item").forEach(item => {
    item.classList.toggle("active", item.dataset.id === video.id);
  });
}

// Custom Player Controls Methods
function toggleVideoPlay() {
  if (!videoPlayer) return;
  if (videoPlayer.paused) {
    videoPlayer.play();
  } else {
    videoPlayer.pause();
  }
}

function updateVideoPlayerProgress() {
  if (!videoPlayer || !videoSeekBar || !videoCurrentTime) return;
  const pct = (videoPlayer.currentTime / videoPlayer.duration) * 100;
  videoSeekBar.value = isNaN(pct) ? 0 : pct;

  const min = Math.floor(videoPlayer.currentTime / 60).toString().padStart(2, "0");
  const sec = Math.floor(videoPlayer.currentTime % 60).toString().padStart(2, "0");
  videoCurrentTime.textContent = `${min}:${sec}`;
}

function seekVideoPlayer() {
  if (!videoPlayer || !videoSeekBar) return;
  const targetTime = (videoSeekBar.value / 100) * videoPlayer.duration;
  videoPlayer.currentTime = isNaN(targetTime) ? 0 : targetTime;
}

function toggleVideoMute() {
  if (!videoPlayer || !videoMute) return;
  videoPlayer.muted = !videoPlayer.muted;
  videoMute.textContent = videoPlayer.muted ? "Unmute" : "Mute";
  if (videoVolumeBar) videoVolumeBar.value = videoPlayer.muted ? 0 : videoPlayer.volume;
}

function adjustVideoVolume() {
  if (!videoPlayer || !videoVolumeBar || !videoMute) return;
  videoPlayer.volume = videoVolumeBar.value;
  videoPlayer.muted = videoVolumeBar.value == 0;
  videoMute.textContent = videoPlayer.muted ? "Unmute" : "Mute";
}

function toggleVideoLoop() {
  if (!videoPlayer || !videoLoop) return;
  videoPlayer.loop = !videoPlayer.loop;
  videoLoop.textContent = videoPlayer.loop ? "Loop: On" : "Loop: Off";
}

function enterVideoFullscreen() {
  if (!videoPlayer) return;
  if (videoPlayer.requestFullscreen) {
    videoPlayer.requestFullscreen();
  } else if (videoPlayer.webkitRequestFullscreen) {
    videoPlayer.webkitRequestFullscreen();
  } else if (videoPlayer.msRequestFullscreen) {
    videoPlayer.msRequestFullscreen();
  }
}

// Active button handlers
function copyActiveVideoPrompt() {
  const activeVideo = state.videos.find(v => v.id === state.activeVideoId);
  if (activeVideo) {
    navigator.clipboard.writeText(activeVideo.prompt);
    const oldText = copyVideoPromptBtn.textContent;
    copyVideoPromptBtn.textContent = "Copied!";
    setTimeout(() => {
      copyVideoPromptBtn.textContent = oldText;
    }, 1500);
  }
}

function downloadActiveVideo() {
  const activeVideo = state.videos.find(v => v.id === state.activeVideoId);
  if (!activeVideo || !activeVideo.videoUrl) return;

  activeVideo.downloadCount = (activeVideo.downloadCount || 0) + 1;
  store.set("novaVideos", state.videos);
  renderVideoHistory();

  const link = document.createElement("a");
  link.href = activeVideo.videoUrl;
  link.download = `${activeVideo.name.replace(/\s+/g, "_")}.mp4`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  scheduleCloudVideoSync();
}

function shareActiveVideo() {
  const activeVideo = state.videos.find(v => v.id === state.activeVideoId);
  if (!activeVideo) return;

  // Construct sharing status text
  const shareText = `Check out this AI-generated video created with NOVA AI Video Studio!\nPrompt: "${activeVideo.prompt}"`;
  navigator.clipboard.writeText(shareText);

  const oldText = shareVideoBtn.textContent;
  shareVideoBtn.textContent = "Copied Link!";
  setTimeout(() => {
    shareVideoBtn.textContent = oldText;
  }, 1500);
}

// History Renderer
function renderVideoHistory() {
  if (!videoHistory) return;

  const searchQuery = videoHistorySearch?.value.toLowerCase() || "";
  const sortBy = videoHistorySort?.value || "newest";

  let filtered = state.videos.filter(v => {
    const promptText = String(v.prompt || "").toLowerCase();
    const nameText = String(v.name || "").toLowerCase();
    return promptText.includes(searchQuery) || nameText.includes(searchQuery);
  });

  if (sortBy === "newest") {
    filtered.sort((a, b) => b.createdAt - a.createdAt);
  } else {
    filtered.sort((a, b) => a.createdAt - b.createdAt);
  }

  if (filtered.length === 0) {
    videoHistory.innerHTML = `<p style="font-size:0.85rem;color:rgba(255,255,255,0.4);text-align:center;padding:20px 0;">No generation history found.</p>`;
    return;
  }

  videoHistory.innerHTML = filtered.map(video => {
    const dateStr = new Date(video.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    
    const isActive = video.id === state.activeVideoId ? "active" : "";
    const modelName = String(video.model || "").split("/").pop() || "Wan 2.1";
    const durationText = video.duration || "5 seconds";

    return `
      <div class="video-history-item ${isActive}" data-id="${video.id}">
        <div class="history-thumb">
          <video src="${video.videoUrl || ""}" muted playsinline></video>
        </div>
        <div class="history-details">
          <div class="history-prompt">${escapeHtml(video.prompt || "")}</div>
          <div class="history-meta">
            <span>${modelName}</span>
            <span>• ${durationText}</span>
            <span>• ${dateStr}</span>
          </div>
        </div>
        <div class="history-actions">
          <button class="rename-vid-btn" title="Rename" data-id="${video.id}">✏️</button>
          <button class="duplicate-vid-btn" title="Duplicate prompt" data-id="${video.id}">📋</button>
          <button class="delete-vid-btn" title="Delete" data-id="${video.id}">🗑️</button>
        </div>
      </div>
    `;
  }).join("");

  // Register history sub-listeners
  videoHistory.querySelectorAll(".video-history-item").forEach(item => {
    item.addEventListener("click", (e) => {
      // Prevent trigger when clicking action buttons
      if (e.target.closest("button")) return;
      const targetId = item.dataset.id;
      const targetVideo = state.videos.find(v => v.id === targetId);
      if (targetVideo) {
        state.activeVideoId = targetVideo.id;
        localStorage.setItem("novaActiveVideoId", targetVideo.id);
        openVideo(targetVideo);
        // Play thumbnail hover video snippet
        const thumbVid = item.querySelector("video");
        if (thumbVid) thumbVid.play().catch(() => {});
      }
    });

    // Hover effect to loop mini video snippet in thumbnail
    item.addEventListener("mouseenter", () => {
      const thumbVid = item.querySelector("video");
      if (thumbVid) {
        thumbVid.currentTime = 0;
        thumbVid.play().catch(() => {});
      }
    });
    item.addEventListener("mouseleave", () => {
      const thumbVid = item.querySelector("video");
      if (thumbVid) thumbVid.pause();
    });
  });

  // Action button event handlers
  videoHistory.querySelectorAll(".rename-vid-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      renameVideoItem(btn.dataset.id);
    });
  });

  videoHistory.querySelectorAll(".duplicate-vid-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = state.videos.find(v => v.id === btn.dataset.id);
      if (target) {
        if (videoPrompt) videoPrompt.value = target.prompt;
        if (videoModel) videoModel.value = target.model;
        if (videoAspectRatio) videoAspectRatio.value = target.aspectRatio;
        if (videoDuration) videoDuration.value = target.duration;
        if (videoQuality) videoQuality.value = target.quality;
        updateVideoPromptCount();
        updateVideoStatusText(`📋 Loaded settings from ${target.name}.`);
      }
    });
  });

  videoHistory.querySelectorAll(".delete-vid-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteVideoItem(btn.dataset.id);
    });
  });
}

// Rename Video History Item
function renameVideoItem(id) {
  const target = state.videos.find(v => v.id === id);
  if (!target) return;

  const newName = prompt("Enter a new name for this video project:", target.name || "");
  if (newName && newName.trim()) {
    target.name = newName.trim();
    target.updatedAt = Date.now();
    store.set("novaVideos", state.videos);
    renderVideoHistory();
    if (state.activeVideoId === id && videoPlayerTitle) {
      videoPlayerTitle.textContent = target.name;
    }
    scheduleCloudVideoSync();
  }
}

// Delete Video History Item
async function deleteVideoItem(id) {
  if (!confirm("Are you sure you want to permanently delete this video project?")) return;

  // Remove active if currently loaded
  if (state.activeVideoId === id) {
    state.activeVideoId = "";
    localStorage.removeItem("novaActiveVideoId");
    
    if (videoPlayer) {
      videoPlayer.style.display = "none";
      videoPlayer.src = "";
    }
    if (videoPlaceholder) {
      videoPlaceholder.style.display = "flex";
      videoPlaceholder.innerHTML = `
        <div class="placeholder-icon">🎬</div>
        <p>Your generated video will render here.</p>
      `;
    }
    if (videoCustomControls) videoCustomControls.style.display = "none";
    if (videoProjectInfo) videoProjectInfo.style.display = "none";
    if (videoPlayerTitle) videoPlayerTitle.textContent = "Generated Asset";

    // Disable control buttons
    if (copyVideoPromptBtn) copyVideoPromptBtn.disabled = true;
    if (downloadVideoBtn) downloadVideoBtn.disabled = true;
    if (shareVideoBtn) shareVideoBtn.disabled = true;
    if (deleteVideoBtn) deleteVideoBtn.disabled = true;
    if (regenerateVideoBtn) regenerateVideoBtn.disabled = true;
  }

  state.videos = state.videos.filter(v => v.id !== id);
  store.set("novaVideos", state.videos);
  renderVideoHistory();

  // Cloud Sync delete
  if (state.authToken) {
    try {
      await deleteCloudVideo(id);
    } catch (err) {
      console.warn("Could not delete from cloud, will retry. Error:", err.message);
    }
  }
}

// Helper to escape HTML tags to prevent XSS
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Clear UI display helper on logout
function clearVisibleVideos() {
  state.videos = [];
  state.activeVideoId = "";
  localStorage.removeItem("novaActiveVideoId");
  store.set("novaVideos", []);
  
  if (videoPlayer) {
    videoPlayer.style.display = "none";
    videoPlayer.src = "";
  }
  if (videoPlaceholder) {
    videoPlaceholder.style.display = "flex";
    videoPlaceholder.innerHTML = `
      <div class="placeholder-icon">🎬</div>
      <p>Your generated video will render here.</p>
    `;
  }
  if (videoCustomControls) videoCustomControls.style.display = "none";
  if (videoProjectInfo) videoProjectInfo.style.display = "none";
  if (videoPlayerTitle) videoPlayerTitle.textContent = "Generated Asset";
  renderVideoHistory();
}

// ==========================================================================
// Cloud Sync Integration for Videos
// ==========================================================================

async function loadCloudVideos() {
  if (!state.authToken) return;
  try {
    const data = await callNovaAuth(`${NOVA_API_ROUTES.sync}?action=video`, { method: "GET" });
    if (data.videos) {
      // Merge local with cloud (cloud takes precedence for matches)
      const localMap = new Map(state.videos.map(v => [v.id, v]));
      data.videos.forEach(cloudVideo => {
        localMap.set(cloudVideo.id, cloudVideo);
      });
      state.videos = Array.from(localMap.values());
      store.set("novaVideos", state.videos);
      renderVideoHistory();
      
      if (state.activeVideoId) {
        const activeVideo = state.videos.find(v => v.id === state.activeVideoId);
        if (activeVideo) openVideo(activeVideo);
      }
    }
  } catch (error) {
    console.error("Failed to load cloud videos:", error.message);
  }
}

function scheduleCloudVideoSync() {
  if (!state.authToken || state.isSyncingVideos) return;
  clearTimeout(state.videoSyncTimer);
  state.videoSyncTimer = window.setTimeout(syncAllVideosToCloud, 1000);
}

async function syncAllVideosToCloud() {
  if (!state.authToken || state.isSyncingVideos) return;
  state.isSyncingVideos = true;

  try {
    // Sync unsynced/updated videos one by one or batch
    for (const video of state.videos) {
      await callNovaAuth(NOVA_API_ROUTES.sync, {
        method: "POST",
        body: JSON.stringify({ action: "video", subAction: "upsert", video })
      });
    }
    updateVideoStatusText("✅ Video history synced with cloud.");
  } catch (error) {
    console.error("Video cloud sync error:", error.message);
    updateVideoStatusText(`⚠️ Cloud sync pending: ${error.message}`);
  } finally {
    state.isSyncingVideos = false;
  }
}

async function deleteCloudVideo(id) {
  return callNovaAuth(NOVA_API_ROUTES.sync, {
    method: "POST",
    body: JSON.stringify({ action: "video", subAction: "delete", id })
  });
}
