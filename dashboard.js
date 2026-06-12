const NOVA_BACKEND_BASE_URL = (window.NOVA_BACKEND_BASE_URL || "").replace(/\/$/, "");
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
  conversations: store.get("novaConversations", []),
  activeConversationId: localStorage.getItem("novaActiveConversationId") || "",
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
  authToken: localStorage.getItem("novaAuthToken") || "",
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
const voiceResponse = document.getElementById("voiceResponse");
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

createParticles();
addCursorGlow();
setGreeting();
applySettings();
renderAll();
loadQuote();
restoreChat();
function restoreChat() {
renderImages();
renderPlanner();
activatePanelFromHash();
updateAuthUI();
initializeAuthSession();
dismissLoader();
registerServiceWorker();

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
    await syncAllConversationsToCloud();
    setAuthStatus(`Account ready for ${state.currentUser?.name || "NOVA user"}. Local chats are syncing.`);
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
    setAuthStatus("Logged out. Guest mode is active and local memory still works.");
  }
}

function completeAuthSession(data) {
  if (!data?.token) {
    throw new Error("The backend did not return a JWT token.");
  }

  state.authToken = data.token;
  state.currentUser = data.user || null;
  localStorage.setItem("novaAuthToken", state.authToken);
  if (authPassword) authPassword.value = "";
  updateAuthUI();
  setGreeting();
}

function clearAuthSession() {
  state.authToken = "";
  state.currentUser = null;
  localStorage.removeItem("novaAuthToken");
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

// ─── Conversation Management ──────────────────────────────────────────────────

function closeSidebar() {
  setSidebarState(false);
}

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

// ─── Upgraded Conversational Voice Mode ────────────────────────────────────────

function cleanTextForSpeech(text) {
  if (!text) return "";
  
  let clean = text;
  
  // 1. Completely omit complex technical multi-line structural fences
  clean = clean.replace(/```[\s\S]*?```/g, " [code block omitted] ");
  
  // 2. Clear horizontal rules and decorative dividers
  clean = clean.replace(/^---+$/gm, "");
  
  // 3. Clean up Markdown links, converting [Display Text](url) to just "Display Text"
  clean = clean.replace(/\[(.*?)\]\((.*?)\)/g, "$1");
  
  // 4. Strip structurally placed list bullets or markdown check indicators at start of lines
  clean = clean.replace(/^[•\-*+]\s+/gm, ""); 
  
  // 5. Strip common text wrapper symbols (bold, italic, inline-code)
  clean = clean.replace(/\*\*\*([^\*]+)\*\*\*/g, "$1");
  clean = clean.replace(/\*\*([^\*]+)\*\*/g, "$1");
  clean = clean.replace(/\*([^\*]+)\*/g, "$1");
  clean = clean.replace(/`([^`]+)`/g, "$1");
  clean = clean.replace(/__([^_]+)__/g, "$1");
  clean = clean.replace(/_([^_]+)_/g, "$1");
  
  // 6. Contextually clear structural characters (like headings or blockquotes) 
  // while safely ignoring hyphens or underscores tucked between word characters (\b)
  clean = clean.replace(/(?:\s|^)[#*>+]+(?:\s|$)/g, " ");
  
  // 7. Clean up loose stray symbols that aren't parts of words
  clean = clean.replace(/\s[#*>+]/g, " ");
  
  // 8. Condense multiple spaces and line-breaks down into standard spaces for smooth pacing
  clean = clean.replace(/\n+/g, " ");
  clean = clean.replace(/\s+/g, " ");
  
  return clean.trim();
}

async function askVoiceAI(message) {
  const userName = state.currentUser?.name || "User";
  const voiceSystemInstruction = `You are NOVA Voice Assistant. Speak naturally like a real human assistant. Rules: Never use markdown. Never use bullet points. Never use headings. Never use code blocks. Never use separators like ---. Never use hashtags. Never use asterisks. Never mention formatting. Use short conversational sentences. Sound friendly, intelligent, and professional. Keep answers concise and easy to listen to. Address the user naturally when appropriate.`;

  const response = await callNovaBackend(NOVA_API_ROUTES.chat, {
    message,
    systemInstruction: voiceSystemInstruction,
    history: getActiveConversation()?.messages.slice(-8) || []
  });
  return response.text;
}

function toggleVoiceMode() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (voiceStatus) {
      voiceStatus.textContent = "Voice recognition isn't supported in this browser. Try Chrome on desktop.";
    }
    return;
  }

  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    setVoiceVisualState("idle");
    return;
  }

  // Ensure a persistent container element with id="voiceResponse" exists inside the Voice Mode panel frame
  let dynamicResponseTarget = document.getElementById("voiceResponse");
  if (!dynamicResponseTarget) {
    const voicePanel = document.getElementById("voice-mode") || document.querySelector(".voice-interface-container") || document.body;
    dynamicResponseTarget = document.createElement("div");
    dynamicResponseTarget.id = "voiceResponse";
    dynamicResponseTarget.className = "voice-response";
    voicePanel.appendChild(dynamicResponseTarget);
  }

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.lang = state.settings.language === "hi" ? "hi-IN" : state.settings.language === "bn" ? "bn-IN" : "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setVoiceVisualState("listening");
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      if (voiceStatus) voiceStatus.textContent = `You: ${transcript}`;
      
      setVoiceVisualState("thinking");
      saveChatMessage("user", transcript);

      try {
        const response = await askVoiceAI(transcript);
        
        // Display full response inside the container card instantly, using high-speed markdown streaming
        if (dynamicResponseTarget) {
  renderFormattedText(dynamicResponseTarget, response);
          console.log("VOICE RESPONSE:", dynamicResponseTarget.innerHTML);
          setVoiceVisualState("speaking")
} else if (voiceStatus) {
          voiceStatus.textContent = response;
        }
        
        saveChatMessage("ai", response);
        speakResponse(response);
      } catch (err) {
        const fallback = buildFallbackResponse(transcript);
        const cleanFallback = cleanTextForSpeech(fallback);
        if (dynamicResponseTarget) {
          renderFormattedText(dynamicResponseTarget, fallback);
        } else if (voiceStatus) {
          voiceStatus.textContent = cleanFallback;
        }
        speakResponse(cleanFallback);
      }
    };

    recognition.onerror = () => {
      setVoiceVisualState("idle");
    };

    recognition.onend = () => {
      if (window.speechSynthesis && !window.speechSynthesis.speaking) {
        setVoiceVisualState("idle");
      }
    };
  }

  if (isListening) {
    recognition.stop();
  } else {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    // Flush container canvas to clear prior frames when starting a fresh microphone cycle
    if (dynamicResponseTarget) dynamicResponseTarget.innerHTML = "";
    recognition.start();
  }
}

function setVoiceVisualState(mode) {
  isListening = (mode === "listening");
  
  if (!voiceOrb || !voiceToggle || !voiceStatus) return;

  voiceOrb.classList.remove("listening", "thinking", "speaking");
  
  if (mode === "listening") {
    voiceOrb.classList.add("listening");
    voiceToggle.textContent = "Stop Listening";
    voiceStatus.textContent = "Listening to you...";
  } else if (mode === "thinking") {
    voiceOrb.classList.add("thinking");
    voiceToggle.textContent = "Cancel";
    voiceStatus.textContent = "NOVA is processing...";
  } else if (mode === "speaking") {
    voiceOrb.classList.add("speaking");
    voiceToggle.textContent = "Mute / Stop";

    // Don't overwrite the AI response
    if (voiceStatus &&
        !voiceStatus.textContent.startsWith("You:")) {
        voiceStatus.textContent = "🔊 NOVA is speaking...";
    }
}else {
    voiceToggle.textContent = "Start Voice Mode";
    voiceStatus.textContent = "Click start to talk with NOVA.";
  }
}

function speakResponse(text) {
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const cleanedText = cleanTextForSpeech(text);
  const utterance = new SpeechSynthesisUtterance(cleanedText);
  
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const premiumVoice = voices.find(v => 
    (v.name.includes("Google") || v.name.includes("Natural")) && v.lang.startsWith("en")
  ) || voices.find(v => v.lang.startsWith("en"));

  if (premiumVoice) {
    utterance.voice = premiumVoice;
  }

  utterance.onstart = () => {
    setVoiceVisualState("speaking");
  };

  utterance.onend = () => {
    setVoiceVisualState("idle");
  };

  utterance.onerror = () => {
    setVoiceVisualState("idle");
  };

  window.speechSynthesis.speak(utterance);
}

if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

// ─── Conversation Handlers Continued ──────────────────────────────────────────

function startNewChat() {
  createConversation("New chat");
  state.lastUserPrompt = "";
  renderActiveConversation();
  renderConversationList();
}

function getActiveConversation() {
  return state.conversations.find((c) => c.id === state.activeConversationId);
}

function createConversation(title) {
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
  persistConversations();
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
      localStorage.setItem("novaActiveConversationId", state.activeConversationId);
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
  store.set("novaConversations", state.conversations);
  localStorage.setItem("novaActiveConversationId", state.activeConversationId);
  if (options.sync !== false) scheduleCloudConversationSync();
}

async function loadCloudConversations() {
  if (!state.authToken) return;

  const data = await callNovaAuth(NOVA_API_ROUTES.sync, { method: "GET" });
  const cloudConversations = Array.isArray(data.conversations) ? data.conversations : [];
  mergeCloudAndLocalConversations(cloudConversations);
  await syncAllConversationsToCloud();
}

function mergeCloudAndLocalConversations(cloudConversations = []) {
  const merged = new Map();

  [...cloudConversations, ...state.conversations].forEach((conversation) => {
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
    createConversation("New chat");
    return;
  }

  persistConversations({ sync: false });
  renderActiveConversation();
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

  const name = state.currentUser?.name || "User";
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

async function generateImage() {
  const type = document.getElementById("imageType").value;
  const prompt =
    document.getElementById("imagePrompt").value.trim() ||
    "NOVA AI futuristic SaaS platform neon blue purple";
  const fullPrompt = `${type}, ${prompt}, futuristic premium AI startup design, neon blue purple, cinematic, high detail`;
  let url;
  try {
    const response = await callNovaBackend(NOVA_API_ROUTES.image, {
      prompt: fullPrompt,
      type
    });
    url = response.url;
  } catch {
    url = createPlaceholderImage(fullPrompt);
  }
  state.images.unshift({
    id: crypto.randomUUID(),
    prompt: fullPrompt,
    url,
    createdAt: Date.now()
  });
  state.images = state.images.slice(0, 8);
  store.set("novaImages", state.images);
  renderImages();
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
  gallery.innerHTML = state.images.length
    ? ""
    : '<p class="conversation-empty">Generated images will appear here.</p>';

  const fragment = document.createDocumentFragment();

  state.images.forEach((image) => {
    const card = document.createElement("article");
    card.innerHTML = `<img src="${image.url}" alt="${escapeHtml(image.prompt)}"><p>${escapeHtml(image.prompt)}</p>`;
    fragment.appendChild(card);
  });

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
    const response = await fetch("https://api.quotable.io/random");
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
}
