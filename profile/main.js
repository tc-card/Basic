
import { renderProfileForm, initFormHandler } from './formHandler.js';
// Configuration - moved to top for easy maintenance
const CONFIG = {
  defaultBg: "url(https://tccards.tn/Assets/bg.png) center fixed",
  defaultProfilePic: "https://tccards.tn/Assets/default.png",
  submitUrl:
    "https://script.google.com/macros/s/AKfycbzBI6WskjhTpezrIbUcveqY_EW8IJ5PUMQ0Aby6FJhpqo4sV-KfPtC3S668aNA7nYOL/exec",
  databases: [
    {
      id: "AKfycbzPv8Rr4jM6Fcyjm6uelUtqw2hHLCFWYhXJlt6nWTIKaqUL_9j_41rwzhFGMlkF2nrG",
      plan: "basic",
    },
  ],
  styles: {
    corporateGradient: {
      background:
        "linear-gradient(145deg, rgb(9, 9, 11), rgb(24, 24, 27), rgb(9, 9, 11))",
    },
    oceanGradient: {
      background:
        "linear-gradient(145deg, rgb(2, 6, 23), rgb(15, 23, 42), rgb(2, 6, 23))",
    },
  },
};

document.addEventListener("DOMContentLoaded", function () {
  // Set initial background
  document.body.style.background = CONFIG.defaultBg;
  document.body.style.backgroundSize = "cover";
  document.body.style.backdropFilter = "blur(5px)";

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
});

// Improved database search with better error handling
async function searchDatabases(databases, identifier, isIdLookup, index = 0) {
  try {
    if (index >= databases.length) {
      showError("Profile not found in any database");
      return;
    }

    const db = databases[index];
    const param = isIdLookup ? "id" : "link";
    const url = `https://script.google.com/macros/s/${
      db.id
    }/exec?${param}=${encodeURIComponent(identifier)}`;

    const response = await fetchWithTimeout(url, {
      timeout: 5000, // 5 second timeout
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    if (data?.status === "error") {
      return searchDatabases(databases, identifier, isIdLookup, index + 1);
    }

    if (data && typeof data === "object") {
      handleProfileData(data);
    } else {
      searchDatabases(databases, identifier, isIdLookup, index + 1);
    }
  } catch (error) {
    console.error("Database search error:", error);
    searchDatabases(databases, identifier, isIdLookup, index + 1);
  }
}

// Helper function with timeout
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal,
  });
  clearTimeout(id);

  return response;
}

function handleProfileData(data) {
  try {
    const loader = document.querySelector(".loader");
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
  const container = document.querySelector(".card-container");
  container.style.display = "block";

  // Prepare profile data with defaults
  const profileData = {
    name: data.Name || "User",
    link: data.Link || "tccards",
    tagline: data.Tagline || "",
    profilePic: data["Profile Picture URL"] || CONFIG.defaultProfilePic,
    form: data["Form Form"] || "", // form email
    socialLinks: data["Social Links"] || "",
    email: data.Email || "",
    phone: data.Phone || "",
    address: data.Address || "",
  };

  // Apply background style if available
  applyBackgroundStyle(data["Selected Style"]);

  // Render the profile card
  container.innerHTML = createProfileCardHTML(
    profileData,
    data["Selected Style"]
  );

  // Initialize form if present
  if (profileData.form) {
    initFormHandler(profileData.form, CONFIG.submitUrl);
  }
}

function applyBackgroundStyle(selectedStyle) {
  if (!selectedStyle) return;

  if (selectedStyle.startsWith("linear-gradient")) {
    document.body.style.background = selectedStyle;
  } else {
    document.body.style.background =
      CONFIG.styles[selectedStyle]?.background || CONFIG.defaultBg;
  }
  document.body.style.backgroundSize = "cover";
}

function createProfileCardHTML(profileData, selectedStyle) {
  const style = selectedStyle
    ? CONFIG.styles[selectedStyle]?.background
    : CONFIG.defaultBg;

  return `
    <center>
        <div class="profile-container">
            <div class="top-right" onclick="showShareOptions('${escapeHtml(
              profileData.link
            )}')">
                <i class="fas fa-share-alt"></i>
            </div>
            
            <img src="${escapeHtml(profileData.profilePic)}" 
             class="profile-picture js-profile-image" 
             alt="${escapeHtml(profileData.name)}'s profile"
             data-fallback="${escapeHtml(CONFIG.defaultProfilePic)}">
            
            <h2>${escapeHtml(profileData.name)}</h2>
            ${
              profileData.tagline
                ? `<p>${escapeHtml(profileData.tagline)}</p>`
                : ""
            }
            
            ${renderSocialLinks(profileData.socialLinks)}
            
            <div class="button-group">
              ${
                profileData.form
                  ? `<button class="contact-btn" onclick="openFormModal('${escapeHtml(profileData.form)}', '${escapeHtml(CONFIG.submitUrl)}')">
                      Contact Form
                    </button>`
                  : ""
              }

              ${
                profileData.email || profileData.phone || profileData.address
                  ? `<button class="contact-btn direct-contact-btn" onclick="showContactDetails(${escapeHtml(
                      JSON.stringify({
                        name: profileData.name,
                        profilePic: profileData.profilePic,
                        email: profileData.email,
                        phone: profileData.phone,
                        address: profileData.address,
                        style: style,
                      })
                    )})">Direct Contact</button>`
                  : ""
              }
            </div>

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

  // Map of domains to their corresponding Font Awesome icons
  const platformIcons = {
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
  };

  const validLinks = links
    .split("\n")
    .map((link) => {
      link = link.trim();
      if (!link) return null;

      try {
        // Ensure URL has protocol
        if (!/^https?:\/\//i.test(link)) link = "https://" + link;
        const url = new URL(link);
        const domain = url.hostname.replace(/^www\./, "");

        // Check if domain is in our platform icons
        const iconClass = Object.keys(platformIcons).find((key) =>
          domain.includes(key)
        )
          ? platformIcons[
              Object.keys(platformIcons).find((key) => domain.includes(key))
            ]
          : "fas fa-link";

        return {
          href: url.href,
          display: domain,
          icon: iconClass,
        };
      } catch (e) {
        return null;
      }
    })
    .filter((link) => link !== null);

  if (!validLinks.length) return "";

  return `
        <div class="social-links">
            ${validLinks
              .map(
                (link) => `
                <a href="${escapeHtml(
                  link.href
                )}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 p-3 hover:bg-gray-700 rounded-lg transition-colors">
                    <i class="${link.icon} text-lg"></i>
                    <span>${escapeHtml(link.display)}</span>
                </a>
            `
              )
              .join("")}
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
                <img src="${escapeHtml(
                  contact.profilePic
                )}" class="profile-picture" alt="${escapeHtml(
      contact.name
    )}" onerror="this.src='https://tccards.tn/Assets/default.png'">
                <h3>${escapeHtml(contact.name)}</h3>
            </div>
            <div class="contact-table">
                ${
                  contact.email
                    ? `
                <div class="contact-row">
                    <div class="contact-icon"><i class="fas fa-envelope"></i></div>
                    <div class="contact-info">
                    <a href="mailto:${escapeHtml(
                      contact.email
                    )}" class="contact-link">${escapeHtml(contact.email)}</a>
                    </div>
                </div>`
                    : ""
                }
                ${
                  contact.phone
                    ? `
                <div class="contact-row">
                    <div class="contact-icon"><i class="fas fa-phone"></i></div>
                    <div class="contact-info">
                    <a href="tel:${escapeHtml(
                      contact.phone
                    )}" class="contact-link">${escapeHtml(contact.phone)}</a>
                    </div>
                </div>`
                    : ""
                }
                ${
                  contact.address
                    ? `
                <div class="contact-row">
                    <div class="contact-icon"><i class="fas fa-map-marker-alt"></i></div>
                    <div class="contact-info">
                    <a href="https://maps.google.com/?q=${encodeURIComponent(
                      contact.address
                    )}" target="_blank" class="contact-link">${escapeHtml(
                        contact.address
                      )}</a>
                    </div>
                </div>`
                    : ""
                }
            </div>
            </div>
        `;

    const result = await Swal.fire({
      title: "Contact Details",
      html: contactHtml,
      background:
        typeof contact.style === "object"
          ? contact.style?.background
          : contact.style || "#162949",
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
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Error display
function showError(message) {
  const container = document.querySelector(".card-container") || document.body;
  container.innerHTML = `
        <div class="error-message">
            <h3 class="error-title">${escapeHtml(message)}</h3>
            <p class="error-subtext">Please check the URL or try again later.</p>
        </div>
    `;

  // Remove loading states
  document.body.classList.remove("loading");
  const existingLoader = document.querySelector(".loader");
  if (existingLoader) existingLoader.remove();
}

function showShareOptions(link) {
  username = `https://card.tccards.tn/@${link}`;
  // Generate a profile image with initials as fallback
  const profileName = document.querySelector("h2")?.textContent || "User";
  const profileImage =
    document.querySelector(".profile-picture")?.src ||
    `<div class="avatar-fallback" style="background-color: ${stringToColor(
      profileName
    )}">
            ${getInitials(profileName)}
        </div>`;

  Swal.fire({
    title: "Share Profile",
    html: `
            <div class="tc-share-container">
                <div class="tc-profile-header">
                    ${
                      typeof profileImage === "string"
                        ? `<img src="${profileImage}" class="tc-profile-pic" alt="Profile">`
                        : profileImage
                    }
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
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

// Add these helper functions
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

  let url = "";
  switch (platform) {
    case "facebook":
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        shareLink
      )}`;
      break;
    case "whatsapp":
      url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      break;
    case "linkedin":
      url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
        shareLink
      )}`;
      break;
    case "messenger":
      url = `fb-messenger://share/?link=${encodeURIComponent(shareLink)}`;
      break;
    case "snapchat":
      url = `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(
        shareLink
      )}`;
      break;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
