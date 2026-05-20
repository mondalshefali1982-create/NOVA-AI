// ─── STATE ───
const state = {
  tasks: JSON.parse(localStorage.getItem('nova_tasks') || '[]'),
  prompts: JSON.parse(localStorage.getItem('nova_prompts') || '[]'),
  settings: JSON.parse(localStorage.getItem('nova_settings') || '{"darkMode":true,"glowMode":true,"compactMode":false,"autoSave":false,"motivation":true}'),
 apiKey: localStorage.getItem('nova_api_key') || '',
  messages: [{ role: 'system', content: 'You are NOVA, a helpful and intelligent AI productivity assistant. You help users brainstorm ideas, write content, solve problems, analyze data, and optimize their workflows. Be concise, insightful, and practical. Format responses clearly.' }],
  msgSentCount: 0,
  isTyping: false
};

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  initGreeting();
  initActivityChart();
  loadApiKey();
  renderTasks();
  renderPrompts();
  renderRecentTasks();
  updateStatCards();
  fetchMotivationQuote();
  loadSettings();
  setupEventListeners();
});

// ─── GREETING ───
function initGreeting() {
  const hour = new Date().getHours();
  const greetEl = document.getElementById('greeting');
  if (!greetEl) return;
  if (hour < 12) greetEl.textContent = 'Good morning ✨';
  else if (hour < 18) greetEl.textContent = 'Good afternoon ⚡';
  else greetEl.textContent = 'Good evening 🌙';
}

// ─── NAV / PANELS ───
function switchPanel(name) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(el => el.classList.remove('active'));

  const activeNav = document.querySelector(`[data-panel="${name}"]`);
  const activePanel = document.getElementById(`panel-${name}`);
  if (activeNav) activeNav.classList.add('active');
  if (activePanel) activePanel.classList.add('active');

  const titles = { home: 'Dashboard', chat: 'AI Chat', tools: 'AI Tools', tasks: 'Tasks', prompts: 'Saved Prompts', settings: 'Settings' };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[name] || name;

  // Close mobile sidebar
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('overlay')?.classList.remove('show');

  if (name === 'tasks') renderTasks();
  if (name === 'prompts') renderPrompts();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => switchPanel(item.dataset.panel));
});

// ─── MOBILE SIDEBAR ───
function setupEventListeners() {
  const menuBtn = document.getElementById('menuBtn');
  const overlay = document.getElementById('overlay');
  const sidebar = document.getElementById('sidebar');

  menuBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });

  // Chat enter key
  const chatInput = document.getElementById('chatInput');
  chatInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  chatInput?.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
  });

  // Task enter key
  document.getElementById('taskInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });
}

// ─── ACTIVITY CHART ───
function initActivityChart() {
  const chart = document.getElementById('activityChart');
  if (!chart) return;
  const heights = [20, 45, 30, 65, 50, 80, 70];
  chart.innerHTML = heights.map((h, i) => `
    <div class="mini-bar" style="height:${h}%;animation:barGrow 0.8s ease ${i * 0.1}s both"></div>
  `).join('');
}

// ─── MOTIVATION QUOTE ───
async function fetchMotivationQuote() {
  const quoteEl = document.getElementById('quoteText');
  const authorEl = document.getElementById('quoteAuthor');
  if (!quoteEl || !state.settings.motivation) return;

  const quotes = [
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Move fast and build things that matter.", author: "Silicon Valley Wisdom" },
    { text: "Your limitation—it's only your imagination.", author: "Unknown" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
    { text: "Great things never come from comfort zones.", author: "Unknown" },
    { text: "Dream it. Wish it. Do it.", author: "Unknown" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" }
  ];

  try {
    const resp = await fetch('https://api.quotable.io/random?tags=technology,wisdom,business');
    if (resp.ok) {
      const data = await resp.json();
      if (data.content) {
        quoteEl.textContent = data.content;
        authorEl.textContent = `— ${data.author}`;
        return;
      }
    }
  } catch (_) {}

  // Fallback to local quotes
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  quoteEl.textContent = q.text;
  authorEl.textContent = `— ${q.author}`;
}

// ─── API KEY ───
function saveApiKey() {
  const input = document.getElementById('apiKeyInput');
  if (!input?.value.trim()) return;
  state.apiKey = input.value.trim();
  localStorage.setItem('nova_api_key', state.apiKey);
  input.style.borderColor = '#22d3a5';
  setTimeout(() => { input.style.borderColor = ''; }, 2000);
  showToast('API key saved!');
}

function loadApiKey() {
  const input = document.getElementById('apiKeyInput');
  if (input && state.apiKey) {
    input.value = state.apiKey;
  }
}

// ─── AI CHAT ───
async function sendMessage() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const text = input?.value.trim();
  if (!text || state.isTyping) return;

  // Check API key
  if (!state.apiKey) {
    appendMessage('ai', '⚠️ Please add your OpenRouter API key above to enable AI chat. Get a free key at **openrouter.ai** — it only takes 30 seconds!');
    return;
  }

  state.isTyping = true;
  if (sendBtn) sendBtn.disabled = true;

  // Add user message
  appendMessage('user', text);
  state.messages.push({ role: 'user', content: text });
  state.msgSentCount++;
  updateStatCards();

  if (input) { input.value = ''; input.style.height = 'auto'; }

  // Show typing indicator
  const typingId = showTyping();

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'NOVA AI Dashboard'
      },
      body: JSON.stringify({
        model: 'openrouter/auto',
        messages: state.messages,
        max_tokens: 800,
        temperature: 0.8
      })
    });

    removeTyping(typingId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'I encountered an issue generating a response. Please try again.';

    appendMessage('ai', reply);
    state.messages.push({ role: 'assistant', content: reply });

    // Auto-save if enabled
    if (state.settings.autoSave) savePromptToLibrary(text);

  } catch (err) {
    removeTyping(typingId);
    let errorMsg = '⚠️ Connection failed. ';
    if (err.message.includes('401') || err.message.includes('auth')) {
      errorMsg += 'Invalid API key. Please check your key and try again.';
    } else if (err.message.includes('429')) {
      errorMsg += 'Rate limit reached. Please wait a moment and try again.';
    } else {
      errorMsg += `Error: ${err.message}`;
    }
    appendMessage('ai', errorMsg);
  }

  state.isTyping = false;
  if (sendBtn) sendBtn.disabled = false;
}

function appendMessage(role, text) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const isUser = role === 'user';
  const div = document.createElement('div');
  div.className = `message ${isUser ? 'user' : 'ai'}`;

  div.innerHTML = `
    <div class="msg-avatar ${isUser ? 'user-av' : 'ai'}">${isUser ? 'U' : 'N'}</div>
    <div class="msg-bubble">${formatMessage(text)}</div>
  `;

  if (!isUser) {
    const saveBtn = document.createElement('button');
    saveBtn.innerHTML = '💾 Save';
    saveBtn.style.cssText = 'background:none;border:1px solid rgba(108,99,255,0.3);border-radius:6px;color:#6c63ff;font-size:0.72rem;padding:4px 8px;cursor:pointer;margin-top:8px;font-family:"DM Sans",sans-serif;display:block';
    saveBtn.onclick = () => savePromptToLibrary(text);
    div.querySelector('.msg-bubble')?.appendChild(saveBtn);
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(108,99,255,0.15);padding:2px 5px;border-radius:4px;font-family:monospace;font-size:0.85em">$1</code>')
    .replace(/\n/g, '<br>');
}

function showTyping() {
  const id = 'typing-' + Date.now();
  const container = document.getElementById('chatMessages');
  if (!container) return id;
  const div = document.createElement('div');
  div.id = id;
  div.className = 'message ai';
  div.innerHTML = `
    <div class="msg-avatar ai">N</div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

function useHint(el) {
  const input = document.getElementById('chatInput');
  if (input) {
    input.value = el.textContent;
    input.focus();
  }
}

// ─── TOOLS ───
function startTool(tool) {
  const prompts = {
    caption: 'Generate 5 creative and engaging social media captions for Instagram. Make them trendy, include relevant emojis and hashtags. The niche is: [technology/startups/AI]',
    prompt: 'Generate 5 highly optimized AI prompts for different creative tasks. Make them detailed, specific, and ready to use with any AI model.',
    startup: 'Generate 3 unique startup ideas for 2025. For each idea include: Problem it solves, Target market, Revenue model, Competitive advantage, and First steps to launch.',
    productivity: 'Create an optimized daily schedule for a tech founder. Include deep work blocks, breaks, meetings, exercise, and learning time. Make it realistic and highly productive.',
    writing: 'Help me write a compelling blog post introduction about the future of artificial intelligence and how it will reshape productivity in the next 5 years.',
    workspace: 'I want to organize my workspace for maximum productivity. Give me a framework for organizing my digital files, tasks, notes, and projects using AI tools.'
  };

  const chatInput = document.getElementById('chatInput');
  if (chatInput) chatInput.value = prompts[tool] || '';
  switchPanel('chat');
  chatInput?.focus();
}

// ─── TASKS ───
function addTask() {
  const input = document.getElementById('taskInput');
  const text = input?.value.trim();
  if (!text) return;

  const task = { id: Date.now(), text, done: false, created: new Date().toISOString() };
  state.tasks.unshift(task);
  saveTasks();
  renderTasks();
  renderRecentTasks();
  updateStatCards();
  if (input) input.value = '';
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) { task.done = !task.done; saveTasks(); renderTasks(); renderRecentTasks(); updateStatCards(); }
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveTasks(); renderTasks(); renderRecentTasks(); updateStatCards();
}

function renderTasks() {
  const list = document.getElementById('tasksList');
  if (!list) return;

  if (state.tasks.length === 0) {
    list.innerHTML = '<div class="empty-state"><span class="empty-icon">✅</span><p>No tasks yet. Add your first task above!</p></div>';
    return;
  }

  list.innerHTML = state.tasks.map(task => `
    <div class="task-item ${task.done ? 'done' : ''}">
      <button class="task-check" onclick="toggleTask(${task.id})">${task.done ? '✓' : ''}</button>
      <span class="task-text">${escapeHtml(task.text)}</span>
      <button class="task-del" onclick="deleteTask(${task.id})">✕</button>
    </div>
  `).join('');
}

function renderRecentTasks() {
  const el = document.getElementById('recentTasks');
  if (!el) return;
  const recent = state.tasks.slice(0, 3);
  if (recent.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem">No tasks yet. Add some in the Tasks panel.</p>';
    return;
  }
  el.innerHTML = recent.map(t => `
    <div style="display:flex;align-items:center;gap:0.6rem;padding:0.6rem 0;border-bottom:1px solid var(--border);">
      <div style="width:10px;height:10px;border-radius:50%;background:${t.done ? '#22d3a5' : 'var(--purple)'};flex-shrink:0"></div>
      <span style="font-size:0.88rem;color:${t.done ? 'var(--text-muted)' : 'var(--white)'};${t.done ? 'text-decoration:line-through' : ''}">${escapeHtml(t.text)}</span>
    </div>
  `).join('');
}

function saveTasks() { localStorage.setItem('nova_tasks', JSON.stringify(state.tasks)); }

// ─── PROMPTS ───
function savePromptToLibrary(text) {
  if (!text || text.length < 10) return;
  const prompt = { id: Date.now(), text: text.slice(0, 500), saved: new Date().toISOString() };
  state.prompts.unshift(prompt);
  if (state.prompts.length > 50) state.prompts = state.prompts.slice(0, 50);
  localStorage.setItem('nova_prompts', JSON.stringify(state.prompts));
  updateStatCards();
  showToast('Prompt saved!');
}

function usePrompt(id) {
  const p = state.prompts.find(p => p.id === id);
  if (!p) return;
  const chatInput = document.getElementById('chatInput');
  if (chatInput) chatInput.value = p.text;
  switchPanel('chat');
}

function deletePrompt(id) {
  state.prompts = state.prompts.filter(p => p.id !== id);
  localStorage.setItem('nova_prompts', JSON.stringify(state.prompts));
  renderPrompts(); updateStatCards();
}

function clearAllPrompts() {
  if (!confirm('Clear all saved prompts?')) return;
  state.prompts = [];
  localStorage.setItem('nova_prompts', JSON.stringify(state.prompts));
  renderPrompts(); updateStatCards();
}

function renderPrompts() {
  const grid = document.getElementById('promptsGrid');
  if (!grid) return;

  if (state.prompts.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><span class="empty-icon">📚</span><p>No saved prompts yet. Use the AI Chat and save your favorite messages!</p></div>';
    return;
  }

  grid.innerHTML = state.prompts.map(p => `
    <div class="prompt-card">
      <div class="prompt-card-text">${escapeHtml(p.text)}</div>
      <div class="prompt-card-actions">
        <button class="prompt-card-btn btn-use" onclick="usePrompt(${p.id})">Use →</button>
        <button class="prompt-card-btn btn-del" onclick="deletePrompt(${p.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

// ─── STATS ───
function updateStatCards() {
  const msgEl = document.getElementById('msgCount');
  const taskEl = document.getElementById('taskCount');
  const promptEl = document.getElementById('promptCount');

  if (msgEl) msgEl.textContent = state.msgSentCount;
  if (taskEl) taskEl.textContent = state.tasks.filter(t => t.done).length;
  if (promptEl) promptEl.textContent = state.prompts.length;
}

// ─── SETTINGS ───
function toggleSetting(btn, key) {
  btn.classList.toggle('on');
  state.settings[key] = btn.classList.contains('on');
  localStorage.setItem('nova_settings', JSON.stringify(state.settings));

  if (key === 'darkMode') {
    document.body.style.filter = state.settings.darkMode ? '' : 'invert(0.9) hue-rotate(180deg)';
  }
  showToast('Settings saved');
}

function loadSettings() {
  const toggles = {
    darkToggle: 'darkMode', glowToggle: 'glowMode',
    compactToggle: 'compactMode', autoSaveToggle: 'autoSave',
    motivToggle: 'motivation'
  };

  Object.entries(toggles).forEach(([elId, key]) => {
    const el = document.getElementById(elId);
    if (el) {
      el.classList.toggle('on', !!state.settings[key]);
    }
  });
}

function clearAllData() {
  if (!confirm('This will delete all your tasks, prompts, settings, and API key. Are you sure?')) return;
  localStorage.clear();
  location.reload();
}

// ─── THEME ───
const themeBtn = document.getElementById('themeToggleBtn');
let lightMode = false;
themeBtn?.addEventListener('click', () => {
  lightMode = !lightMode;
  document.body.style.filter = lightMode ? 'invert(0.92) hue-rotate(180deg)' : '';
  themeBtn.textContent = lightMode ? '☀️' : '🌙';
});

// ─── TOAST ───
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:linear-gradient(135deg,#6c63ff,#8b5cf6);color:white;padding:0.65rem 1.2rem;border-radius:10px;font-size:0.85rem;z-index:9999;font-family:"DM Sans",sans-serif;box-shadow:0 4px 20px rgba(108,99,255,0.4);opacity:0;transition:opacity 0.3s';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ─── UTILS ───
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
