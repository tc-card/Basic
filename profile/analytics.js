// --- Analytics collector — uses GET requests to avoid CORS issues with Apps Script ---
console.log("[analytics.js] loaded");
const ANALYTICS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxirocJmI2t2k6Y4-zh7WLF8pcI2FPDCJafyqsRKF8lc2sjL7v0--JTFA7vJrfjDytz/exec";

let analyticsProfile = { link: null };
let analyticsState = {
  totalVisits: 0,
  shareCount: 0,
  contactCount: 0,
  copyCount: 0,
  socialCounts: {},
  lastVisit: 0,
  lastActionTimestamps: {}
};

function analyticsTracking(link, _email, status) {
  console.log("[analyticsTracking] called", { link, status });
  if (status !== "active") return;
  analyticsProfile = { link };
  loadAnalyticsState();
  recordVisit();
  attachAnalyticsListeners();
  flushAnalyticsQueue();
}

function loadAnalyticsState() {
  const saved = localStorage.getItem(`analyticsState_${analyticsProfile.link}`);
  if (saved) {
    try { analyticsState = JSON.parse(saved); } catch {}
  }
}

function saveAnalyticsState() {
  localStorage.setItem(`analyticsState_${analyticsProfile.link}`, JSON.stringify(analyticsState));
}

function shouldCountAction(actionType, minIntervalMs = 0) {
  const now = Date.now();
  const last = analyticsState.lastActionTimestamps[actionType] || 0;
  if (now - last >= minIntervalMs) {
    analyticsState.lastActionTimestamps[actionType] = now;
    saveAnalyticsState();
    return true;
  }
  return false;
}

function recordVisit() {
  if (shouldCountAction('visit', 30 * 60 * 1000)) {
    analyticsState.totalVisits++;
    saveAnalyticsState();
    sendAnalytics('visit');
  }
}

function attachAnalyticsListeners() {
  document.body.addEventListener("click", function(e) {
    // Share button
    if (e.target.closest(".top-right")) {
      if (shouldCountAction('share', 1000)) {
        analyticsState.shareCount++;
        saveAnalyticsState();
        sendAnalytics('share');
      }
    }
    // Contact button
    if (e.target.closest(".contact-btn")) {
      if (shouldCountAction('contact', 1000)) {
        analyticsState.contactCount++;
        saveAnalyticsState();
        sendAnalytics('contact');
      }
    }
    // Social links
    const socialLink = e.target.closest(".social-links a");
    if (socialLink) {
      const href = socialLink.href || 'unknown';
      let id = href;
      try { id = new URL(href).hostname; } catch(_) {}
      if (!analyticsState.socialCounts[id]) analyticsState.socialCounts[id] = 0;
      if (shouldCountAction('social_' + id, 1000)) {
        analyticsState.socialCounts[id]++;
        saveAnalyticsState();
        sendAnalytics('social', { id, href });
      }
    }
  });

  window.trackCopyAction = (success) => {
    if (success && shouldCountAction('copy', 1000)) {
      analyticsState.copyCount++;
      saveAnalyticsState();
      sendAnalytics('copy');
    }
  };
}

// Sends analytics via GET — works with Apps Script CORS natively, same as profile lookups.
// Payload is JSON-encoded and passed as a single `data` param to keep the URL clean.
function buildUrl(action, detail) {
  const payload = {
    action,
    link: analyticsProfile.link,
    detail: detail || null,
    totalVisits: analyticsState.totalVisits,
    shareCount: analyticsState.shareCount,
    contactCount: analyticsState.contactCount,
    copyCount: analyticsState.copyCount,
    socialCounts: analyticsState.socialCounts,
    timestamp: Date.now()
  };
  return `${ANALYTICS_ENDPOINT}?data=${encodeURIComponent(JSON.stringify(payload))}`;
}

function sendAnalytics(action, detail = null) {
  const url = buildUrl(action, detail);
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(json => {
      if (json.error) console.warn('[analytics] server error:', json.error);
    })
    .catch(() => {
      // Queue for retry on next page load
      queueAnalytics({ action, detail });
    });
}

function queueAnalytics(item) {
  const queue = JSON.parse(localStorage.getItem("analyticsRetryQueue") || "[]");
  queue.push(item);
  localStorage.setItem("analyticsRetryQueue", JSON.stringify(queue));
}

function flushAnalyticsQueue() {
  const queue = JSON.parse(localStorage.getItem("analyticsRetryQueue") || "[]");
  if (!queue.length) return;
  localStorage.removeItem("analyticsRetryQueue");
  queue.forEach(item => sendAnalytics(item.action, item.detail));
}

export { analyticsTracking };