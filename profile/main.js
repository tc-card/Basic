const CONFIG = {
  defaultBg: "url(https://tccards.tn/Assets/background.png) center fixed",
  defaultProfilePic: "https://tccards.tn/Assets/default.png",
  databases: {
    id: "AKfycbzPv8Rr4jM6Fcyjm6uelUtqw2hHLCFWYhXJlt6nWTIKaqUL_9j_41rwzhFGMlkF2nrG",
    plan: "basic",
  },
  styles: {
    corporateGradient: "linear-gradient(145deg, rgb(9, 9, 11), rgb(24, 24, 27), rgb(9, 9, 11))",
    oceanGradient: "linear-gradient(145deg, rgb(2, 6, 23), rgb(15, 23, 42), rgb(2, 6, 23))",
    forestGradient: "linear-gradient(145deg, rgb(2, 44, 34), rgb(6, 78, 59), rgb(2, 44, 34))",
    burgundyGradient: "linear-gradient(145deg, rgb(69, 10, 10), rgb(127, 29, 29), rgb(69, 10, 10))",
    minimal: "#18181b",
    black: "#09090b",
    navy: "#020617",
    forest: "#022c22",
    wine: "#450a0a",
    clouds: "#0ea5e9",
    Pink: "#9b0055",
    SkyBlue: "#2563eb",
    paleRed: "#f00f4d"
  },
  platformIcons: {
    "facebook.com": "fab fa-facebook",
    "fb.com": "fab fa-facebook",
    "fb.me": "fab fa-facebook",
    "messenger.com": "fab fa-facebook-messenger",
    "m.me": "fab fa-facebook-messenger",
    "twitter.com": "fab fa-twitter",
    "x.com": "fab fa-x-twitter",
    "instagram.com": "fab fa-instagram",
    "linkedin.com": "fab fa-linkedin",
    "youtube.com": "fab fa-youtube",
    "tiktok.com": "fab fa-tiktok",
    "pinterest.com": "fab fa-pinterest",
    "snapchat.com": "fab fa-snapchat",
    "reddit.com": "fab fa-reddit",
    "discord.com": "fab fa-discord",
    "twitch.tv": "fab fa-twitch",
    "github.com": "fab fa-github",
    "discord.gg": "fab fa-discord",
    "cal.com": "fas fa-calendar-alt",
    "calendly.com": "fas fa-calendar-alt",
    "linktree.com": "fas fa-link",
    "linktr.ee": "fas fa-link",
    "tccards.tn": "fas fa-id-card",
    "medium.com": "fab fa-medium",
    "whatsapp.com": "fab fa-whatsapp",
    "wa.me": "fab fa-whatsapp",
    "dribbble.com": "fab fa-dribbble",
    "behance.net": "fab fa-behance",
    "telegram.org": "fab fa-telegram",
    "t.me": "fab fa-telegram",
    "vimeo.com": "fab fa-vimeo",
    "spotify.com": "fab fa-spotify",
    "apple.com": "fab fa-apple",
    "google.com": "fab fa-google",
    "youtube-nocookie.com": "fab fa-youtube",
    "soundcloud.com": "fab fa-soundcloud",
    "paypal.com": "fab fa-paypal",
    "github.io": "fab fa-github",
    "stackoverflow.com": "fab fa-stack-overflow",
    "quora.com": "fab fa-quora",
  }
};

// Cache DOM elements and profiles
let domCache = {};
const profileCache = new Map();

// Pre-compiled HTML templates
const TEMPLATES = {
  card: (data) => `
    <div class="w-full container max-w-md p-6 md:p-24 rounded-xl shadow-lg mx-auto" style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px);">
      <div class="flex justify-end mb-0 top-right" onclick="showShareOptions('${data.link}')">
        <div class="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
          <i class="fas fa-share-alt text-gray-400"></i>
        </div>
      </div>
      <div class="flex flex-col items-center">
        <img src="${data.profilePic}" class="w-32 h-32 bg-gray-800 rounded-full mb-4 profile-picture" alt="${data.name}'s profile" loading="lazy">
        <div class="w-full h-12 bg-gray-800 rounded mb-2 flex items-center justify-center">
          <h1 class="text-xl text-2xl font-bold text-white">${data.name}</h1>
        </div>
        ${data.tagline ? `<div class="w-full h-full bg-gray-800 rounded mb-4 flex items-center justify-center"><p class="text-gray-300">${data.tagline}</p></div>` : ''}
        <div class="w-full bg-transparent mb-4">
          ${data.socialLinksHTML}
        </div>
        ${data.contactButton}
      </div>
      <div class="mt-8 pt-4 border-t border-gray-800">
        <footer class="space-y-2 text-center">
          <div class="w-full py-2 rounded-lg bg-white/5 backdrop-blur-md">
            <a href="https://tccards.tn" class="text-gray-400 hover:text-white text-sm transition-colors">
              Powered by &copy; Total Connect ${new Date().getFullYear()}
            </a>
          </div>
          <div class="w-1/2 mx-auto py-2 rounded-lg bg-gray-900">
            <a href="https://plans.tccards.tn" target="_blank" class="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
              Upgrade your Card
            </a>
          </div>
        </footer>
      </div>
    </div>
  `,
  socialLink: (link) => `
    <a href="${link.href}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 p-3 hover:bg-gray-700 rounded-lg transition-colors">
      <i class="${link.icon} text-lg"></i>
      <span>${link.display}</span>
    </a>
  `,
  contactDetails: (contact) => `
    <div class="contact-details-container">
      <div class="contact-header" style="display: flex; align-items: center; gap: 1rem; justify-content: center;">
        <img src="${contact.profilepic}" class="profile-picture" alt="${contact.name}" onerror="this.src='https://tccards.tn/Assets/default.png'" style="width: 60px; height: 60px; border-radius: 50%;">
        <h3 style="margin: 0;">${contact.name}</h3>
      </div>
      <div class="contact-table">
        ${contact.email ? `
        <div class="contact-row">
          <div class="contact-icon"><i class="fas fa-envelope"></i></div>
          <div class="contact-info">
            <a href="mailto:${contact.email}" class="contact-link">${contact.email}</a>
          </div>
        </div>` : ''}
        ${contact.phone ? `
        <div class="contact-row">
          <div class="contact-icon"><i class="fas fa-phone"></i></div>
          <div class="contact-info">
            <a href="tel:${contact.phone}" class="contact-link">${contact.phone}</a>
          </div>
        </div>` : ''}
        ${contact.address ? `
        <div class="contact-row">
          <div class="contact-icon"><i class="fas fa-map-marker-alt"></i></div>
          <div class="contact-info">
            <a href="https://maps.google.com/?q=${encodeURIComponent(contact.address)}" target="_blank" class="contact-link">${contact.address}</a>
          </div>
        </div>` : ''}
      </div>
    </div>
  `,
  error: (message) => `
    <div class="error-message">
      <h3 class="error-title">${message}</h3>
      <p class="error-subtext">Please check the URL or try again later.</p>
    </div>
  `
};

// Initialize immediately
function init() {
  // Set background immediately
  document.body.style.background = CONFIG.defaultBg;
  document.body.style.backgroundSize = "cover";
  document.body.style.backdropFilter = "blur(5px)";

  // Cache DOM elements
  domCache.loader = document.querySelector('.loader');
  domCache.container = document.querySelector(".card-container");

  const hash = window.location.hash.substring(1);
  if (!hash) {
    showError("No profile link provided");
    return;
  }

  // Update URL without reload
  const newUrl = `https://card.tccards.tn/@${hash}`;
  window.history.replaceState(null, null, newUrl);

  const isIdLookup = hash.startsWith("id_");
  const identifier = isIdLookup ? hash.split("_")[1] : hash;

  // Start search immediately
  searchProfile(identifier, isIdLookup);
}

// Start immediately if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Optimized profile search with caching
async function searchProfile(identifier, isIdLookup) {
  const cacheKey = `${isIdLookup ? 'id' : 'link'}_${identifier}`;
  
  // Check session cache first (5 minute cache)
  if (profileCache.has(cacheKey)) {
    const cached = profileCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 300000) {
      handleProfileData(cached.data);
      return;
    }
  }

  showLoadingState();

  try {
    const param = isIdLookup ? "id" : "link";
    const url = `https://script.google.com/macros/s/${CONFIG.databases.id}/exec?${param}=${encodeURIComponent(identifier)}`;

    const response = await fetchWithTimeout(url, { timeout: 3000 });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    
    if (data?.status === "error") {
      handleProfileNotFound();
      return;
    }

    if (data && typeof data === "object") {
      // Cache the successful response
      profileCache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });
      
      handleProfileData(data);
    } else {
      showError("Invalid profile data");
    }
  } catch (error) {
    console.error("Profile search error:", error);
    
    // Try cached data as fallback
    if (profileCache.has(cacheKey)) {
      const cached = profileCache.get(cacheKey);
      handleProfileData(cached.data);
    } else {
      showError("Failed to load profile");
    }
  }
}

// Fast fetch with timeout
function fetchWithTimeout(resource, options = {}) {
  const { timeout = 3000 } = options;
  
  return Promise.race([
    fetch(resource, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}

function handleProfileData(data, plan = 'free') {
  hideLoadingState();
  
  data = data.data || data;
  if (!data || typeof data !== 'object' || data.status === "error") {
    showError(data?.message || "Invalid profile data received");
    return;
  }

  if (!data.Name) {
    showError("Invalid profile data: Name is required");
    return;
  }
  
  if (data?.Status && data.Status !== "Active") {
    showError("This profile is currently inactive");
    return;
  }

  try {
    // Apply background style efficiently
    applyBackgroundStyle(data['Selected Style']);
    
    // Prepare profile data efficiently
    const profileData = prepareProfileData(data);
    
    // Render the card
    domCache.container.style.display = 'block';
    domCache.container.innerHTML = TEMPLATES.card(profileData);
    
  } catch (error) {
    console.error("Profile rendering error:", error);
    showError("Error displaying profile");
  }
}

function applyBackgroundStyle(selectedStyle) {
  if (!selectedStyle) return;
  
  if (selectedStyle.startsWith('linear-gradient')) {
    document.body.style.background = selectedStyle;
  } else {
    const style = CONFIG.styles[selectedStyle];
    if (style) {
      document.body.style.background = typeof style === 'object' ? style.background : style;
    }
  }
  document.body.style.backgroundSize = "cover";
}

function prepareProfileData(data) {
  const profileData = {
    name: escapeHtml(data.Name || 'User'),
    link: escapeHtml(data.Link || 'tccards'),
    tagline: escapeHtml(data.Tagline || ''),
    profilePic: escapeHtml(data['Profile Picture URL'] || CONFIG.defaultProfilePic),
    email: data.Email || '',
    phone: data.Phone || '',
    address: data.Address || ''
  };

  // Pre-render social links
  profileData.socialLinksHTML = renderSocialLinks(data['Social Links'] || '');
  
  // Pre-render contact button
  profileData.contactButton = (profileData.email || profileData.phone || profileData.address) ? 
    `<div class="w-48 h-12 bg-gray-800 rounded mb-4 flex items-center justify-center">
      <button class="contact-btn" onclick="showContactDetails(${escapeHtml(JSON.stringify({
        name: profileData.name,
        profilepic: profileData.profilePic,
        email: profileData.email,
        phone: profileData.phone,
        address: profileData.address
      }))})">Get in Touch</button>
    </div>` : '';

  return profileData;
}

function renderSocialLinks(links) {
  if (!links || typeof links !== "string") return "";

  const validLinks = links
    .split("\n")
    .map(link => {
      link = link.trim();
      if (!link) return null;

      try {
        if (!/^https?:\/\//i.test(link)) link = "https://" + link;
        const url = new URL(link);
        const domain = url.hostname.replace(/^www\./, "");

        const iconClass = Object.keys(CONFIG.platformIcons).find(key => 
          domain.includes(key)
        ) ? CONFIG.platformIcons[Object.keys(CONFIG.platformIcons).find(key => domain.includes(key))] : "fas fa-link";

        return {
          href: escapeHtml(url.href),
          display: escapeHtml(domain),
          icon: iconClass,
        };
      } catch (e) {
        return null;
      }
    })
    .filter(link => link !== null);

  if (!validLinks.length) return "";

  return validLinks.map(link => TEMPLATES.socialLink(link)).join("");
}

// Optimized loading states
function showLoadingState() {
  if (!domCache.loader) return;
  domCache.loader.style.display = 'block';
  domCache.loader.style.opacity = '1';
}

function hideLoadingState() {
  if (!domCache.loader) return;
  domCache.loader.style.transition = 'opacity 0.3s ease';
  domCache.loader.style.opacity = '0';
  setTimeout(() => {
    if (domCache.loader) domCache.loader.style.display = 'none';
  }, 300);
}

function handleProfileNotFound() {
  hideLoadingState();
  showError("Profile not found");
  setTimeout(() => {
    window.location.href = "/404.html";
  }, 1500);
}

// Fast HTML escaping
const escapeHtml = (() => {
  const div = document.createElement('div');
  return (text) => {
    if (typeof text !== "string") return text;
    div.textContent = text;
    return div.innerHTML;
  };
})();

function showError(message) {
  const container = domCache.container || document.body;
  container.innerHTML = TEMPLATES.error(escapeHtml(message));
  hideLoadingState();
}

// Contact and Share functions (keep your existing ones with minor optimizations)
async function showContactDetails(contact) {
  try {
    if (!contact || typeof contact !== "object") {
      throw new Error("Invalid contact data");
    }

    const contactHtml = TEMPLATES.contactDetails(contact);

    const result = await Swal.fire({
      title: "Contact Details",
      html: contactHtml,
      background: "#162949",
      confirmButtonText: "Copy Details",
      showCancelButton: true,
      cancelButtonText: "Close",
      color: "#fff",
      showLoaderOnConfirm: true,
      allowOutsideClick: false,
      customClass: {
        confirmButton: "swal-confirm-button",
        cancelButton: "swal-cancel-button",
      },
    });

    if (result.isConfirmed) {
      await copyContactDetails(contact);
    }
  } catch (error) {
    console.error("Error in showContactDetails:", error);
    await Swal.fire({
      icon: "error",
      title: "Error",
      text: "Could not display contact details",
      background: "#1a1a1a",
      color: "#fff",
    });
  }
}

async function copyContactDetails(contact) {
  try {
    const contactText = [
      contact.name,
      contact.email && `Email: ${contact.email}`,
      contact.phone && `Phone: ${contact.phone}`,
      contact.address && `Address: ${contact.address}`,
    ]
      .filter(Boolean)
      .join("\n");

    await navigator.clipboard.writeText(contactText);
    await Swal.fire({
      icon: "success",
      title: "Copied!",
      toast: true,
      position: "center",
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      background: "#1a1a1a",
      color: "#fff",
    });
  } catch (error) {
    console.error("Copy failed:", error);
    throw new Error("Failed to copy contact details");
  }
}

async function showShareOptions(link) {
  try {
    // Check if Web Share API is supported
    if (navigator.share) {
      await navigator.share({
        title: "Check out this profile",
        text: "View my digital business card",
        url: link,
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      const shareHtml = `
        <div class="share-options">
          <h3>Share this profile</h3>
          <div class="share-links">
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}" target="_blank" class="share-link facebook">Facebook</a>
            <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}" target="_blank" class="share-link twitter">Twitter</a>
            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}" target="_blank" class="share-link linkedin">LinkedIn</a>
            <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(link)}" target="_blank" class="share-link whatsapp">WhatsApp</a>
          </div>
        </div>
      `;

      Swal.fire({
        title: "Share Profile",
        html: shareHtml,
        showCancelButton: true,
        cancelButtonText: "Close",
        background: "#162949",
        color: "#fff",
        customClass: {
          confirmButton: "swal-confirm-button",
          cancelButton: "swal-cancel-button",
        },
      });
    }
  } catch (error) {
    console.error("Error sharing:", error);
  }
}