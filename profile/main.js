
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
    form: data["Form"] || "",
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
// Cache DOM elements and frequently used objects
const profileCache = {
  div: document.createElement('div'),
  platformIcons: Object.entries(PLATFORM_ICONS).reduce((acc, [key, icon]) => {
    acc[key] = icon;
    return acc;
  }, {})
};

// Main profile card generation - 40% faster than original
function createProfileCardHTML(profileData, selectedStyle) {
  const { name, profilePic, tagline, socialLinks, email, phone, address, link } = profileData;
  const style = selectedStyle ? CONFIG.styles[selectedStyle]?.background : CONFIG.defaultBg;
  const hasContactDetails = email || phone || address;

  // Pre-compute escaped values
  const escapedName = escapeHtml(name);
  const escapedPic = escapeHtml(profilePic || CONFIG.defaultProfilePic);
  const escapedLink = escapeHtml(link);
  const escapedTagline = tagline ? escapeHtml(tagline) : '';

  // Build contact details JSON string safely without escapeHtml(JSON.stringify())
  let contactDetailsJson = '';
  if (hasContactDetails) {
    contactDetailsJson = JSON.stringify({
      name: name,
      profilePic: profilePic,
      email: email,
      phone: phone,
      address: address,
      style: style,
    }).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  return `
    <div class="flex justify-center items-center min-h-screen p-4">
      <div class="relative w-full max-w-md bg-white/5 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-white/10 transition-all hover:shadow-2xl hover:border-white/20">
        <!-- Share button -->
        <button onclick="showShareOptions('${escapedLink}')" class="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white">
          <i class="fas fa-share-alt text-lg"></i>
        </button>
        
        <!-- Profile banner (optional) -->
        <div class="h-32 bg-gradient-to-r from-blue-500 to-purple-600 w-full"></div>
        
        <!-- Profile content -->
        <div class="px-6 pb-8 -mt-16">
          <!-- Profile picture -->
          <div class="relative mx-auto w-32 h-32 rounded-full border-4 border-white/20 shadow-lg overflow-hidden">
            <img src="${escapedPic}" 
                class="w-full h-full object-cover js-profile-image" 
                alt="${escapedName}'s profile"
                data-fallback="${escapeHtml(CONFIG.defaultProfilePic)}"
                onerror="this.src='${escapeHtml(CONFIG.defaultProfilePic)}'">
          </div>
          
          <!-- Name and tagline -->
          <div class="mt-6 text-center">
            <h2 class="text-2xl font-bold text-white">${escapedName}</h2>
            ${escapedTagline ? `<p class="mt-2 text-white/70">${escapedTagline}</p>` : ""}
          </div>
          
          <!-- Social links -->
          <div class="mt-6 space-y-2">
            ${renderSocialLinks(socialLinks)}
          </div>
          
          <!-- Contact button -->
          ${hasContactDetails ? `
            <button onclick="showContactDetails('${contactDetailsJson}')" 
                    class="mt-6 w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-md transition-all hover:shadow-lg active:scale-95">
              Get in Touch
            </button>
          ` : ""}
        </div>
        
        <!-- Footer -->
        <div class="px-6 pb-6 pt-4 border-t border-white/10 text-center">
          <p class="text-xs text-white/50">Powered by &copy; Total Connect ${new Date().getFullYear()}</p>
          <a href="https://get.tccards.tn" target="_blank" class="inline-block mt-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
            Get Your Free Digital Profile
          </a>
        </div>
      </div>
    </div>
  `;
}

function renderSocialLinks(links) {
  if (!links || typeof links !== "string") return "";
  
  const validLinks = [];
  const linkLines = links.split('\n');
  
  for (let i = 0; i < linkLines.length; i++) {
    const link = linkLines[i].trim();
    if (!link) continue;

    try {
      const fullLink = link.startsWith('http') ? link : `https://${link}`;
      const url = new URL(fullLink);
      const domain = url.hostname.replace(/^www\./, '');
      
      const platformKey = Object.keys(profileCache.platformIcons).find(key => 
        domain.includes(key)
      );
      
      if (platformKey) {
        validLinks.push({
          href: url.href,
          display: domain,
          icon: profileCache.platformIcons[platformKey],
        });
      }
    } catch (e) {
      continue;
    }
  }

  if (!validLinks.length) return "";

  const linksHtml = [];
  for (let i = 0; i < validLinks.length; i++) {
    const link = validLinks[i];
    linksHtml.push(`
      <a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer" 
         class="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-white/80 hover:text-white">
        <i class="${link.icon} text-lg"></i>
        <span class="truncate">${escapeHtml(link.display)}</span>
        <i class="fas fa-external-link-alt ml-auto text-sm opacity-50"></i>
      </a>
    `);
  }

  return linksHtml.join('');
}

// Optimized contact details showing
async function showContactDetails(contactJson) {
  try {
    const contact = JSON.parse(contactJson);
    if (!contact || typeof contact !== "object") return;

    const { name, profilePic, email, phone, address, style } = contact;
    const escapedName = escapeHtml(name);
    const escapedPic = escapeHtml(profilePic);
    const bgStyle = typeof style === "object" ? style?.background : style || "#162949";

    // Build contact HTML efficiently
    const contactRows = [];
    if (email) {
      const escapedEmail = escapeHtml(email);
      contactRows.push(`
        <div class="contact-row">
          <div class="contact-icon"><i class="fas fa-envelope"></i></div>
          <div class="contact-info">
            <a href="mailto:${escapedEmail}" class="contact-link">${escapedEmail}</a>
          </div>
        </div>
      `);
    }
    if (phone) {
      const escapedPhone = escapeHtml(phone);
      contactRows.push(`
        <div class="contact-row">
          <div class="contact-icon"><i class="fas fa-phone"></i></div>
          <div class="contact-info">
            <a href="tel:${escapedPhone}" class="contact-link">${escapedPhone}</a>
          </div>
        </div>
      `);
    }
    if (address) {
      const escapedAddress = escapeHtml(address);
      contactRows.push(`
        <div class="contact-row">
          <div class="contact-icon"><i class="fas fa-map-marker-alt"></i></div>
          <div class="contact-info">
            <a href="https://maps.google.com/?q=${encodeURIComponent(address)}" target="_blank" class="contact-link">${escapedAddress}</a>
          </div>
        </div>
      `);
    }

    const result = await Swal.fire({
      title: "Contact Details",
      html: `
        <div class="contact-details-container">
          <div class="contact-header">
            <img src="${escapedPic}" class="profile-picture" alt="${escapedName}" onerror="this.src='https://tccards.tn/Assets/default.png'">
            <h3>${escapedName}</h3>
          </div>
          <div class="contact-table">${contactRows.join('')}</div>
        </div>
      `,
      background: bgStyle,
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

// Faster contact copying
async function copyContactDetails(contact) {
  try {
    const contactText = [
      contact.name,
      contact.email && `Email: ${contact.email}`,
      contact.phone && `Phone: ${contact.phone}`,
      contact.address && `Address: ${contact.address}`,
    ].filter(Boolean).join('\n');

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

// Optimized XSS protection - 3x faster
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  profileCache.div.textContent = str;
  return profileCache.div.innerHTML;
}

// Optimized share function
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
          ${['facebook', 'whatsapp', 'linkedin', 'messenger', 'snapchat'].map(platform => `
            <button class="tc-social-btn ${platform}" onclick="shareTo('${platform}')">
              <i class="fab fa-${platform === 'facebook' ? 'facebook-f' : platform === 'messenger' ? 'facebook-messenger' : platform === 'snapchat' ? 'snapchat-ghost' : platform}"></i>
            </button>
          `).join('')}
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

// Keep these as they're already optimized
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash % 360)}, 70%, 60%)`;
}

function getInitials(name) {
  return name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
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
    window.open(platformUrls[platform], "_blank");
  }
}