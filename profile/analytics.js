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
    const socialLinks = document.querySelectorAll(".social-link");
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
    
    // Monitor for copy actions
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
    const now = Date.now();
    // Only count a visit if it's been more than 30 minutes since last visit
    if (now - this.state.lastUpdated > 30 * 60 * 1000) {
      this.state.totalVisits++;
      this.state.lastUpdated = now;
      this.saveState();
      this.submitUpdate('visit');
    }
  },
  
  // Submit updates to server
  submitUpdate: async function(actionType, actionDetail = null) {
    // Prepare update data in the format backend expects
    const updateData = {
      action: actionType,
      detail: actionDetail,
      fullState: {
        ...this.state,
        link: this.link,
        email: this.email
      }
    };
    
    try {
      const response = await fetch(CONFIG.googleAnalyticsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log(`Analytics update successful: ${actionType}`);
    } catch (error) {
      console.error('Analytics update failed:', error);
      this.queueRetry(updateData);
    }
  },
  
  // Queue failed updates for retry
  queueRetry: function(updateData) {
    const retryQueue = JSON.parse(localStorage.getItem("analyticsRetryQueue")) || [];
    retryQueue.push(updateData);
    localStorage.setItem("analyticsRetryQueue", JSON.stringify(retryQueue));
    
    // Setup periodic retry if not already running
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
    
    const successfulItems = [];
    
    for (const item of retryQueue) {
      try {
        const response = await fetch(CONFIG.googleAnalyticsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(item)
        });
        
        if (response.ok) {
          successfulItems.push(item);
        }
      } catch (error) {
        console.error('Retry failed for:', item, error);
      }
    }
    
    // Update queue by removing successful items
    const newQueue = retryQueue.filter(item => !successfulItems.includes(item));
    localStorage.setItem("analyticsRetryQueue", JSON.stringify(newQueue));
  }
};

// Export the main tracking function
export function analyticsTracking(link, email, status) {
  if (status !== "active") return false;
  
  // Initialize the tracking manager
  AnalyticsManager.init(link, email);
  
  // Submit initial state
  AnalyticsManager.submitUpdate('init');
  
  console.log("Analytics tracking initialized for:", link);
}