const API_BASE = "https://ai-sales-os-backend.onrender.com";

// ── Helpers ──────────────────────────────────────────────
function showView(viewId) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");
}

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.classList.add("show");
}

function hideError(elementId) {
  document.getElementById(elementId).classList.remove("show");
}

function setLoading(btnId, textId, loading, defaultText) {
  const btn = document.getElementById(btnId);
  const text = document.getElementById(textId);
  btn.disabled = loading;
  text.textContent = loading ? "Please wait..." : defaultText;
}

// ── Get stored token ──────────────────────────────────────
function getStoredAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["token", "isLoggedIn", "userEmail"], (result) => {
      resolve({
        token: result.token || "",
        isLoggedIn: result.isLoggedIn || false,
        userEmail: result.userEmail || "",
      });
    });
  });
}

// ── Check if current tab is LinkedIn profile ──────────────
function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

// ── Fetch user credits from API ───────────────────────────
async function fetchUserCredits(token) {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return data.ai_credits ?? "--";
    }
  } catch (e) {}
  return "--";
}

// ── Login ─────────────────────────────────────────────────
async function handleLogin() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!email || !password) {
    showError("login-error", "Please enter your email and password.");
    return;
  }

  hideError("login-error");
  setLoading("login-btn", "login-btn", true, "Login →");

  try {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      showError("login-error", data.detail || "Invalid credentials.");
      setLoading("login-btn", "login-btn", false, "Login →");
      return;
    }

    // Save token to chrome storage
    await chrome.storage.local.set({
      isLoggedIn: true,
      token: data.access_token,
      userEmail: email,
    });

    // Re-initialize app after login
    initApp();

  } catch (err) {
    showError("login-error", "Cannot connect to server. Try again.");
    setLoading("login-btn", "login-btn", false, "Login →");
  }
}

// ── Scrape LinkedIn profile via content script ────────────
async function scrapeProfile(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: "scrapeProfile" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        resolve(null);
      } else {
        resolve(response.data);
      }
    });
  });
}

// ── Save lead to API ──────────────────────────────────────
async function saveLead(token, leadData) {
  const res = await fetch(`${API_BASE}/leads/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(leadData),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to save lead.");
  }

  return await res.json();
}

// ── Handle Save Lead button ───────────────────────────────
async function handleSaveLead(token) {
  const name = document.getElementById("field-name").value.trim();
  const company = document.getElementById("field-company").value.trim();
  const phone = document.getElementById("field-phone").value.trim();
  const status = document.getElementById("field-status").value;
  const notes = document.getElementById("field-notes").value.trim();

  if (!name) {
    showError("capture-error", "Name is required.");
    return;
  }

  hideError("capture-error");
  setLoading("save-btn", "save-btn-text", true, "⚡ Save to Pipeline");

  try {
    const email = document.getElementById("field-email").value.trim();

    const leadData = {
      name,
      company: company || null,
      phone: phone || null,
      email: email || null,
      status,
      notes: notes || null,
    };

    const saved = await saveLead(token, leadData);

    // Show success view
    document.getElementById("success-name").textContent =
      `${saved.name} added to pipeline!`;
    showView("view-success");

  } catch (err) {
    showError("capture-error", err.message || "Failed to save. Try again.");
    setLoading("save-btn", "save-btn-text", false, "⚡ Save to Pipeline");
  }
}

// ── Main Init ─────────────────────────────────────────────
async function initApp() {
  const { token, isLoggedIn, userEmail } = await getStoredAuth();

  // Not logged in → show login view
  if (!isLoggedIn || !token) {
    document.getElementById("header").style.display = "none";
    showView("view-login");
    return;
  }

  // Show header
  document.getElementById("header").style.display = "flex";
  document.getElementById("header-email").textContent = userEmail;

  // Load credits
  const credits = await fetchUserCredits(token);
  const creditsEl = document.getElementById("credits-count");
  if (creditsEl) creditsEl.textContent = credits;

  // Check current tab
  const tab = await getCurrentTab();
  const isLinkedIn = tab?.url?.includes("linkedin.com/in/");

  if (!isLinkedIn) {
    showView("view-not-linkedin");
    return;
  }

  // On LinkedIn profile — show capture view
  showView("view-capture");

  // Try to scrape profile
  const profile = await scrapeProfile(tab.id);

  if (profile) {
    // Fill preview card
    document.getElementById("preview-name").textContent =
      profile.name || "Unknown Name";
    document.getElementById("preview-title").textContent =
      profile.title || "";
    document.getElementById("preview-company").textContent =
      profile.company || "";
    document.getElementById("preview-location").textContent =
      profile.location || "";

// Pre-fill editable fields
    document.getElementById("field-name").value = profile.name || "";
    document.getElementById("field-company").value = profile.company || "";
    document.getElementById("field-email").value = profile.email || "";
    document.getElementById("field-phone").value = profile.phone || "";

    // Auto-fill notes with title + profile URL
    const autoNotes = [
      profile.title ? `Title: ${profile.title}` : "",
      profile.location ? `Location: ${profile.location}` : "",
      `LinkedIn: ${profile.profileUrl}`,
    ]
      .filter(Boolean)
      .join(" | ");

    document.getElementById("field-notes").value = autoNotes;
  } else {
    // Scraping failed — show empty form with message
    document.getElementById("preview-name").textContent = "Fill details manually";
    document.getElementById("preview-title").textContent =
      "Could not auto-detect profile";
    document.getElementById("preview-company").textContent = "";
    document.getElementById("preview-location").textContent = "";
  }

  // Save button
  document.getElementById("save-btn").addEventListener("click", () => {
    handleSaveLead(token);
  });
}

// ── Event Listeners ───────────────────────────────────────

// Login button
document.getElementById("login-btn").addEventListener("click", handleLogin);

// Login on Enter key
document.getElementById("login-password").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleLogin();
});

// Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
  await chrome.storage.local.set({
    isLoggedIn: false,
    token: "",
    userEmail: "",
  });
  document.getElementById("header").style.display = "none";
  showView("view-login");
});

// Capture another lead
document.getElementById("capture-another-btn").addEventListener("click", () => {
  initApp();
});

// Open pipeline in new tab
document.getElementById("open-pipeline-btn").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://ai-sales-os-plum.vercel.app/leads" });
});

// ── Start ─────────────────────────────────────────────────
initApp();