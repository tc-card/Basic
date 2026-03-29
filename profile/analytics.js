// --- Simple, robust analytics collector for profile actions with per-device, per-action timestamp checks ---
console.log("[analytics.js] loaded");
const ANALYTICS_ENDPOINT = "https://script.google.com/macros/s/AKfycbwEd1f6mtN40Nvoa7M_g_8kB_UeiKl8QkuoUzGsikef7WSpEfBELUGKLeq5ywg6TRal/exec";

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
  // Use a single delegated listener for all dynamic content.
  // main.js renders buttons with inline onclick (no IDs), so we match by class:
  //   .top-right     → share button wrapper
  //   .contact-btn   → contact button
  //   .social-links a → social link anchors (NOT .social-link — that class doesn't exist)
  document.body.addEventListener("click", function(e) {

    // Share: rendered as div.top-right containing the share icon
    if (e.target.closest(".top-right")) {
      if (shouldCountAction('share', 1000)) {
        analyticsState.shareCount++;
        saveAnalyticsState();
        sendAnalytics('share');
      }
    }

    // Contact: rendered as button.contact-btn
    if (e.target.closest(".contact-btn")) {
      if (shouldCountAction('contact', 1000)) {
        analyticsState.contactCount++;
        saveAnalyticsState();
        sendAnalytics('contact');
      }
    }

    // Social links: <a> tags inside div.social-links
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

  // Copy action exposed globally so copyContactDetails in main.js can call it
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
  // Apps Script does not send CORS headers on POST responses, so the browser
  // blocks any POST with Content-Type: application/json (triggers a preflight
  // that Apps Script cannot respond to). Using mode:'no-cors' with the simple
  // Content-Type 'text/plain' skips the preflight while still delivering the
  // full JSON body to e.postData.contents in doPost().
  fetch(ANALYTICS_ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
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
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(item)
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