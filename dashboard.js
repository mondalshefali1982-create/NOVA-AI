const FREE_AI_ENDPOINT = "https://text.pollinations.ai/openai";
const FREE_AI_MODEL = "openai";

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
  settings: store.get("novaSettings", { light: false, compact: false, accent: "violet" }),
  requestCount: Number(localStorage.getItem("novaRequestCount") || 0),
  lastUserPrompt: "",
  generatedPrompt: ""
};

const panels = document.querySelectorAll(".dashboard-panel");
const navLinks = document.querySelectorAll("[data-panel]");
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

const templates = {
  caption: (input) => `Create 5 premium social captions for: ${input}. Include hooks, concise body copy, and a confident call to action.`,
  prompt: (input) => `Act as an expert prompt engineer. Build a structured reusable prompt for this goal: ${input}. Include context, task, constraints, output format, and quality checks.`,
  startup: (input) => `Generate 7 startup ideas for: ${input}. For each, include target user, pain point, MVP, pricing angle, and first validation step.`,
  writing: (input) => `Rewrite the following copy so it is clearer, more persuasive, and more premium while preserving meaning: ${input}.`
};

createParticles();
addCursorGlow();
applySettings();
renderAll();
loadQuote();
seedChat();
activatePanelFromHash();

window.addEventListener("hashchange", activatePanelFromHash);

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    activatePanel(link.dataset.panel);
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
  const typing = addTypingMessage(chatMessages);

  try {
    const response = await askFreeAI(message);
    typing.remove();
    addMessage(chatMessages, "ai", response);
    addMessage(overviewMessages, "ai", response);
    state.requestCount += 1;
    localStorage.setItem("novaRequestCount", String(state.requestCount));
    updateCounters();
  } catch (error) {
    typing.remove();
    addMessage(chatMessages, "ai", buildFallbackResponse(message));
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

function activatePanelFromHash() {
  const requested = window.location.hash.replace("#", "") || "overview";
  activatePanel(requested);
}

function activatePanel(id) {
  const validPanel = document.getElementById(id) ? id : "overview";
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === validPanel));
  navLinks.forEach((link) => link.classList.toggle("active", link.dataset.panel === validPanel));
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

function seedChat() {
  if (!chatMessages.children.length) {
    addMessage(chatMessages, "ai", "Welcome to NOVA. Ask me to plan a launch, summarize a task list, generate a prompt, or sharpen an idea.");
    addMessage(overviewMessages, "ai", "Workspace ready. Your AI command center is online.");
  }
}

async function askFreeAI(message) {
  const response = await fetch(FREE_AI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: FREE_AI_MODEL,
      messages: [
        { role: "system", content: "You are NOVA AI, a concise productivity assistant for founders and teams." },
        { role: "user", content: message }
      ]
    })
  });

  if (!response.ok) {
    throw new Error("NOVA could not reach the free AI service right now. Try again in a moment.");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "NOVA did not return a response. Try again with a clearer request.";
}

function buildFallbackResponse(message) {
  return `The free AI service is busy, so here is a quick NOVA-style fallback for "${message}": clarify the goal, break it into 3 focused tasks, choose the fastest first step, and save the best prompt so you can reuse it later.`;
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

  const themeToggle = document.getElementById("themeToggle");
  const compactToggle = document.getElementById("compactToggle");
  const accentSelect = document.getElementById("accentSelect");
  if (themeToggle) themeToggle.checked = state.settings.light;
  if (compactToggle) compactToggle.checked = state.settings.compact;
  if (accentSelect) accentSelect.value = state.settings.accent;
}

function renderAll() {
  renderTasks();
  renderPrompts();
  updateCounters();
}

function updateCounters() {
  document.getElementById("requestCount").textContent = state.requestCount;
  document.getElementById("taskCount").textContent = state.tasks.filter((task) => !task.completed).length;
  document.getElementById("promptCount").textContent = state.prompts.length;
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
