
const CONFIG = Object.freeze({
  defaultBg: "url(https://tccards.tn/Assets/bg.png) center fixed",
  defaultProfilePic: "https://tccards.tn/Assets/default.png",
  databases: Object.freeze([
    Object.freeze({
      id: "AKfycbzPv8Rr4jM6Fcyjm6uelUtqw2hHLCFWYhXJlt6nWTIKaqUL_9j_41rwzhFGMlkF2nrG",
      plan: "basic",
    }),
  ]),
  styles: Object.freeze({
    corporateGradient: Object.freeze({
      background: "linear-gradient(145deg, rgb(9, 9, 11), rgb(24, 24, 27), rgb(9, 9, 11))",
    }),
    oceanGradient: Object.freeze({
      background: "linear-gradient(145deg, rgb(2, 6, 23), rgb(15, 23, 42), rgb(2, 6, 23))",
    }),
  }),
});

// Cache DOM elements
const domCache = {
  body: document.body,
  loader: document.querySelector(".loader"),
  container: document.querySelector(".card-container"),
};

// Platform icons map
const PLATFORM_ICONS = Object.freeze({
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
});

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", initProfilePage);

function initProfilePage() {
  // Set initial background
  const { body } = domCache;
  body.style.background = CONFIG.defaultBg;
  body.style.backgroundSize = "cover";
  body.style.backdropFilter = "blur(5px)";

  // Extract identifier from URL hash
  const hash = window.location.hash.substring(1);
  if (!hash) {
    showError("No profile link provided");
    return;
  }

  // Update URL without reload
  const newUrl = `https://card.tccards.tn/@${hash}`;
  window.history.replaceState(null, null, newUrl);

  // Determine lookup type and start search
  const isIdLookup = hash.startsWith("id_");
  const identifier = isIdLookup ? hash.split("_")[1] : hash;

  searchDatabases(CONFIG.databases, identifier, isIdLookup);
}

// Improved database search with parallel requests
async function searchDatabases(databases, identifier, isIdLookup) {
  try {
    const param = isIdLookup ? "id" : "link";
    const requests = databases.map(db => {
      const url = `https://script.google.com/macros/s/${db.id}/exec?${param}=${encodeURIComponent(identifier)}`;
      return fetchWithTimeout(url, { timeout: 5000 });
    });

    const responses = await Promise.allSettled(requests);
    
    for (const response of responses) {
      if (response.status === 'fulfilled' && response.value.ok) {
        const data = await response.value.json();
        if (data && typeof data === 'object' && data.status !== 'error') {
          return handleProfileData(data);
        }
      }
    }
    
    showError("Profile not found in any database");
  } catch (error) {
    console.error("Database search error:", error);
    showError("Error searching databases");
  }
}

// Optimized fetch with timeout
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function handleProfileData(data) {
  try {
    const { loader } = domCache;
    if (loader) loader.style.display = "none";

    // Normalize data structure
    data = data.data || data;

    if (!data || typeof data !== "object") {
      throw new Error("Invalid profile data received");
    }

    if (data.status === "error") {
      throw new Error(data?.message || "Profile data could not be loaded");
    }

    if (!data.Name) {
      throw new Error("Invalid profile data: Name is required");
    }

    if (data?.Status && data.Status !== "Active") {
      throw new Error("This profile is currently inactive");
    }

    renderProfileCard(data);
  } catch (error) {
    console.error("Profile handling error:", error);
    showError(error.message);
  }
}

function renderProfileCard(data) {
  const { container } = domCache;
  container.style.display = "block";

  // Prepare profile data with defaults
  const profileData = {
    name: data.Name || "User",
    link: data.Link || "tccards",
    tagline: data.Tagline || "",
    profilePic: data["Profile Picture URL"] || CONFIG.defaultProfilePic,
    form: data["Form Form"] || "",
    socialLinks: data["Social Links"] || "",
    email: data.Email || "",
    phone: data.Phone || "",
    address: data.Address || "",
  };

  // Apply background style if available
  applyBackgroundStyle(data["Selected Style"]);

  // Render the profile card
  container.innerHTML = createProfileCardHTML(profileData, data["Selected Style"]);

  // Initialize form if present
  if (profileData.form) {
    initFormHandler(profileData.form, CONFIG.submitUrl);
  }

  // Preload profile image
  if (profileData.profilePic !== CONFIG.defaultProfilePic) {
    const img = new Image();
    img.src = profileData.profilePic;
  }
}

function applyBackgroundStyle(selectedStyle) {
  if (!selectedStyle) return;

  const { body } = domCache;
  if (selectedStyle.startsWith("linear-gradient")) {
    body.style.background = selectedStyle;
  } else {
    body.style.background = CONFIG.styles[selectedStyle]?.background || CONFIG.defaultBg;
  }
  body.style.backgroundSize = "cover";
}

function createProfileCardHTML(profileData, selectedStyle) {
  const style = selectedStyle ? CONFIG.styles[selectedStyle]?.background : CONFIG.defaultBg;
  const contactDetails = profileData.email || profileData.phone || profileData.address;

  return `
    <center>
      <div class="profile-container">
        <div class="top-right" onclick="showShareOptions('${escapeHtml(profileData.link)}')">
          <i class="fas fa-share-alt"></i>
        </div>
        
        <img src="${escapeHtml(profileData.profilePic)}" 
          class="profile-picture js-profile-image" 
          alt="${escapeHtml(profileData.name)}'s profile"
          data-fallback="${escapeHtml(CONFIG.defaultProfilePic)}">
        
        <h2>${escapeHtml(profileData.name)}</h2>
        ${profileData.tagline ? `<p>${escapeHtml(profileData.tagline)}</p>` : ""}
        
        ${renderSocialLinks(profileData.socialLinks)}

        ${contactDetails ? `
          <button class="contact-btn" onclick="showContactDetails(${escapeHtml(
            JSON.stringify({
              name: profileData.name,
              profilePic: profileData.profilePic,
              email: profileData.email,
              phone: profileData.phone,
              address: profileData.address,
              style: style,
            })
          )})">Get in Touch</button>
        ` : ""}

        <footer class="footer">
          <p>Powered by &copy; Total Connect ${new Date().getFullYear()}</p>
          <p><a href="https://get.tccards.tn" target="_blank" style='color:springgreen'>Get Your Free Digital Profile</a></p>
        </footer>
      </div>
    </center>
  `;
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

        const platformKey = Object.keys(PLATFORM_ICONS).find(key => domain.includes(key));
        const iconClass = platformKey ? PLATFORM_ICONS[platformKey] : "fas fa-link";

        return {
          href: url.href,
          display: domain,
          icon: iconClass,
        };
      } catch (e) {
        return null;
      }
    })
    .filter(link => link !== null);

  if (!validLinks.length) return "";

  return `
    <div class="social-links">
      ${validLinks.map(link => `
        <a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 p-3 hover:bg-gray-700 rounded-lg transition-colors">
          <i class="${link.icon} text-lg"></i>
          <span>${escapeHtml(link.display)}</span>
        </a>
      `).join("")}
    </div>
  `;
}

async function showContactDetails(contact) {
  try {
    if (!contact || typeof contact !== "object") {
      throw new Error("Invalid contact data");
    }

    const contactHtml = `
      <div class="contact-details-container">
        <div class="contact-header">
          <img src="${escapeHtml(contact.profilePic)}" class="profile-picture" alt="${escapeHtml(contact.name)}" onerror="this.src='https://tccards.tn/Assets/default.png'">
          <h3>${escapeHtml(contact.name)}</h3>
        </div>
        <div class="contact-table">
          ${contact.email ? `
            <div class="contact-row">
              <div class="contact-icon"><i class="fas fa-envelope"></i></div>
              <div class="contact-info">
                <a href="mailto:${escapeHtml(contact.email)}" class="contact-link">${escapeHtml(contact.email)}</a>
              </div>
            </div>` : ""}
          ${contact.phone ? `
            <div class="contact-row">
              <div class="contact-icon"><i class="fas fa-phone"></i></div>
              <div class="contact-info">
                <a href="tel:${escapeHtml(contact.phone)}" class="contact-link">${escapeHtml(contact.phone)}</a>
              </div>
            </div>` : ""}
          ${contact.address ? `
            <div class="contact-row">
              <div class="contact-icon"><i class="fas fa-map-marker-alt"></i></div>
              <div class="contact-info">
                <a href="https://maps.google.com/?q=${encodeURIComponent(contact.address)}" target="_blank" class="contact-link">${escapeHtml(contact.address)}</a>
              </div>
            </div>` : ""}
        </div>
      </div>
    `;

    const result = await Swal.fire({
      title: "Contact Details",
      html: contactHtml,
      background: typeof contact.style === "object" ? contact.style?.background : contact.style || "#162949",
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

// XSS protection
function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") return unsafe;
  const div = document.createElement('div');
  div.textContent = unsafe;
  return div.innerHTML;
}

// Error display
function showError(message) {
  const { container } = domCache;
  container.innerHTML = `
    <div class="error-message">
      <h3 class="error-title">${escapeHtml(message)}</h3>
      <p class="error-subtext">Please check the URL or try again later.</p>
    </div>
  `;

  // Remove loading states
  domCache.body.classList.remove("loading");
  if (domCache.loader) domCache.loader.remove();
}

function showShareOptions(link) {
  const username = `https://card.tccards.tn/@${link}`;
  const profileName = document.querySelector("h2")?.textContent || "User";
  const profileImage = document.querySelector(".profile-picture")?.src || 
    `<div class="avatar-fallback" style="background-color: ${stringToColor(profileName)}">
      ${getInitials(profileName)}
    </div>`;

  Swal.fire({
    title: "Share Profile",
    html: `
      <div class="tc-share-container">
        <div class="tc-profile-header">
          ${typeof profileImage === "string" ? 
            `<img src="${profileImage}" class="tc-profile-pic" alt="Profile">` : 
            profileImage}
          <h3 class="tc-username">@${link}</h3>
        </div>
        
        <div class="tc-share-link">
          <input type="text" value="${username}" id="tc-share-link-input" readonly>
          <button class="tc-copy-btn" onclick="copyShareLink()">
            <i class="fas fa-copy"></i> 
          </button>
        </div>
        
        <div class="tc-social-share">
          <button class="tc-social-btn facebook" onclick="shareTo('facebook')">
            <i class="fab fa-facebook-f"></i>
          </button>
          <button class="tc-social-btn whatsapp" onclick="shareTo('whatsapp')">
            <i class="fab fa-whatsapp"></i>
          </button>
          <button class="tc-social-btn linkedin" onclick="shareTo('linkedin')">
            <i class="fab fa-linkedin-in"></i>
          </button>
          <button class="tc-social-btn messenger" onclick="shareTo('messenger')">
            <i class="fab fa-facebook-messenger"></i>
          </button>
          <button class="tc-social-btn snapchat" onclick="shareTo('snapchat')">
            <i class="fab fa-snapchat-ghost"></i>
          </button>
        </div>
        <div class="tc-signup-cta">
          <button class="tc-signup-btn" onclick="window.location.href='https://tccards.tn/plans/free'">
            Sign up free
          </button>
        </div>
      </div>
    `,
    showConfirmButton: false,
    showCloseButton: true,
    maxWidth: "600px",
    width: "90%",
    background: "#ffffff",
    customClass: {
      popup: "tc-share-popup",
      closeButton: "tc-close-btn",
    },
    footer: `
      <div class="tc-footer-links">
        <a href="https://tccards.tn/report" class="tc-footer-link">Report Profile</a>
        <a href="https://tccards.tn/help" class="tc-footer-link">Help</a>
      </div>
    `,
  });
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
}

function getInitials(name) {
  return name
    .split(" ")
    .map(part => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

function copyShareLink() {
  const input = document.getElementById("tc-share-link-input");
  input.select();
  document.execCommand("copy");
  Swal.fire({
    title: "Copied!",
    text: "Link copied to clipboard",
    icon: "success",
    timer: 2000,
    showConfirmButton: false,
  });
}

function shareTo(platform) {
  const shareLink = document.getElementById("tc-share-link-input").value;
  const shareText = `Check out my digital profile: ${shareLink}`;

  const platformUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareLink)}`,
    messenger: `fb-messenger://share/?link=${encodeURIComponent(shareLink)}`,
    snapchat: `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(shareLink)}`,
  };

  if (platformUrls[platform]) {
    window.open(platformUrls[platform], "_blank", "noopener,noreferrer");
  }
}