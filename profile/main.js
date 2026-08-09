const CONFIG = {
  defaultBg: "url(https://tccards.tn/Assets/background.png) center fixed",
  defaultProfilePic: "https://tccards.tn/Assets/default.png",
  databases: {
    id: "AKfycbwKdG3ktzHcukFjVCxaMqn6Twyj_Qioj1yoQt5Dj5QmsZxE3wvLaaU4zFBOZbWJNGYX",
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

document.addEventListener("DOMContentLoaded", function () {
  // Set initial background
  document.body.style.background =
    "url(https://tccards.tn/Assets/background.png) center fixed";
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

  searchProfile(identifier, isIdLookup);
});

// Fast profile lookup using single database, redirects to 404.html on error
async function searchProfile(identifier, isIdLookup) {
  try {
    const param = isIdLookup ? "id" : "link";
    const url = `https://script.google.com/macros/s/${CONFIG.databases.id}/exec?${param}=${encodeURIComponent(identifier)}`;

    const response = await fetchWithTimeout(url, { timeout: 5000 });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    if (data?.status === "error") {
      showError("Profile not found");
      window.location.href = "/404.html";
      return;
    }

    if (data && typeof data === "object") {
      handleProfileData(data);
    } else {
      showError("Invalid profile data");
    }
  } catch (error) {
    console.error("Profile search error:", error);
    showError("Failed to load profile");
  }
}

// Helper function with timeout
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 18000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal,
  });
  clearTimeout(id);
  return response;
}

function handleProfileData(data, plan) {
  const loader = document.querySelector(".loader");
  if (loader) {
    loader.style.transition = "opacity 0.5s ease";
    loader.style.opacity = "0";
    setTimeout(() => {
      loader.style.display = "none";
    }, 500);
  }

  data = data.data || data;
  plan = plan || "free";

  if (!data || typeof data !== "object") {
    showError("Invalid profile data received");
    return;
  }

  if (data.status === "error") {
    showError(data?.message || "Profile data could not be loaded");
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
    const container = document.querySelector(".card-container");
    container.style.display = "block";

    const profileData = {
      name: data.Name || "User",
      link: data.Link || "tccards",
      tagline: data.Tagline || "",
      profilePic:
        data["Profile Picture URL"] ||
        "https://tccards.tn/Assets/default.png",
      socialLinks: data["Social Links"] || "",
      email: data.Email || "",
      phone: data.Phone || "",
      address: data.Address || "",
    };

    // FIX: Update meta tags dynamically so social/search previews reflect the real profile
    updateMetaTags(profileData);

    // Apply background style if available
    if (data["Selected Style"]) {
      const selectedStyle = String(data["Selected Style"]).trim();
      const presetBackgrounds = {
        corporateGradient:
          "linear-gradient(145deg, rgb(9, 9, 11), rgb(24, 24, 27), rgb(9, 9, 11))",
        oceanGradient:
          "linear-gradient(145deg, rgb(2, 6, 23), rgb(15, 23, 42), rgb(2, 6, 23))",
        default: CONFIG.defaultBg,
      };

      const backgroundStyle =
        presetBackgrounds[selectedStyle] ||
        (selectedStyle.includes("gradient(") || selectedStyle.startsWith("url(")
          ? selectedStyle
          : CONFIG.defaultBg);

      document.body.style.background = backgroundStyle;
      document.body.style.backgroundSize = backgroundStyle.startsWith("url(") ? "cover" : "auto";
    }

    container.innerHTML = `
      <div class="w-full container max-w-md p-6 md:p-24 rounded-xl shadow-lg mx-auto" style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px);">
        <div class="flex justify-end mb-0 top-right" onclick="showShareOptions('https://card.tccards.tn/@${escapeHtml(profileData.link)}')">
          <div class="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
            <i class="fas fa-share-alt text-gray-400"></i>
          </div>
        </div>
        <div class="flex flex-col items-center">
          <img src="${escapeHtml(profileData.profilePic)}" class="w-32 h-32 bg-gray-800 rounded-full mb-4 profile-picture" alt="${escapeHtml(profileData.name)}'s profile">
          <div class="w-full h-12 bg-gray-800 rounded mb-2 flex items-center justify-center">
            <!-- FIX: Removed duplicate "text-xl text-2xl" — keep only text-2xl -->
            <h1 class="text-2xl font-bold text-white">${escapeHtml(profileData.name)}</h1>
          </div>
          ${profileData.tagline ? `<div class="w-full h-full bg-gray-800 rounded mb-4 flex items-center justify-center"><p class="text-gray-300">${escapeHtml(profileData.tagline)}</p></div>` : ""}
          <div class="w-full bg-transparent mb-4">
            ${renderSocialLinks(profileData.socialLinks)}
          </div>
          ${
            profileData.email || profileData.phone || profileData.address
              ? `<div class="w-48 h-12 bg-gray-800 rounded mb-4 flex items-center justify-center">
              <button class="contact-btn" onclick="showContactDetails(${escapeHtml(
                JSON.stringify({
                  name: profileData.name,
                  profilepic: profileData.profilePic,
                  email: profileData.email,
                  phone: profileData.phone,
                  address: profileData.address,
                })
              )})">Get in Touch</button>
            </div>`
              : ""
          }
        </div>

        <!-- Footer -->
        <div class="mt-8 pt-4 border-t border-gray-800">
          <footer class="space-y-2 text-center">
            <div class="w-full py-2 rounded-lg bg-white/5 backdrop-blur-md">
              <a href="https://tccards.tn" class="text-gray-400 hover:text-white text-sm transition-colors">
                Powered by &copy; Total Connect ${new Date().getFullYear()}
              </a>
            </div>
            <div class="w-1/2 mx-auto py-2 rounded-lg bg-gray-900">
              <a href="https://plans.tccards.tn" target="_blank" class="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
                Get your Card
              </a>
            </div>
          </footer>
        </div>
      </div>
    `;

    console.log("Profile found and loaded");
  } catch (error) {
    console.error("Profile rendering error:", error);
    showError("Error displaying profile");
  }
}

/**
 * FIX: Dynamically update all SEO meta tags once we have real profile data.
 * This makes social previews (WhatsApp, Twitter, LinkedIn, etc.) show the
 * actual person's name, tagline, and profile picture instead of the generic defaults.
 */
function updateMetaTags(profileData) {
  const profileUrl = `https://card.tccards.tn/@${profileData.link}`;
  const title = `${profileData.name} | Total Connect NFC`;
  const description = profileData.tagline
    ? `${profileData.tagline} — View ${profileData.name}'s digital business card.`
    : `View and save ${profileData.name}'s digital business card, powered by Total Connect NFC.`;
  const image = profileData.profilePic || "https://tccards.tn/Assets/150.png";

  // Page title
  document.title = title;

  // Helper to set or create a meta tag
  const setMeta = (selector, attr, value) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement("meta");
      const [attrName, attrValue] = selector.replace("meta[", "").replace("]", "").split('="');
      el.setAttribute(attrName.trim(), attrValue.replace(/"/g, ""));
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };

  // Standard
  setMeta('meta[name="description"]', "content", description);

  // Canonical
  let canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = profileUrl;

  // Open Graph
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[property="og:image"]', "content", image);
  setMeta('meta[property="og:url"]', "content", profileUrl);

  // Twitter
  setMeta('meta[name="twitter:title"]', "content", title);
  setMeta('meta[name="twitter:description"]', "content", description);
  setMeta('meta[name="twitter:image"]', "content", image);
}

function renderSocialLinks(links) {
  if (!links || typeof links !== "string") return "";

  const validLinks = links
    .split("\n")
    .map((link) => {
      link = link.trim();
      if (!link) return null;
      try {
        if (!/^https?:\/\//i.test(link)) link = "https://" + link;
        const url = new URL(link);
        const domain = url.hostname.replace(/^www\./, "");
        return {
          href: url.href,
          display: domain,
          domain: domain,
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
        <a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer" class="social-link-item">
          <!-- Primary favicon (DuckDuckGo is usually the most reliable) -->
          <img 
            src="https://icons.duckduckgo.com/ip3/${encodeURIComponent(link.domain)}.ico" 
            alt=""
            class="social-icon"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';"
          />
          <!-- Fallback icon (Font Awesome 'link' icon) -->
          <i class="fas fa-link social-icon-fallback" style="display:none;"></i>
          <span>${escapeHtml(link.display)}</span>
        </a>
      `
        )
        .join("")}
    </div>
  `;
}

function generateVCard(contact) {
  const fullName = contact.name || 'Contact';
  const email = contact.email || '';
  const phone = contact.phone || '';
  const address = contact.address || '';
  // vCard version 3.0
  let vcard = 'BEGIN:VCARD\n';
  vcard += 'VERSION:3.0\n';
  vcard += `FN:${fullName}\n`;
  vcard += `N:${fullName};;;\n`;
  if (email) vcard += `EMAIL:${email}\n`;
  if (phone) vcard += `TEL:${phone}\n`;
  if (address) vcard += `ADR:;;${address};;;\n`;
  vcard += 'END:VCARD';
  return vcard;
}

function downloadVCard(vcardString, filename = 'contact.vcf') {
  const blob = new Blob([vcardString], { type: 'text/vcard;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

async function copyContactDetails(contact) {
  const lines = [
    contact.name,
    contact.email && `Email: ${contact.email}`,
    contact.phone && `Phone: ${contact.phone}`,
    contact.address && `Address: ${contact.address}`,
  ].filter(Boolean);
  const text = lines.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function showContactDetails(contact) {
  try {
    if (!contact || typeof contact !== 'object') {
      throw new Error('Invalid contact data');
    }

    // Build the contact HTML (design improved)
    const contactHtml = `
      <div class="contact-card">
        <div class="contact-avatar">
          <img src="${escapeHtml(contact.profilepic)}" 
               alt="${escapeHtml(contact.name)}" 
               onerror="this.src='https://tccards.tn/Assets/default.png'">
        </div>
        <h3 class="contact-name">${escapeHtml(contact.name)}</h3>
        <div class="contact-detail-list">
          ${contact.email ? `
            <div class="contact-detail-item">
              <i class="fas fa-envelope"></i>
              <a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>
            </div>` : ''}
          ${contact.phone ? `
            <div class="contact-detail-item">
              <i class="fas fa-phone"></i>
              <a href="tel:${escapeHtml(contact.phone)}">${escapeHtml(contact.phone)}</a>
            </div>` : ''}
          ${contact.address ? `
            <div class="contact-detail-item">
              <i class="fas fa-map-marker-alt"></i>
              <a href="https://maps.google.com/?q=${encodeURIComponent(contact.address)}" target="_blank">${escapeHtml(contact.address)}</a>
            </div>` : ''}
        </div>
        <div class="contact-actions">
          <button class="copy-details-btn" id="copyDetailsBtn">
            <i class="fas fa-copy"></i> Copy Details
          </button>
        </div>
      </div>
    `;

    // SweetAlert2 configuration
    const result = await Swal.fire({
      title: 'Contact Details',
      html: contactHtml,
      background: '#1a2332',
      color: '#fff',
      confirmButtonText: '💾 Save Contact',
      confirmButtonColor: '#2563eb',
      showCloseButton: true,
      closeButtonHtml: '✕',
      showCancelButton: false,
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        // When "Save Contact" is clicked, generate and download vCard
        try {
          const vcard = generateVCard(contact);
          downloadVCard(vcard, `${contact.name || 'contact'}.vcf`);
          return true;
        } catch (err) {
          Swal.showValidationMessage('Could not save contact. Please try again.');
          return false;
        }
      },
      allowOutsideClick: false,
      customClass: {
        confirmButton: 'swal-confirm-button',
        closeButton: 'swal-close-button-custom',
        popup: 'swal-popup-custom',
      },
      didOpen: (modal) => {
        // Attach copy handler to the custom "Copy Details" button
        const copyBtn = modal.querySelector('#copyDetailsBtn');
        if (copyBtn) {
          copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const copied = await copyContactDetails(contact);
            if (copied) {
              Swal.fire({
                icon: 'success',
                title: 'Copied!',
                toast: true,
                position: 'center',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
                background: '#1a1a1a',
                color: '#fff',
              });
            } else {
              Swal.fire({
                icon: 'error',
                title: 'Copy failed',
                text: 'Please allow clipboard access.',
                toast: true,
                position: 'center',
                showConfirmButton: false,
                timer: 2000,
              });
            }
          });
        }
      },
    });

    // After the modal closes (or if save succeeded)
    if (result.isConfirmed && result.value) {
      await Swal.fire({
        icon: 'success',
        title: 'Contact Saved!',
        text: 'The vCard file has been downloaded. Open it to add to your contacts.',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#2563eb',
      });
    }
  } catch (error) {
    console.error('Error in showContactDetails:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Could not display contact details',
      background: '#1a1a1a',
      color: '#fff',
    });
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
  document.body.classList.remove("loading");
  const existingLoader = document.querySelector(".loader");
  if (existingLoader) existingLoader.remove();
}

// Expose functions used in inline onclick attributes to the global scope.
// ES modules do NOT put functions on window automatically, so onclick="fn()"
// in injected HTML would throw ReferenceError without these assignments.
window.showContactDetails = showContactDetails;
window.showShareOptions = showShareOptions;

async function showShareOptions(link) {
  try {
    if (navigator.share) {
      await navigator.share({
        title: "Check out this profile",
        text: "View my digital business card",
        url: link,
      });
    } else {
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
