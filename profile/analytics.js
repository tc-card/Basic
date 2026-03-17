

// --- Simple, robust analytics collector for profile actions with per-device, per-action timestamp checks ---
console.log("[analytics.js] loaded");
const ANALYTICS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxHiXAxMhl_1isznsWTUBTzLQ4p2KeOe5nEf_Kpt-uonubq4Nz31et9cAqLDPv0hN8-/exec";

let analyticsProfile = { link: null };
let analyticsState = {
  totalVisits: 0,
  shareCount: 0,
  contactCount: 0,
  copyCount: 0,
  socialCounts: {},
  lastVisit: 0,
  lastActionTimestamps: {} // { actionType: timestamp }
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
  // Only count a visit if 30min have passed since last for this profile on this device
  if (shouldCountAction('visit', 30 * 60 * 1000)) {
    analyticsState.totalVisits++;
    saveAnalyticsState();
    sendAnalytics('visit');
  }
}

function attachAnalyticsListeners() {
  // Share button
  const shareBtn = document.getElementById("share-button");
  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      if (shouldCountAction('share', 1000)) { // 1s debounce
        analyticsState.shareCount++;
        saveAnalyticsState();
        sendAnalytics('share');
      }
    });
  }
  // Contact button
  const contactBtn = document.getElementById("contact-button");
  if (contactBtn) {
    contactBtn.addEventListener("click", () => {
      if (shouldCountAction('contact', 1000)) {
        analyticsState.contactCount++;
        saveAnalyticsState();
        sendAnalytics('contact');
      }
    });
  }
  // Social links (event delegation for dynamic content)
  document.body.addEventListener("click", function(e) {
    const link = e.target.closest(".social-link");
    if (link) {
      const id = link.id || link.getAttribute("data-id") || link.href || 'unknown';
      const href = link.href || '';
      if (!analyticsState.socialCounts[id]) analyticsState.socialCounts[id] = 0;
      if (shouldCountAction('social_' + id, 1000)) {
        analyticsState.socialCounts[id]++;
        saveAnalyticsState();
        sendAnalytics('social', { id, href });
      }
    }
  });
  // Copy action (global function)
  window.trackCopyAction = (success) => {
    if (success && shouldCountAction('copy', 1000)) {
      analyticsState.copyCount++;
      saveAnalyticsState();
      sendAnalytics('copy');
    }
  };
}

function sendAnalytics(action, detail = null) {
  const payload = {
    action,
    detail,
    timestamp: Date.now(),
    fullState: {
      ...analyticsState,
      link: analyticsProfile.link
    }
  };
  fetch(ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(res => {
    if (!res.ok) throw new Error('Network error');
  }).catch(() => {
    queueAnalytics(payload);
  });
}

function queueAnalytics(payload) {
  const queue = JSON.parse(localStorage.getItem("analyticsRetryQueue") || "[]");
  queue.push(payload);
  localStorage.setItem("analyticsRetryQueue", JSON.stringify(queue));
}

function flushAnalyticsQueue() {
  const queue = JSON.parse(localStorage.getItem("analyticsRetryQueue") || "[]");
  if (!queue.length) return;
  const newQueue = [];
  queue.forEach(item => {
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    }).then(res => {
      if (!res.ok) newQueue.push(item);
    }).catch(() => {
      newQueue.push(item);
    });
  });
  setTimeout(() => {
    localStorage.setItem("analyticsRetryQueue", JSON.stringify(newQueue));
  }, 2000);
}

// Export for use in main.js
export { analyticsTracking };