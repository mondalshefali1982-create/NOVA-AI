const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const STORE_PATH = path.join(DATA_DIR, "local_db.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("[localStore] Could not create data directory:", err.message);
  }
}

// Initial default schema
const DEFAULT_STORE = {
  users: [
    {
      id: "usr_rohan_default",
      _id: "usr_rohan_default",
      name: "Rohan Mondal",
      email: "rohan@example.com",
      // bcrypt hash for "password123"
      password: bcrypt.hashSync("password123", 10),
      createdAt: new Date().toISOString()
    }
  ],
  conversations: [],
  websites: [],
  videos: [],
  memories: []
};

let cache = null;

function loadStore() {
  if (cache) return cache;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8");
      cache = JSON.parse(raw);
    } else {
      cache = JSON.parse(JSON.stringify(DEFAULT_STORE));
      saveStore();
    }
  } catch (err) {
    console.warn("[localStore] Error reading store, using memory fallback:", err.message);
    cache = JSON.parse(JSON.stringify(DEFAULT_STORE));
  }
  return cache;
}

function saveStore() {
  if (!cache) return;
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(cache, null, 2), "utf8");
  } catch (err) {
    console.warn("[localStore] Error saving store:", err.message);
  }
}

// ── Users ─────────────────────────────────────────────────────────────
async function findUser({ email }) {
  const store = loadStore();
  const lower = (email || "").toLowerCase();
  return store.users.find(u => u.email.toLowerCase() === lower) || null;
}

async function findUserById(id) {
  const store = loadStore();
  return store.users.find(u => u.id === id || u._id === id) || null;
}

async function createUser({ name, email, password }) {
  const store = loadStore();
  const hashedPassword = password.startsWith("$2a$") || password.startsWith("$2b$") 
    ? password 
    : await bcrypt.hash(password, 10);

  const newUser = {
    id: "usr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    _id: "usr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashedPassword,
    createdAt: new Date().toISOString()
  };
  newUser._id = newUser.id;

  store.users.push(newUser);
  saveStore();
  return newUser;
}

// ── Conversations ─────────────────────────────────────────────────────
function findConversations(userId) {
  const store = loadStore();
  return (store.conversations || [])
    .filter(c => c.userId === userId || !userId)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

function upsertConversation(userId, conversation) {
  const store = loadStore();
  if (!store.conversations) store.conversations = [];

  const existingIdx = store.conversations.findIndex(c => c.id === conversation.id && (c.userId === userId || !userId));
  const now = new Date().toISOString();
  const item = {
    ...conversation,
    userId: userId || "guest",
    updatedAt: now,
    createdAt: conversation.createdAt || now
  };

  if (existingIdx !== -1) {
    store.conversations[existingIdx] = item;
  } else {
    store.conversations.unshift(item);
  }
  saveStore();
  return item;
}

function deleteConversation(userId, id) {
  const store = loadStore();
  if (!store.conversations) return false;
  const initialLen = store.conversations.length;
  store.conversations = store.conversations.filter(c => !(c.id === id && (c.userId === userId || !userId)));
  if (store.conversations.length !== initialLen) {
    saveStore();
    return true;
  }
  return false;
}

// ── Websites ──────────────────────────────────────────────────────────
function findWebsites(userId) {
  const store = loadStore();
  return (store.websites || [])
    .filter(w => w.userId === userId || !userId)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

function upsertWebsite(userId, website) {
  const store = loadStore();
  if (!store.websites) store.websites = [];

  const existingIdx = store.websites.findIndex(w => w.id === website.id && (w.userId === userId || !userId));
  const now = new Date().toISOString();
  const item = {
    ...website,
    userId: userId || "guest",
    files: website.files && typeof website.files === "object" ? website.files : { "index.html": website.html || "" },
    updatedAt: now,
    createdAt: website.createdAt || now
  };

  if (existingIdx !== -1) {
    store.websites[existingIdx] = item;
  } else {
    store.websites.unshift(item);
  }
  saveStore();
  return item;
}

function deleteWebsite(userId, id) {
  const store = loadStore();
  if (!store.websites) return false;
  const initialLen = store.websites.length;
  store.websites = store.websites.filter(w => !(w.id === id && (w.userId === userId || !userId)));
  if (store.websites.length !== initialLen) {
    saveStore();
    return true;
  }
  return false;
}

// ── Videos ────────────────────────────────────────────────────────────
function findVideos(userId) {
  const store = loadStore();
  return (store.videos || [])
    .filter(v => v.userId === userId || !userId)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

function upsertVideo(userId, video) {
  const store = loadStore();
  if (!store.videos) store.videos = [];

  const existingIdx = store.videos.findIndex(v => v.id === video.id && (v.userId === userId || !userId));
  const now = new Date().toISOString();
  const item = {
    ...video,
    userId: userId || "guest",
    updatedAt: now,
    createdAt: video.createdAt || now
  };

  if (existingIdx !== -1) {
    store.videos[existingIdx] = item;
  } else {
    store.videos.unshift(item);
  }
  saveStore();
  return item;
}

function deleteVideo(userId, id) {
  const store = loadStore();
  if (!store.videos) return false;
  const initialLen = store.videos.length;
  store.videos = store.videos.filter(v => !(v.id === id && (v.userId === userId || !userId)));
  if (store.videos.length !== initialLen) {
    saveStore();
    return true;
  }
  return false;
}

// ── Memories ──────────────────────────────────────────────────────────
function findMemories(userId) {
  const store = loadStore();
  return (store.memories || []).filter(m => m.userId === userId || !userId);
}

function saveMemoryIfRelevant(message, userId) {
  const patterns = [
    { regex: /my name is (.+)/i, category: "personal", importance: "high", formatter: (m) => `User name is ${m[1].trim()}` },
    { regex: /i am building (.+)/i, category: "project", importance: "high", formatter: (m) => `User is building ${m[1].trim()}` },
    { regex: /my goal is (.+)/i, category: "goal", importance: "high", formatter: (m) => `User goal is ${m[1].trim()}` },
    { regex: /i am a (.+)/i, category: "career", importance: "medium", formatter: (m) => `User is a ${m[1].trim()}` },
    { regex: /i work as (.+)/i, category: "career", importance: "medium", formatter: (m) => `User works as ${m[1].trim()}` }
  ];

  const store = loadStore();
  if (!store.memories) store.memories = [];

  for (const pattern of patterns) {
    const match = message.match(pattern.regex);
    if (!match) continue;

    const content = pattern.formatter(match);
    const existing = store.memories.find(m => m.content === content && m.userId === userId);
    if (!existing) {
      store.memories.push({
        userId: userId || "guest",
        content,
        category: pattern.category,
        importance: pattern.importance,
        createdAt: new Date().toISOString()
      });
      saveStore();
      console.log("[localStore] Memory saved:", content);
    }
    break;
  }
}

module.exports = {
  findUser,
  findUserById,
  createUser,
  findConversations,
  upsertConversation,
  deleteConversation,
  findWebsites,
  upsertWebsite,
  deleteWebsite,
  findVideos,
  upsertVideo,
  deleteVideo,
  findMemories,
  saveMemoryIfRelevant
};
