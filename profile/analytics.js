const CONFIG = {
  googleAnalyticsUrl: "https://script.google.com/macros/s/AKfycbw8tkRI9dHsspu07YS6agXF4wrT1X8tyt9_4D_TnbffQliyLdp1a71fPu197gw3tiWe/exec",
};

const AnalyticsManager = {
  // Initialize tracking state
  init: function(link, email) {
    this.link = link;
    this.email = email;
    this.state = {
      totalVisits: 0,
      shareCount: 0,
      contactCount: 0,
      copyCount: 0,
      socialCounts: {},
      lastUpdated: 0
    };
    
    // Load any existing state from localStorage
    this.loadState();
    
    // Initialize event listeners
    this.setupTracking();
    
    // Track initial visit
    this.trackVisit();
  },
  
  // Load saved state from localStorage
  loadState: function() {
    const savedState = localStorage.getItem(`analyticsState_${this.link}`);
    if (savedState) {
      this.state = JSON.parse(savedState);
    }
  },
  
  // Save current state to localStorage
  saveState: function() {
    localStorage.setItem(`analyticsState_${this.link}`, JSON.stringify(this.state));
  },
  
  // Setup all event listeners
  setupTracking: function() {
    // Share button
    const shareButton = document.getElementById("share-button");
    if (shareButton) {
      shareButton.addEventListener("click", () => {
        this.state.shareCount++;
        this.saveState();
        this.submitUpdate('share');
      });
    }
    
    // Contact button
    const contactButton = document.getElementById("contact-button");
    if (contactButton) {
      contactButton.addEventListener("click", () => {
        this.state.contactCount++;
        this.saveState();
        this.submitUpdate('contact');
      });
    }
    
    // Social links
    const socialLinks = document.querySelectorAll(".social-link a");
    socialLinks.forEach(link => {
      if (!link.id) {
        link.id = `social-link-${[...socialLinks].indexOf(link) + 1}`;
      }
      if (!this.state.socialCounts[link.id]) {
        this.state.socialCounts[link.id] = 0;
      }
      link.addEventListener("click", () => {
        this.state.socialCounts[link.id]++;
        this.saveState();
        this.submitUpdate('social', link.id);
      });
    });
    
    // Monitor for copy actions (will be called from copyContactDetails)
    window.trackCopyAction = (success) => {
      if (success) {
        this.state.copyCount++;
        this.saveState();
        this.submitUpdate('copy');
      }
    };
  },
  
  // Track profile visit
  trackVisit: function() {
    const visitedProfiles = JSON.parse(localStorage.getItem("visitedProfiles")) || [];
    if (!visitedProfiles.includes(this.link)) {
      visitedProfiles.push(this.link);
      localStorage.setItem("visitedProfiles", JSON.stringify(visitedProfiles));
      this.state.totalVisits = 1;
      this.saveState();
      this.submitUpdate('visit');
    }
  },
  
  // Submit updates to server
  submitUpdate: async function(actionType, actionDetail = null) {
    // Prepare update data
    const updateData = {
      action: actionType,
      detail: actionDetail,
      timestamp: Date.now(),
      fullState: this.state
    };
    
    // Use Beacon API if available for reliability
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(updateData)], {type: 'application/json'});
      navigator.sendBeacon(`${CONFIG.googleAnalyticsUrl}/update`, blob);
    } else {
      // Fallback to fetch with low priority
      try {
        await fetch(`${CONFIG.googleAnalyticsUrl}/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData),
          keepalive: true // Ensure request completes even if page closes
        });
      } catch (error) {
        console.error('Analytics update failed:', error);
        // Queue for retry later
        this.queueRetry(updateData);
      }
    }
    
    console.log(`Analytics update: ${actionType}`, updateData);
  },
  
  // Queue failed updates for retry
  queueRetry: function(updateData) {
    const retryQueue = JSON.parse(localStorage.getItem("analyticsRetryQueue")) || [];
    retryQueue.push(updateData);
    localStorage.setItem("analyticsRetryQueue", JSON.stringify(retryQueue));
    
    // Setup periodic retry
    if (!this.retryInterval) {
      this.retryInterval = setInterval(() => {
        this.processRetryQueue();
      }, 30000); // Retry every 30 seconds
    }
  },
  
  // Process queued retries
  processRetryQueue: async function() {
    const retryQueue = JSON.parse(localStorage.getItem("analyticsRetryQueue")) || [];
    if (retryQueue.length === 0) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
      return;
    }
    
    const successItems = [];
    
    for (const item of retryQueue) {
      try {
        await fetch(`${CONFIG.googleAnalyticsUrl}/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(item),
          keepalive: true
        });
        successItems.push(item);
      } catch (error) {
        console.error('Retry failed for:', item, error);
      }
    }
    
    // Update queue
    const newQueue = retryQueue.filter(item => !successItems.includes(item));
    localStorage.setItem("analyticsRetryQueue", JSON.stringify(newQueue));
  }
};

// Export the main tracking function
export function analyticsTracking(link, email, status) {
  if (status !== "active") return false;
  
  // Initialize the tracking manager
  AnalyticsManager.init(link, email);
  
  // Also submit a full state update on initialization
  AnalyticsManager.submitUpdate('init');
  
  console.log("Analytics tracking initialized for:", link);
}