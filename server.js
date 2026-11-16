const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// ── Environment Configuration ─────────────────────────────────────────
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
    console.log("[Server] Loaded environment variables from .env");
  } catch (err) {
    console.warn("[Server] Could not parse .env file:", err.message);
  }
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "nova-ai-super-secret-jwt-key-2026";
}

// ── Handlers ──────────────────────────────────────────────────────────
const authHandler = require("./api/auth");
const aiHandler = require("./api/ai");
const syncHandler = require("./api/sync");

const PORT = parseInt(process.env.PORT, 10) || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json"
};

function parseBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 50 * 1024 * 1024) {
        req.destroy();
        resolve({});
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
    req.on("error", () => resolve({}));
  });
}

function enhanceResponse(res) {
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.json = function (data) {
    if (!res.headersSent) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    res.end(JSON.stringify(data));
    return res;
  };
  res.send = function (data) {
    if (typeof data === "object" && !(data instanceof Buffer)) {
      return res.json(data);
    }
    res.end(data);
    return res;
  };
  return res;
}

function serveStatic(res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.end("404 Not Found");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  enhanceResponse(res);

  // Set CORS headers for all incoming requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost:3000"}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Populate req.query object
  req.query = Object.fromEntries(parsedUrl.searchParams);

  // ── API Routing ─────────────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    req.body = await parseBody(req);

    try {
      if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
        return await authHandler(req, res);
      }
      if (pathname === "/api/ai" || pathname.startsWith("/api/ai/")) {
        return await aiHandler(req, res);
      }
      if (pathname === "/api/sync" || pathname.startsWith("/api/sync/")) {
        return await syncHandler(req, res);
      }

      res.statusCode = 404;
      return res.json({ error: `API route not found: ${pathname}`, status: 404 });
    } catch (apiError) {
      console.error(`[Server API Error] ${req.method} ${pathname}:`, apiError);
      if (!res.headersSent) {
        res.statusCode = 500;
        return res.json({ error: apiError.message || "Internal server error.", status: 500 });
      }
    }
    return;
  }

  // ── Static Asset & Page Routing ─────────────────────────────────────
  if (pathname === "/" || pathname === "/dashboard" || pathname === "/chat") {
    return serveStatic(res, path.join(ROOT_DIR, "dashboard.html"));
  }

  if (pathname === "/login") {
    return serveStatic(res, path.join(ROOT_DIR, "login.html"));
  }

  // File resolution
  const relativePath = pathname.replace(/^\/+/, "");
  const safePath = path.normalize(path.join(ROOT_DIR, relativePath));

  // Security: prevent directory traversal
  if (!safePath.startsWith(ROOT_DIR)) {
    res.statusCode = 403;
    return res.end("Forbidden");
  }

  fs.stat(safePath, (err, stats) => {
    if (!err && stats.isFile()) {
      return serveStatic(res, safePath);
    }

    // Try appending .html
    const htmlCandidate = safePath + ".html";
    fs.stat(htmlCandidate, (htmlErr, htmlStats) => {
      if (!htmlErr && htmlStats.isFile()) {
        return serveStatic(res, htmlCandidate);
      }

      // Default fallback for SPA-like navigation: dashboard.html
      if (!path.extname(pathname)) {
        return serveStatic(res, path.join(ROOT_DIR, "dashboard.html"));
      }

      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("404 Not Found");
    });
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  NOVA AI Full-Stack Server Running                 `);
  console.log(`  Local URL:   http://localhost:${PORT}/             `);
  console.log(`  Dashboard:   http://localhost:${PORT}/dashboard    `);
  console.log(`  Login:       http://localhost:${PORT}/login        `);
  console.log(`  API Base:    http://localhost:${PORT}/api/*        `);
  console.log(`====================================================`);
});

module.exports = server;
