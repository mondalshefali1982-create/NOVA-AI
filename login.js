const NOVA_BACKEND_BASE_URL = (window.NOVA_BACKEND_BASE_URL || "").replace(/\/$/, "");
const NOVA_AUTH_TOKEN_KEY = "novaAuthToken";
const NOVA_AUTH_ROUTES = {
  login: "/api/auth",
  signup: "/api/auth",
  me: "/api/auth"
};

// Supabase Configuration for Direct Google OAuth
const SUPABASE_PROJECT_URL = "https://zoatfgioaygwpoebuubt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KjPPyn8A9rq-n8WShDRXig_mcnZ-P4t";

let supabaseClient = null;
try {
  if (window.supabase && typeof window.supabase.createClient === "function") {
    supabaseClient = window.supabase.createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY);
  }
} catch (err) {
  console.warn("[OAuth] Could not initialize Supabase client:", err);
}

const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const googleAuthBtn = document.getElementById("googleAuthBtn");
const loginForm = document.getElementById("loginForm");
const nameField = document.getElementById("nameField");
const authName = document.getElementById("authName");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmit = document.getElementById("authSubmit");
const authMessage = document.getElementById("authMessage");

let authMode = "login";
let isOauthProcessing = false;

// Initialize Session or OAuth Return Handler
init();

// Listen for Supabase OAuth redirect events
if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user && !isOauthProcessing && !localStorage.getItem(NOVA_AUTH_TOKEN_KEY)) {
      await handleOAuthUser(session.user);
    }
  });
}

loginTab?.addEventListener("click", () => setAuthMode("login"));
signupTab?.addEventListener("click", () => setAuthMode("signup"));

// Google OAuth Sign In Trigger
googleAuthBtn?.addEventListener("click", async () => {
  setBusy(true);
  setAuthMessage("Redirecting to Google sign-in...");

  try {
    if (!supabaseClient) {
      throw new Error("Google authentication service is initializing. Please refresh and try again.");
    }

    const redirectUrl = window.location.origin + "/login.html";
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) throw error;
  } catch (err) {
    console.error("[OAuth] Sign-in error:", err);
    setAuthMessage(err.message || "Could not connect to Google sign-in.");
    setBusy(false);
  }
});

// Standard Email/Password Form Submission
loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Anti-bot honeypot protection
  const trap = document.getElementById("websiteTrap");
  if (trap && trap.value.trim().length > 0) {
    setAuthMessage("Invalid submission.");
    return;
  }

  const name = authName?.value.trim();
  const email = authEmail?.value.trim();
  const password = authPassword?.value;

  // Form Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    setAuthMessage("Please enter a valid email address (e.g. you@example.com).");
    authEmail?.focus();
    return;
  }

  if (!password || password.length < 6) {
    setAuthMessage("Password must be at least 6 characters long.");
    authPassword?.focus();
    return;
  }

  if (authMode === "signup" && (!name || name.length < 2)) {
    setAuthMessage("Please enter your name (at least 2 characters).");
    authName?.focus();
    return;
  }

  setBusy(true);
  setAuthMessage(authMode === "signup" ? "Creating your NOVA AI account..." : "Logging in...");

  try {
    const route = authMode === "signup" ? NOVA_AUTH_ROUTES.signup : NOVA_AUTH_ROUTES.login;
    const body = authMode === "signup" 
      ? { action: "signup", name, email, password } 
      : { action: "login", email, password };
    const data = await callAuth(route, {
      method: "POST",
      body: JSON.stringify(body)
    });

    if (!data?.token) throw new Error("The backend did not return a JWT token.");

    localStorage.setItem(NOVA_AUTH_TOKEN_KEY, data.token);
    if (data.user) {
      localStorage.setItem("novaUser", JSON.stringify(data.user));
    }
    window.location.replace("dashboard.html");
  } catch (error) {
    setAuthMessage(error.message || "Authentication failed. Please try again.");
  } finally {
    setBusy(false);
  }
});

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = authMode === "signup";

  loginTab?.classList.toggle("active", !isSignup);
  signupTab?.classList.toggle("active", isSignup);
  loginTab?.setAttribute("aria-selected", String(!isSignup));
  signupTab?.setAttribute("aria-selected", String(isSignup));

  if (nameField) nameField.hidden = !isSignup;
  if (authName) authName.required = isSignup;
  if (authPassword) authPassword.autocomplete = isSignup ? "new-password" : "current-password";
  if (authSubmit) authSubmit.textContent = isSignup ? "Create Account" : "Sign In";
  setAuthMessage(isSignup ? "Create your NOVA AI account to continue." : "Use your NOVA AI account to continue.");
}

async function init() {
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  const hasOAuthTokens = hash.includes("access_token") || 
                         search.includes("code=") || 
                         hash.includes("error=") || 
                         search.includes("error=");

  if (hasOAuthTokens) {
    const handled = await checkOAuthSession();
    if (!handled) {
      setBusy(false);
    }
  } else {
    await checkExistingSession();
  }
}

async function checkOAuthSession() {
  if (!supabaseClient) return false;

  try {
    const hash = window.location.hash || "";
    const search = window.location.search || "";

    if (hash.includes("error=") || search.includes("error=")) {
      const params = new URLSearchParams(hash.replace(/^#/, "") || search.replace(/^\?/, ""));
      const desc = params.get("error_description") || "Google sign-in was cancelled or encountered an error.";
      setAuthMessage(decodeURIComponent(desc.replace(/\+/g, " ")));
      return false;
    }

    const hasTokens = hash.includes("access_token") || search.includes("code=");
    if (!hasTokens) return false;

    setBusy(true);
    setAuthMessage("Verifying Google sign-in with NOVA AI...");

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.warn("[OAuth] getSession error:", error.message);
      setAuthMessage(error.message || "Google authentication verification failed.");
      setBusy(false);
      return false;
    }

    if (data?.session?.user) {
      await handleOAuthUser(data.session.user);
      return true;
    }
  } catch (err) {
    console.error("[OAuth] checkOAuthSession exception:", err);
    setAuthMessage("Failed to process Google sign-in.");
    setBusy(false);
  }
  return false;
}

async function handleOAuthUser(sbUser) {
  if (!sbUser || isOauthProcessing) return;
  isOauthProcessing = true;
  setBusy(true);
  setAuthMessage("Setting up your NOVA AI account...");

  try {
    const email = sbUser.email;
    const name = sbUser.user_metadata?.full_name || 
                 sbUser.user_metadata?.name || 
                 email?.split("@")[0] || 
                 "Google User";
    const avatar = sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || "";

    const res = await callAuth(NOVA_AUTH_ROUTES.login, {
      method: "POST",
      body: JSON.stringify({
        action: "oauth_sync",
        email,
        name,
        userId: sbUser.id,
        avatar
      })
    });

    if (!res?.token) {
      throw new Error("Server did not return a session token.");
    }

    localStorage.setItem(NOVA_AUTH_TOKEN_KEY, res.token);
    if (res.user) {
      localStorage.setItem("novaUser", JSON.stringify(res.user));
    }

    // Clean up URL hash / search params for a crisp URL
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    setAuthMessage("Welcome! Redirecting to NOVA AI dashboard...");
    window.location.replace("dashboard.html");
    return true;
  } catch (err) {
    console.error("[OAuth] Sync failed:", err);
    setAuthMessage(err.message || "Failed to sync Google account.");
    setBusy(false);
    isOauthProcessing = false;
    return false;
  }
}

async function checkExistingSession() {
  const token = localStorage.getItem(NOVA_AUTH_TOKEN_KEY);
  if (!token) return;

  setBusy(true);
  setAuthMessage("Checking your NOVA AI session...");

  try {
    await callAuth(NOVA_AUTH_ROUTES.me, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "me" })
    });
    window.location.replace("dashboard.html");
  } catch {
    localStorage.removeItem(NOVA_AUTH_TOKEN_KEY);
    setAuthMessage("Session expired. Please log in again.");
  } finally {
    setBusy(false);
  }
}

async function callAuth(route, options = {}) {
  const response = await fetch(`${NOVA_BACKEND_BASE_URL}${route}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
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

function setBusy(isBusy) {
  if (authSubmit) authSubmit.disabled = isBusy;
  if (googleAuthBtn) googleAuthBtn.disabled = isBusy;
  loginTab?.toggleAttribute("disabled", isBusy);
  signupTab?.toggleAttribute("disabled", isBusy);
}

function setAuthMessage(message) {
  if (authMessage) authMessage.textContent = message;
}
