// Lightweight In-Memory Sliding-Window Rate Limiter & Bot Protection
const ipWindows = new Map();

// Periodic cleanup of stale IP windows every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipWindows.entries()) {
    if (now - record.startTime > 120000) {
      ipWindows.delete(key);
    }
  }
}, 300000).unref();

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "127.0.0.1";
}

/**
 * Check if a request exceeds the allowed rate limit
 * @param {object} req - HTTP request
 * @param {string} scope - 'auth' | 'ai' | 'sync'
 * @param {number} maxRequests - allowed hits in window
 * @param {number} windowMs - window size in milliseconds
 * @returns {boolean} true if allowed, false if rate limited
 */
function checkRateLimit(req, scope = "general", maxRequests = 60, windowMs = 60000) {
  const ip = getClientIp(req);
  const key = `${scope}:${ip}`;
  const now = Date.now();

  const record = ipWindows.get(key) || { count: 0, startTime: now };

  if (now - record.startTime > windowMs) {
    record.count = 1;
    record.startTime = now;
    ipWindows.set(key, record);
    return true;
  }

  record.count += 1;
  ipWindows.set(key, record);

  return record.count <= maxRequests;
}

/**
 * Detect spam bot submissions via honeypot traps
 * @param {object} body - JSON request body
 * @returns {boolean} true if honeypot was triggered (bot detected)
 */
function isHoneypotTriggered(body = {}) {
  if (!body || typeof body !== "object") return false;
  // Common honeypot field names that humans don't fill out
  const honeypots = ["honeypot", "website_trap", "_gotcha", "company_hp"];
  for (const field of honeypots) {
    if (body[field] && String(body[field]).trim().length > 0) {
      return true;
    }
  }
  return false;
}

module.exports = {
  getClientIp,
  checkRateLimit,
  isHoneypotTriggered
};
