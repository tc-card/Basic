const CONFIG = {
  defaultBg: "url(https://tccards.tn/Assets/bg.png) center fixed",
  defaultProfilePic: "https://tccards.tn/Assets/default.png",
  databases: {
    id: "AKfycbzPv8Rr4jM6Fcyjm6uelUtqw2hHLCFWYhXJlt6nWTIKaqUL_9j_41rwzhFGMlkF2nrG",
    plan: "basic",
  },
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


// ===== UPDATED INITIALIZATION =====
document.addEventListener("DOMContentLoaded", function () {
  // Existing hash handling (unchanged)
  const hash = window.location.hash.substring(1);
  if (!hash) {
    updateMetaTags({ error: true });
    showError("No profile link provided");
    return;
  }

  // Enhanced URL handling
  const newUrl = `https://card.tccards.tn/@${hash}`;
  window.history.replaceState(null, null, newUrl);

  // Initialize with loading meta
  updateMetaTags({
    name: "Loading...",
    bio: "Profile is loading",
  });

  // Determine lookup type and start search
  const isIdLookup = hash.startsWith("id_");
  const identifier = isIdLookup ? hash.split("_")[1] : hash;

  searchProfile(identifier, isIdLookup);
});

// Fast profile lookup using single database, redirects to 404.html on error
async function searchProfile(identifier, isIdLookup) {
  try {
    const param = isIdLookup ? "id" : "link";
    const url = `https://script.google.com/macros/s/${
      CONFIG.databases.id
    }/exec?${param}=${encodeURIComponent(identifier)}`;

    const response = await fetchWithTimeout(url, {
      timeout: 5000,
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    if (data?.status === "error") {
      showError("Profile not found");
      window.location.href = "/404.html";
      return;
    }

    if (data && typeof data === "object") {
      handleProfileData(data);
      updateMetaTags(data);
    } else {
      showError("Invalid profile data");
    }
  } catch (error) {
    updateMetaTags({ error: true });
    console.error("Profile search error:", error);
    showError("Failed to load profile");
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

// ===== NEW META TAG SYSTEM =====
function updateMetaTags(profile) {
  const title = profile?.name
    ? `${profile.name} | tccards`
    : "Profile Not Found";
  const description = profile?.bio || "Digital business card profile";
  const image = profile?.profilePic || CONFIG.defaultProfilePic;
  const url = `https://card.tccards.tn/@${window.location.hash.substring(1)}`;

  // Update standard meta tags
  document.title = title;
  setMetaTag("description", description);
  setMetaTag("og:title", title);
  setMetaTag("og:description", description);
  setMetaTag("og:image", image);
  setMetaTag("og:url", url);
  setMetaTag("twitter:card", "summary_large_image");

  // Handle error cases
  if (!profile || profile.error) {
    setMetaTag("robots", "noindex");
  }
}

function setMetaTag(name, content) {
  let tag = document.querySelector(
    `meta[name="${name}"], meta[property="${name}"]`
  );
  if (!tag) {
    tag = document.createElement("meta");
    name.startsWith("og:")
      ? tag.setAttribute("property", name)
      : tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
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

    updateMetaTags(data);
    renderProfileCard(data);
  } catch (error) {
    console.error("Profile handling error:", error);
    showError(error.message);
  }
}

function renderProfileCard(data) {
  const container = document.querySelector(".card-container");
  container.style.display = "block";

  if (data?.status && data.status === "Inactive") {
    showError(
      "Your profile is not active. Please contact support to activate your profile."
    );
    container.innerHTML = `
    <div class="profile-container">
        <div class="inactive-profile">
            <h2>Profile Inactive</h2>
            <p>If you are having any issues please <a href="mailto:info@tccards.tn">contact us</a></p>
        </div>
    </div>`;
    return;
  }

  // Prepare profile data with defaults
  const profileData = {
    name: data.Name || "User",
    link: data.Link || "tccards",
    tagline: data.Tagline || "",
    profilePic: data["Profile Picture URL"] || CONFIG.defaultProfilePic,
    form: data["Form"] || "", // form email
    socialLinks: data["Social Links"] || "",
    email: data.Email || "",
    phone: data.Phone || "",
    address: data.Address || "",
    status: data.status,
  };

  // Apply background style if available
  applyBackgroundStyle(data["Selected Style"]);

  // Render the profile card
  container.innerHTML = createProfileCardHTML(
    profileData,
    data["Selected Style"]
  );
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
            <div class="top-right" onclick="showShareOptions(window.location.href)">
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

            ${
              profileData.email || profileData.phone || profileData.address
                ? `<button class="contact-btn" onclick="showContactDetails(${escapeHtml(
                    JSON.stringify({
                      name: profileData.name,
                      profilePic: profileData.profilePic,
                      email: profileData.email,
                      phone: profileData.phone,
                      address: profileData.address,
                      style: style,
                    })
                  )})">Get in Touch</button>`
                : ""
            }

            <footer class="footer">
                <p>Powered by &copy; Total Connect ${new Date().getFullYear()}</p>
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
                        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                          link
                        )}" target="_blank" class="share-link facebook">Facebook</a>
                        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(
                          link
                        )}" target="_blank" class="share-link twitter">Twitter</a>
                        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                          link
                        )}" target="_blank" class="share-link linkedin">LinkedIn</a>
                        <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(
                          link
                        )}" target="_blank" class="share-link whatsapp">WhatsApp</a>
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
