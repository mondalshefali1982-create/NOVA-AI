const NOVA_BACKEND_BASE_URL = (window.NOVA_BACKEND_BASE_URL || "").replace(/\/$/, "");
const NOVA_AUTH_TOKEN_KEY = "novaAuthToken";
const NOVA_AUTH_ROUTES = {
  login: "/api/auth/login",
  signup: "/api/auth/signup",
  me: "/api/auth/me"
};

const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const loginForm = document.getElementById("loginForm");
const nameField = document.getElementById("nameField");
const authName = document.getElementById("authName");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmit = document.getElementById("authSubmit");
const authMessage = document.getElementById("authMessage");

let authMode = "login";

checkExistingSession();

loginTab?.addEventListener("click", () => setAuthMode("login"));
signupTab?.addEventListener("click", () => setAuthMode("signup"));

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = authName?.value.trim();
  const email = authEmail?.value.trim();
  const password = authPassword?.value;

  if (!email || !password || (authMode === "signup" && !name)) {
    setAuthMessage(authMode === "signup" ? "Name, email, and password are required." : "Email and password are required.");
    return;
  }

  setBusy(true);
  setAuthMessage(authMode === "signup" ? "Creating your NOVA AI account..." : "Logging in...");

  try {
    const route = authMode === "signup" ? NOVA_AUTH_ROUTES.signup : NOVA_AUTH_ROUTES.login;
    const body = authMode === "signup" ? { name, email, password } : { email, password };
    const data = await callAuth(route, {
      method: "POST",
      body: JSON.stringify(body)
    });

    if (!data?.token) throw new Error("The backend did not return a JWT token.");

    localStorage.setItem(NOVA_AUTH_TOKEN_KEY, data.token);
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
  if (authSubmit) authSubmit.textContent = isSignup ? "Create Account" : "Login";
  setAuthMessage(isSignup ? "Create your NOVA AI account to continue." : "Use your NOVA AI account to continue.");
}

async function checkExistingSession() {
  const token = localStorage.getItem(NOVA_AUTH_TOKEN_KEY);
  if (!token) return;

  setBusy(true);
  setAuthMessage("Checking your NOVA AI session...");

  try {
    await callAuth(NOVA_AUTH_ROUTES.me, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
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
  loginTab?.toggleAttribute("disabled", isBusy);
  signupTab?.toggleAttribute("disabled", isBusy);
}

function setAuthMessage(message) {
  if (authMessage) authMessage.textContent = message;
}
