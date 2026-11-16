const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://zoatfgioaygwpoebuubt.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

let supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    return supabaseClient;
  } catch (err) {
    console.warn("[supabase] Client initialization error:", err.message);
    return null;
  }
}

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY && getSupabaseClient());
}

// ── USERS ─────────────────────────────────────────────────────────────
async function findUserByEmail(email = "") {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const clean = String(email).trim().toLowerCase();
  const { data, error } = await sb
    .from("users")
    .select("*")
    .eq("email", clean)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[supabase] findUserByEmail error:", error.message);
    return null;
  }
  return data;
}

async function findUserById(id = "") {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("users")
    .select("id, name, email, created_at")
    .eq("id", String(id))
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[supabase] findUserById error:", error.message);
    return null;
  }
  return data;
}

async function createUser({ name, email, password }) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Supabase is not configured.");
  const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const cleanEmail = String(email).trim().toLowerCase();

  const { data, error } = await sb
    .from("users")
    .insert([
      {
        id,
        name: String(name).trim(),
        email: cleanEmail,
        password,
        created_at: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── CONVERSATIONS ─────────────────────────────────────────────────────
async function listConversations(userId) {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("conversations")
    .select("*")
    .eq("user_id", String(userId))
    .order("updated_at", { ascending: false });

  if (error) {
    console.warn("[supabase] listConversations error:", error.message);
    return [];
  }

  return (data || []).map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: new Date(c.created_at).getTime(),
    updatedAt: new Date(c.updated_at).getTime(),
    messages: (c.messages || [])
      .map((m) => ({
        type: m.role || m.type,
        text: m.content || m.text || "",
        createdAt: m.timestamp ? new Date(m.timestamp).getTime() : Date.now()
      }))
      .filter((m) => m.type && typeof m.text === "string")
  }));
}

async function upsertConversation(userId, conversation) {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const now = new Date().toISOString();

  const messages = Array.isArray(conversation.messages)
    ? conversation.messages
        .filter((m) => m && typeof (m.text || m.content) === "string")
        .map((m) => ({
          role: (m.role || m.type) === "user" ? "user" : "ai",
          content: m.content || m.text || "",
          timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : now
        }))
    : [];

  const row = {
    id: String(conversation.id),
    user_id: String(userId),
    title: String(conversation.title || "New chat"),
    messages,
    created_at: conversation.createdAt ? new Date(conversation.createdAt).toISOString() : now,
    updated_at: now
  };

  const { data, error } = await sb
    .from("conversations")
    .upsert([row], { onConflict: "user_id,id" })
    .select("id")
    .single();

  if (error) {
    console.warn("[supabase] upsertConversation error:", error.message);
    return null;
  }
  return data;
}

async function deleteConversation(userId, id) {
  const sb = getSupabaseClient();
  if (!sb) return false;
  const { error } = await sb
    .from("conversations")
    .delete()
    .eq("user_id", String(userId))
    .eq("id", String(id));

  if (error) {
    console.warn("[supabase] deleteConversation error:", error.message);
    return false;
  }
  return true;
}

// ── WEBSITES ──────────────────────────────────────────────────────────
async function listWebsites(userId, limit = 50) {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("websites")
    .select("*")
    .eq("user_id", String(userId))
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[supabase] listWebsites error:", error.message);
    return [];
  }

  return (data || []).map((w) => {
    const multiFiles = w.files && typeof w.files === "object"
      ? { ...w.files, "index.html": w.files["index.html"] || w.html || "" }
      : { "index.html": w.html || "" };

    return {
      id: w.id,
      name: w.name,
      prompt: w.prompt,
      websiteType: w.website_type,
      thumbnail: w.thumbnail,
      html: w.html || multiFiles["index.html"] || "",
      modelUsed: w.model_used,
      generationTimeMs: w.generation_time_ms || 0,
      logs: w.logs || {},
      meta: w.meta || {},
      files: multiFiles,
      createdAt: new Date(w.created_at).getTime(),
      updatedAt: new Date(w.updated_at).getTime()
    };
  });
}

async function upsertWebsite(userId, website) {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const now = new Date().toISOString();

  const multiFiles = website.files && typeof website.files === "object"
    ? { ...website.files, "index.html": website.files["index.html"] || website.html || "" }
    : { "index.html": website.html || "" };

  const row = {
    id: String(website.id),
    user_id: String(userId),
    name: String(website.name || website.meta?.name || "Generated Website"),
    prompt: String(website.prompt || "").slice(0, 4000),
    website_type: String(website.websiteType || website.meta?.websiteType || "Custom Website"),
    thumbnail: String(website.thumbnail || ""),
    html: String(website.html || multiFiles["index.html"] || ""),
    model_used: String(website.modelUsed || website.meta?.modelUsed || ""),
    generation_time_ms: Number(website.generationTimeMs || website.meta?.generationTimeMs || 0),
    logs: website.logs || {},
    meta: website.meta || {},
    files: multiFiles,
    created_at: website.createdAt ? new Date(website.createdAt).toISOString() : now,
    updated_at: now
  };

  const { data, error } = await sb
    .from("websites")
    .upsert([row], { onConflict: "user_id,id" })
    .select("id")
    .single();

  if (error) {
    console.warn("[supabase] upsertWebsite error:", error.message);
    return null;
  }
  return data;
}

async function deleteWebsite(userId, id) {
  const sb = getSupabaseClient();
  if (!sb) return false;
  const { error } = await sb
    .from("websites")
    .delete()
    .eq("user_id", String(userId))
    .eq("id", String(id));

  if (error) {
    console.warn("[supabase] deleteWebsite error:", error.message);
    return false;
  }
  return true;
}

// ── VIDEOS ────────────────────────────────────────────────────────────
async function listVideos(userId, limit = 50) {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("videos")
    .select("*")
    .eq("user_id", String(userId))
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[supabase] listVideos error:", error.message);
    return [];
  }

  return (data || []).map((v) => ({
    id: v.id,
    prompt: v.prompt,
    model: v.model,
    videoUrl: v.video_url,
    aspectRatio: v.aspect_ratio,
    duration: v.duration,
    quality: v.quality,
    createdAt: new Date(v.created_at).getTime(),
    updatedAt: new Date(v.updated_at).getTime()
  }));
}

async function upsertVideo(userId, video) {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const now = new Date().toISOString();

  const row = {
    id: String(video.id),
    user_id: String(userId),
    prompt: String(video.prompt || ""),
    model: String(video.model || "Wan-AI/Wan2.1-T2V-14B"),
    video_url: String(video.videoUrl || ""),
    thumbnail: String(video.thumbnail || ""),
    duration: String(video.duration || "5 seconds"),
    aspect_ratio: String(video.aspectRatio || "16:9"),
    quality: String(video.quality || "Fast"),
    created_at: video.createdAt ? new Date(video.createdAt).toISOString() : now,
    updated_at: now
  };

  const { data, error } = await sb
    .from("videos")
    .upsert([row], { onConflict: "user_id,id" })
    .select("id")
    .single();

  if (error) {
    console.warn("[supabase] upsertVideo error:", error.message);
    return null;
  }
  return data;
}

async function deleteVideo(userId, id) {
  const sb = getSupabaseClient();
  if (!sb) return false;
  const { error } = await sb
    .from("videos")
    .delete()
    .eq("user_id", String(userId))
    .eq("id", String(id));

  if (error) {
    console.warn("[supabase] deleteVideo error:", error.message);
    return false;
  }
  return true;
}

// ── MEMORIES (AI LONG-TERM MEMORY) ────────────────────────────────────
async function listMemories(userId, limit = 20) {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("memories")
    .select("*")
    .eq("user_id", String(userId))
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[supabase] listMemories error:", error.message);
    return [];
  }
  return data || [];
}

async function createMemory({ userId, content, category = "general", importance = "medium" }) {
  const sb = getSupabaseClient();
  if (!sb) return null;

  // Avoid exact duplicates
  const { data: existing } = await sb
    .from("memories")
    .select("id")
    .eq("user_id", String(userId))
    .eq("content", String(content))
    .limit(1);

  if (existing && existing.length > 0) return existing[0];

  const { data, error } = await sb
    .from("memories")
    .insert([
      {
        user_id: String(userId),
        content: String(content),
        category: String(category),
        importance: String(importance),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (error) {
    console.warn("[supabase] createMemory error:", error.message);
    return null;
  }
  return data;
}

module.exports = {
  getSupabaseClient,
  isSupabaseConfigured,
  findUserByEmail,
  findUserById,
  createUser,
  listConversations,
  upsertConversation,
  deleteConversation,
  listWebsites,
  upsertWebsite,
  deleteWebsite,
  listVideos,
  upsertVideo,
  deleteVideo,
  listMemories,
  createMemory
};
