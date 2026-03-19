// Service worker for AI Sales OS Chrome Extension
// Handles extension install event and token storage helpers

chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Sales OS Extension installed!");
  
  // Set default state
  chrome.storage.local.set({
    isLoggedIn: false,
    token: "",
    userEmail: "",
  });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // Save token after login
  if (request.action === "saveToken") {
    chrome.storage.local.set({
      isLoggedIn: true,
      token: request.token,
      userEmail: request.email,
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Get stored token
  if (request.action === "getToken") {
    chrome.storage.local.get(["token", "isLoggedIn", "userEmail"], (result) => {
      sendResponse({
        token: result.token || "",
        isLoggedIn: result.isLoggedIn || false,
        userEmail: result.userEmail || "",
      });
    });
    return true;
  }

  // Logout — clear storage
  if (request.action === "logout") {
    chrome.storage.local.set({
      isLoggedIn: false,
      token: "",
      userEmail: "",
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});