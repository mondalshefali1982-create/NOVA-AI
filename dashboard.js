const NOVA_BACKEND_BASE_URL = "";
const NOVA_API_ROUTES = {
  chat: "/api/gemini/chat",
  document: "/api/gemini/document",
  planner: "/api/gemini/planner",
  image: "/api/gemini/image"
};

const store = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (error) {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const state = {
  tasks: store.get("novaTasks", []),
  prompts: store.get("novaPrompts", []),
  conversations: store.get("novaConversations", []),
  activeConversationId: localStorage.getItem("novaActiveConversationId") || "",
  settings: store.get("novaSettings", { light: false, compact: false, accent: "violet", wallpaper: "mesh", language: "en", mode: "freelancer" }),
  images: store.get("novaImages", []),
  planner: store.get("novaPlanner", []),
  profile: store.get("novaProfile", {}),
  requestCount: Number(localStorage.getItem("novaRequestCount") || 0),
  lastUserPrompt: "",
  generatedPrompt: ""
};

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

let recognition = null;
let isListening = false;

const templates = {
  caption: (input) => `Create 5 premium social captions for: ${input}. Include hooks, concise body copy, and a confident call to action.`,
  prompt: (input) => `Act as an expert prompt engineer. Build a structured reusable prompt for this goal: ${input}. Include context, task, constraints, output format, and quality checks.`,
  startup: (input) => `Generate 7 startup ideas for: ${input}. For each, include target user, pain point, MVP, pricing angle, and first validation step.`,
  writing: (input) => `Rewrite the following copy so it is clearer, more persuasive, and more premium while preserving meaning: ${input}.`
};

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
dismissLoader();
registerServiceWorker();

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

sidebarToggle?.addEventListener("click", () => {
  const isOpen = !sidebar?.classList.contains("open");
  setSidebarState(isOpen);
});

sidebarOverlay?.addEventListener("click", closeSidebar);
sidebarClose?.addEventListener("click", closeSidebar);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSidebar();
  if (event.key === "Escape") closeCommandPalette();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openCommandPalette();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 980) closeSidebar();
});

chatForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  state.lastUserPrompt = message;
  chatInput.value = "";
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
  } catch (error) {
    typing.remove();
    const fallback = buildFallbackResponse(message);
    const aiMessage = addMessage(chatMessages, "ai", "");
    await streamMessage(aiMessage, fallback);
    saveChatMessage("ai", fallback);
  }
});

taskForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  state.tasks.unshift({ id: crypto.randomUUID(), text, completed: false });
  taskInput.value = "";
  persistTasks();
});

document.getElementById("saveLastPrompt")?.addEventListener("click", () => {
  if (state.lastUserPrompt) savePrompt(state.lastUserPrompt);
});

document.getElementById("newChatBtn")?.addEventListener("click", startNewChat);
document.getElementById("clearAllChatsBtn")?.addEventListener("click", clearAllChats);

document.getElementById("saveGeneratedPrompt")?.addEventListener("click", () => {
  if (state.generatedPrompt) savePrompt(state.generatedPrompt);
});

document.getElementById("clearPrompts")?.addEventListener("click", () => {
  state.prompts = [];
  persistPrompts();
});

document.getElementById("refreshQuote")?.addEventListener("click", loadQuote);

document.querySelectorAll(".dashboard-tools .tool-card button").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".tool-card");
    const textarea = card.querySelector("textarea");
    const type = textarea.dataset.template;
    const input = textarea.value.trim() || "a new AI productivity workflow";
    state.generatedPrompt = templates[type](input);
    generatedPrompt.textContent = state.generatedPrompt;
  });
});

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

document.getElementById("generateDocBtn")?.addEventListener("click", generateDocument);
document.getElementById("copyDocBtn")?.addEventListener("click", copyDocument);
document.getElementById("downloadDocBtn")?.addEventListener("click", downloadDocument);
document.getElementById("generateImageBtn")?.addEventListener("click", generateImage);
document.getElementById("generatePlanBtn")?.addEventListener("click", generatePlan);
document.getElementById("exportMemoryBtn")?.addEventListener("click", exportMemory);
document.getElementById("commandPill")?.addEventListener("click", openCommandPalette);
voiceToggle?.addEventListener("click", toggleVoiceMode);

document.getElementById("authForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  state.profile = {
    name: document.getElementById("profileName").value.trim(),
    email: document.getElementById("profileEmail").value.trim()
  };
  store.set("novaProfile", state.profile);
  document.getElementById("profileStatus").textContent = `Profile saved for ${state.profile.name || "NOVA user"}.`;
});

commandPalette?.addEventListener("click", (event) => {
  if (event.target === commandPalette) closeCommandPalette();
});

commandInput?.addEventListener("input", renderCommands);

function activatePanelFromHash() {
  const requested = window.location.hash.replace("#", "") || "overview";
  activatePanel(requested);
}

function activatePanel(id) {
  const validPanel = document.getElementById(id) ? id : "overview";
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === validPanel));
  navLinks.forEach((link) => link.classList.toggle("active", link.dataset.panel === validPanel));
  mobileNavLinks.forEach((link) => link.classList.toggle("active", link.dataset.mobilePanel === validPanel));
}

function setSidebarState(isOpen) {
  sidebar?.classList.toggle("open", isOpen);
  sidebarOverlay?.classList.toggle("open", isOpen);
  document.body.classList.toggle("sidebar-open", isOpen);
  sidebarToggle?.setAttribute("aria-expanded", String(isOpen));
  sidebarToggle?.setAttribute("aria-label", isOpen ? "Close dashboard menu" : "Open dashboard menu");
}

function closeSidebar() {
  setSidebarState(false);
}

function restoreChat() {
  migrateSingleChatHistory();

  if (!state.activeConversationId || !getActiveConversation()) {
    createConversation("New chat");
  }

  renderActiveConversation();
  renderConversationList();
}

async function askFreeAI(message) {
  const backendResponse = await callNovaBackend(NOVA_API_ROUTES.chat, {
    message,
    history: getActiveConversation()?.messages.slice(-8) || []
  });
  return backendResponse.text;
}

async function callNovaBackend(route, payload) {
  const response = await fetch(`${NOVA_BACKEND_BASE_URL}${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("NOVA could not reach the secure Gemini backend right now.");
  }

  return response.json();
}

function buildFallbackResponse(message) {
  return `Secure Gemini backend is not configured yet. Local NOVA fallback for "${message}": clarify the goal, break it into 3 focused tasks, choose the fastest first step, and save the best prompt so you can reuse it later.`;
}

function addMessage(container, type, text) {
  if (!container) return null;
  const message = document.createElement("div");
  message.className = `message ${type}`;
  message.textContent = text;
  container.appendChild(message);
  trimMessages(container);
  container.scrollTop = container.scrollHeight;
  return message;
}

async function streamMessage(element, text) {
  if (!element) return;
  element.textContent = "";
  const chunkSize = text.length > 220 ? 4 : 2;

  for (let index = 0; index < text.length; index += chunkSize) {
    element.textContent += text.slice(index, index + chunkSize);
    element.parentElement.scrollTop = element.parentElement.scrollHeight;
    await wait(12);
  }
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

function startNewChat() {
  createConversation("New chat");
  state.lastUserPrompt = "";
  renderActiveConversation();
  renderConversationList();
}

function getActiveConversation() {
  return state.conversations.find((conversation) => conversation.id === state.activeConversationId);
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
        text: "New chat started. Tell me what you want to create, plan, or improve next.",
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
  if (chatMessages) chatMessages.innerHTML = "";
  if (overviewMessages) overviewMessages.innerHTML = "";

  const conversation = getActiveConversation();
  if (!conversation) return;

  conversation.messages.slice(-14).forEach((message) => addMessage(chatMessages, message.type, message.text));
  conversation.messages.slice(-2).forEach((message) => addMessage(overviewMessages, message.type, message.text));
}

function renderConversationList() {
  if (!conversationList) return;
  conversationList.innerHTML = "";

  if (!state.conversations.length) {
    conversationList.innerHTML = '<div class="conversation-empty">No saved chats yet.</div>';
    return;
  }

  state.conversations.forEach((conversation) => {
    const item = document.createElement("article");
    item.className = `conversation-item ${conversation.id === state.activeConversationId ? "active" : ""}`;
    item.innerHTML = `
      <button class="conversation-open" type="button">
        <strong>${escapeHtml(conversation.title)}</strong>
        <span>${formatConversationTime(conversation.updatedAt)}</span>
      </button>
      <button class="conversation-delete" type="button" aria-label="Delete ${escapeHtml(conversation.title)}">Delete</button>
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

    conversationList.appendChild(item);
  });
}

function deleteConversation(id) {
  state.conversations = state.conversations.filter((conversation) => conversation.id !== id);
  if (state.activeConversationId === id) {
    state.activeConversationId = state.conversations[0]?.id || "";
  }
  if (!state.activeConversationId) createConversation("New chat");
  persistConversations();
  renderActiveConversation();
  renderConversationList();
}

function clearAllChats() {
  state.conversations = [];
  state.activeConversationId = "";
  createConversation("New chat");
  renderActiveConversation();
  renderConversationList();
}

function persistConversations() {
  state.conversations = state.conversations
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 20);
  store.set("novaConversations", state.conversations);
  localStorage.setItem("novaActiveConversationId", state.activeConversationId);
}

function migrateSingleChatHistory() {
  const oldHistory = store.get("novaChatHistory", []);
  if (!oldHistory.length || state.conversations.length) return;

  state.conversations = [{
    id: crypto.randomUUID(),
    title: "Previous NOVA chat",
    createdAt: oldHistory[0]?.createdAt || Date.now(),
    updatedAt: oldHistory.at(-1)?.createdAt || Date.now(),
    messages: oldHistory
  }];
  state.activeConversationId = state.conversations[0].id;
  persistConversations();
  localStorage.removeItem("novaChatHistory");
}

function buildConversationTitle(text) {
  return text.length > 42 ? `${text.slice(0, 42)}...` : text;
}

function formatConversationTime(timestamp) {
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function toggleVoiceMode() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceStatus.textContent = "Voice recognition is not supported in this browser. Try Chrome on desktop or Android.";
    return;
  }

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.lang = state.settings.language === "hi" ? "hi-IN" : state.settings.language === "bn" ? "bn-IN" : "en-US";
    recognition.interimResults = false;
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      voiceStatus.textContent = `You said: ${transcript}`;
      const response = await askFreeAI(transcript).catch(() => buildFallbackResponse(transcript));
      voiceStatus.textContent = response;
      speakResponse(response);
      saveChatMessage("user", transcript);
      saveChatMessage("ai", response);
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
  if (active && voiceStatus) voiceStatus.textContent = "Listening...";
}

function speakResponse(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}

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
  commandInput.value = "";
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
  commands
    .filter((command) => command.label.toLowerCase().includes(query))
    .forEach((command) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = command.label;
      button.addEventListener("click", () => {
        if (command.panel) {
          window.location.hash = command.panel;
          activatePanel(command.panel);
        }
        if (command.action) command.action();
        closeCommandPalette();
      });
      commandResults.appendChild(button);
    });
}

function addTypingMessage(container) {
  const message = document.createElement("div");
  message.className = "message ai";
  message.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
  container.appendChild(message);
  container.scrollTop = container.scrollHeight;
  return message;
}

function trimMessages(container) {
  while (container.children.length > 8) {
    container.removeChild(container.firstElementChild);
  }
}

function renderTasks() {
  taskList.innerHTML = "";
  if (!state.tasks.length) {
    taskList.innerHTML = '<li class="task-item"><span>No tasks yet. Add your next focused move.</span></li>';
    return;
  }

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
      state.tasks = state.tasks.filter((savedTask) => savedTask.id !== task.id);
      persistTasks();
    });
    taskList.appendChild(item);
  });
}

function renderPrompts() {
  promptList.innerHTML = "";
  if (!state.prompts.length) {
    promptList.innerHTML = '<div class="prompt-item"><span>No saved prompts yet.</span></div>';
    return;
  }

  state.prompts.forEach((prompt) => {
    const item = document.createElement("div");
    item.className = "prompt-item";
    item.innerHTML = `
      <span>${escapeHtml(prompt.text)}</span>
      <button type="button">Delete</button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      state.prompts = state.prompts.filter((savedPrompt) => savedPrompt.id !== prompt.id);
      persistPrompts();
    });
    promptList.appendChild(item);
  });
}

function savePrompt(text) {
  state.prompts.unshift({ id: crypto.randomUUID(), text, createdAt: Date.now() });
  persistPrompts();
  activatePanel("saved-prompts");
  window.location.hash = "saved-prompts";
}

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

function applySettings() {
  document.body.classList.toggle("light-mode", state.settings.light);
  document.body.classList.toggle("compact-ui", state.settings.compact);
  document.body.dataset.accent = state.settings.accent;
  document.body.dataset.wallpaper = state.settings.wallpaper;
  document.body.dataset.mode = state.settings.mode;

  const themeToggle = document.getElementById("themeToggle");
  const compactToggle = document.getElementById("compactToggle");
  const accentSelect = document.getElementById("accentSelect");
  const wallpaperSelect = document.getElementById("wallpaperSelect");
  const languageSelect = document.getElementById("languageSelect");
  const modeSelect = document.getElementById("modeSelect");
  if (themeToggle) themeToggle.checked = state.settings.light;
  if (compactToggle) compactToggle.checked = state.settings.compact;
  if (accentSelect) accentSelect.value = state.settings.accent;
  if (wallpaperSelect) wallpaperSelect.value = state.settings.wallpaper;
  if (languageSelect) languageSelect.value = state.settings.language;
  if (modeSelect) modeSelect.value = state.settings.mode;
  updateModeSuggestion();
}

function renderAll() {
  renderTasks();
  renderPrompts();
  updateCounters();
}

function setGreeting() {
  const hour = new Date().getHours();
  let greeting = "Good Evening";
  if (hour < 12) greeting = "Good Morning";
  if (hour >= 12 && hour < 17) greeting = "Good Afternoon";

  if (greetingTitle) greetingTitle.textContent = `${greeting}, Rohan`;
  if (greetingSubtitle) {
    greetingSubtitle.textContent = "Build, plan, and automate your next focused move with NOVA.";
  }
}

function dismissLoader() {
  if (!startupLoader) return;
  window.setTimeout(() => {
    startupLoader.classList.add("hidden");
  }, 850);
}

function updateCounters() {
  document.getElementById("requestCount").textContent = state.requestCount;
  document.getElementById("taskCount").textContent = state.tasks.filter((task) => !task.completed).length;
  document.getElementById("promptCount").textContent = state.prompts.length;
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
  themePreview.querySelector("small").textContent = modeText[state.settings.mode] || modeText.freelancer;
}

async function generateDocument() {
  const type = document.getElementById("docType").value;
  const input = document.getElementById("docInput").value.trim() || "a premium AI productivity project";
  let output;
  try {
    const response = await callNovaBackend(NOVA_API_ROUTES.document, { type, input });
    output = response.text;
  } catch (error) {
    output = createLocalDocument(type, input);
  }
  document.getElementById("docOutput").textContent = output;
  state.prompts.unshift({ id: crypto.randomUUID(), text: `Generated ${type}: ${input}`, createdAt: Date.now() });
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

async function generateImage() {
  const type = document.getElementById("imageType").value;
  const prompt = document.getElementById("imagePrompt").value.trim() || "NOVA AI futuristic SaaS platform neon blue purple";
  const fullPrompt = `${type}, ${prompt}, futuristic premium AI startup design, neon blue purple, cinematic, high detail`;
  let url;
  try {
    const response = await callNovaBackend(NOVA_API_ROUTES.image, { prompt: fullPrompt, type });
    url = response.url;
  } catch (error) {
    url = createPlaceholderImage(fullPrompt);
  }
  state.images.unshift({ id: crypto.randomUUID(), prompt: fullPrompt, url, createdAt: Date.now() });
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
  gallery.innerHTML = state.images.length ? "" : '<p class="conversation-empty">Generated images will appear here.</p>';
  state.images.forEach((image) => {
    const card = document.createElement("article");
    card.innerHTML = `<img src="${image.url}" alt="${escapeHtml(image.prompt)}"><p>${escapeHtml(image.prompt)}</p>`;
    gallery.appendChild(card);
  });
}

async function generatePlan() {
  const input = document.getElementById("plannerInput").value.trim() || "finish priority tasks, study, and ship one project improvement";
  let blocks;
  try {
    const response = await callNovaBackend(NOVA_API_ROUTES.planner, { input });
    blocks = response.blocks;
  } catch (error) {
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
  timeline.innerHTML = state.planner.length ? "" : '<p class="conversation-empty">Generate a plan to build your day.</p>';
  state.planner.forEach((block) => {
    const item = document.createElement("article");
    item.className = "planner-block";
    item.innerHTML = `<span>${block.time}</span><strong>${escapeHtml(block.title)}</strong><p>${escapeHtml(block.text)}</p>`;
    timeline.appendChild(item);
  });
}

function exportMemory() {
  const data = {
    conversations: state.conversations,
    prompts: state.prompts,
    tasks: state.tasks,
    settings: state.settings,
    planner: state.planner,
    images: state.images,
    profile: state.profile
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "nova-ai-memory.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

async function loadQuote() {
  const quoteText = document.getElementById("quoteText");
  const quoteAuthor = document.getElementById("quoteAuthor");

  try {
    const response = await fetch("https://api.quotable.io/random");
    if (!response.ok) throw new Error("Quote request failed");
    const data = await response.json();
    quoteText.textContent = `"${data.content}"`;
    quoteAuthor.textContent = data.author ? `- ${data.author}` : "";
  } catch (error) {
    quoteText.textContent = "Small focused actions compound into serious momentum.";
    quoteAuthor.textContent = "- NOVA AI";
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function addCursorGlow() {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  document.body.appendChild(glow);

  window.addEventListener("pointermove", (event) => {
    glow.style.opacity = "1";
    glow.style.transform = `translate3d(${event.clientX - 110}px, ${event.clientY - 110}px, 0)`;
  });

  window.addEventListener("pointerleave", () => {
    glow.style.opacity = "0";
  });
}

function createParticles() {
  const scene = document.querySelector(".ambient-scene");
  if (!scene) return;

  for (let index = 0; index < 28; index += 1) {
    const particle = document.createElement("span");
    particle.className = "particle";
    particle.style.setProperty("--x", `${Math.random() * 100}%`);
    particle.style.setProperty("--y", `${Math.random() * 100}%`);
    particle.style.setProperty("--size", `${Math.random() * 2.2 + 1}px`);
    particle.style.setProperty("--duration", `${Math.random() * 8 + 8}s`);
    particle.style.setProperty("--delay", `${Math.random() * -10}s`);
    scene.appendChild(particle);
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js")
      .then((registration) => registration.update())
      .catch(() => {});
  }
}
