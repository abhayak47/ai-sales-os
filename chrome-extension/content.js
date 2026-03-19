// ── Utility: wait for an element to appear in DOM ──
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

// ── Scrape contact info from modal ──
async function scrapeContactInfo() {
  const result = { email: "", phone: "" };

  try {
    const contactLink =
      document.querySelector("a[href*='contact-info']") ||
      document.querySelector(".pv-contact-info") ||
      Array.from(document.querySelectorAll("a")).find((a) =>
        a.innerText?.toLowerCase().includes("contact info")
      );

    if (!contactLink) return result;

    contactLink.click();

    const modal = await waitForElement(
      ".artdeco-modal__content",
      4000
    );

    if (!modal) return result;

    await new Promise((r) => setTimeout(r, 800));

    // ── Email ──
    const emailSelectors = [
      "section.ci-email a",
      ".ci-email .pv-contact-info__contact-link",
      "a[href^='mailto:']",
      ".artdeco-modal__content a[href^='mailto:']",
    ];
    for (const sel of emailSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        result.email =
          el.href?.replace("mailto:", "").trim() ||
          el.innerText.trim();
        break;
      }
    }

    // ── Phone ──
    const phoneSelectors = [
      "section.ci-phone .pv-contact-info__contact-link",
      ".ci-phone span.t-14",
      ".pv-contact-info__contact-type .ci-phone span",
      ".artdeco-modal__content .ci-phone span",
    ];
    for (const sel of phoneSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        result.phone = el.innerText.trim();
        break;
      }
    }

    // ── Fallback regex scan on modal text ──
    if (!result.email || !result.phone) {
      const modalContent = document.querySelector(".artdeco-modal__content");
      if (modalContent) {
        const allText = modalContent.innerText || "";
        const allLinks = modalContent.querySelectorAll("a");

        if (!result.email) {
          for (const link of allLinks) {
            if (link.href?.startsWith("mailto:")) {
              result.email = link.href.replace("mailto:", "").trim();
              break;
            }
          }
          if (!result.email) {
            const emailMatch = allText.match(
              /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/
            );
            if (emailMatch) result.email = emailMatch[0];
          }
        }

        if (!result.phone) {
          const phoneMatch = allText.match(/(\+?\d[\d\s\-().]{7,}\d)/);
          if (phoneMatch) result.phone = phoneMatch[0].trim();
        }
      }
    }

    // ── Close modal ──
    const closeBtn =
      document.querySelector(".artdeco-modal__dismiss") ||
      document.querySelector("button[aria-label='Dismiss']");
    if (closeBtn) closeBtn.click();

  } catch (err) {
    console.log("Contact info scrape error:", err);
  }

  return result;
}

// ── Get current company (most reliable method) ──
function getCurrentCompany() {
  // Strategy 1: Top card — the button/link showing current company
  // LinkedIn shows current company as a clickable button in the top card
  const topCardCompanySelectors = [
    // New LinkedIn UI — company button in top card
    ".pv-text-details__right-panel .hoverable-link-text",
    ".pv-text-details__right-panel button .visually-hidden",
    ".pv-text-details__right-panel a .visually-hidden",
    // Current company pill/badge
    ".top-card-layout__entity-info .top-card__subline-item",
    ".pv-top-card--experience-list-item span",
  ];

  for (const sel of topCardCompanySelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const text = el.innerText.trim().split("\n")[0];
      if (text && text.length > 1) return text;
    }
  }

  // Strategy 2: Experience section — first (most recent) company
  // LinkedIn renders experience as a list, first item = current job
  const expSelectors = [
    // New UI: pvs-list experience items
    ".pvs-list .pvs-entity .pvs-entity__path-node span[aria-hidden='true']",
    // Company name in experience section first entry
    "#experience ~ .pvs-list .pvs-entity span[aria-hidden='true']",
    // Older UI
    "#experience-section .pv-entity__secondary-title",
    ".experience-section .pv-entity__secondary-title",
    ".pv-experience-section .pv-entity__secondary-title",
  ];

  for (const sel of expSelectors) {
    const elements = document.querySelectorAll(sel);
    for (const el of elements) {
      const text = el.innerText.trim().split("\n")[0];
      // Skip if it looks like a date range or location
      if (
        text &&
        text.length > 1 &&
        text.length < 80 &&
        !text.match(/^\d{4}/) &&
        !text.includes("Present") &&
        !text.includes("yr") &&
        !text.includes("mo") &&
        !text.includes(",") // locations have commas
      ) {
        return text;
      }
    }
  }

  // Strategy 3: Parse from job title text "Role at Company"
  // Only as last resort
  const titleEl = document.querySelector(".text-body-medium");
  if (titleEl) {
    const titleText = titleEl.innerText.trim();
    if (titleText.toLowerCase().includes(" at ")) {
      const parts = titleText.split(/ at /i);
      return parts[parts.length - 1].trim().split("\n")[0];
    }
  }

  return "";
}

// ── Main profile scraper ──
async function scrapeLinkedInProfile() {
  const data = {
    name: "",
    title: "",
    company: "",
    location: "",
    email: "",
    phone: "",
    profileUrl: window.location.href,
  };

  // ── Name ──
  const nameEl =
    document.querySelector("h1") ||
    document.querySelector(".text-heading-xlarge") ||
    document.querySelector(".pv-text-details__left-panel h1");
  if (nameEl) {
    data.name = nameEl.innerText.trim().split("\n")[0];
  }

  // ── Title (job title only — no company mixed in) ──
  const titleCandidates = document.querySelectorAll(".text-body-medium");
  for (const el of titleCandidates) {
    const text = el.innerText.trim().split("\n")[0];
    if (
      text &&
      text.length > 3 &&
      text.length < 120 &&
      !text.includes("·") &&
      text !== data.name
    ) {
      // Clean out "at CompanyName" from title if present
      if (text.toLowerCase().includes(" at ")) {
        data.title = text.split(/ at /i)[0].trim();
      } else {
        data.title = text;
      }
      break;
    }
  }

  // ── Company (dedicated function) ──
  data.company = getCurrentCompany();

  // ── Location ──
  const allSpans = document.querySelectorAll(
    ".pv-text-details__left-panel span, .text-body-small span, .text-body-small"
  );
  for (const el of allSpans) {
    const text = el.innerText.trim();
    if (
      text &&
      text.includes(",") &&
      text.length < 60 &&
      !text.includes("·") &&
      !text.includes("@") &&
      text !== data.name &&
      text !== data.title &&
      text !== data.company
    ) {
      data.location = text.split("\n")[0];
      break;
    }
  }

  // ── Contact Info ──
  const contactInfo = await scrapeContactInfo();
  data.email = contactInfo.email || "";
  data.phone = contactInfo.phone || "";

  // ── Cleanup ──
  data.name = data.name.replace(/[✓✔☑·]/g, "").trim();
  data.company = data.company.replace(/[✓✔☑·]/g, "").trim();

  return data;
}

// ── Listen for message from popup.js ──
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapeProfile") {
    scrapeLinkedInProfile().then((profileData) => {
      sendResponse({ success: true, data: profileData });
    });
  }
  return true;
});
