const CONFIG = {
  defaultBg: "url(https://tccards.tn/Assets/background.png) center fixed",
  defaultProfilePic: "https://tccards.tn/Assets/default.png",
  databases: {
    id: "AKfycbwKdG3ktzHcukFjVCxaMqn6Twyj_Qioj1yoQt5Dj5QmsZxE3wvLaaU4zFBOZbWJNGYX",
    plan: "basic",
  },
  styles: {
    corporateGradient: {
      background: "linear-gradient(145deg, rgb(9, 9, 11), rgb(24, 24, 27), rgb(9, 9, 11))",
    },
    oceanGradient: {
      background: "linear-gradient(145deg, rgb(2, 6, 23), rgb(15, 23, 42), rgb(2, 6, 23))",
    },
  },
};

document.addEventListener("DOMContentLoaded", function () {
  document.body.style.background = CONFIG.defaultBg;
  document.body.style.backgroundSize = "cover";
  document.body.style.backdropFilter = "blur(5px)";

  let hash = window.location.hash.substring(1);
  if (!hash) {
    showError("No profile link provided");
    return;
  }

  const isIdLookup = hash.startsWith("id_");
  const identifier = isIdLookup ? hash.split("_")[1] : hash;

  const newUrl = isIdLookup
    ? `https://card.tccards.tn/id_${identifier}`
    : `https://card.tccards.tn/@${hash}`;
  window.history.replaceState(null, null, newUrl);

  searchProfile(identifier, isIdLookup);
});

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

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 18000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
}

/**
 * Resolves background + theme from the two possible sources:
 *   1. "Background Image" column — the raw Cloudinary URL (preferred)
 *   2. "Selected Style" column — either a gradient, or a legacy "url(...)/theme" string
 *
 * Returns { background, theme, isImage }
 */
function resolveBackground(selectedStyle, backgroundImage) {
  let theme = 'dark';

  // ── Primary: dedicated Background Image column ─────────────
  const bgUrl = typeof backgroundImage === 'string' ? backgroundImage.trim() : '';
  if (bgUrl && /^https?:\/\//i.test(bgUrl)) {
    // Theme may be encoded as trailing "/light" or "/dark" on Selected Style
    if (typeof selectedStyle === 'string') {
      const m = selectedStyle.match(/\/(dark|light)\s*$/i);
      if (m) theme = m[1].toLowerCase();
    }
    return { background: `url('${bgUrl}')`, theme, isImage: true };
  }

  // ── Fallback: Selected Style ───────────────────────────────
  if (!selectedStyle || typeof selectedStyle !== 'string') {
    return { background: CONFIG.defaultBg, theme, isImage: true };
  }

  // Pull a trailing "/dark" or "/light" off the end (only matches at the very end)
  let style = selectedStyle.trim();
  const themeMatch = style.match(/\/(dark|light)\s*$/i);
  if (themeMatch) {
    theme = themeMatch[1].toLowerCase();
    style = style.slice(0, themeMatch.index).trim();
  }

  const isImage = /^url\(/i.test(style) || /^https?:/i.test(style);
  return { background: style, theme, isImage };
}

function handleProfileData(data, plan) {
  const loader = document.querySelector(".loader");
  if (loader) {
    loader.style.transition = "opacity 0.5s ease";
    loader.style.opacity = "0";
    setTimeout(() => { loader.style.display = "none"; }, 500);
  }

  data = data.data || data;
  plan = plan || "free";

  if (!data || typeof data !== "object") { showError("Invalid profile data received"); return; }
  if (data.status === "error") { showError(data?.message || "Profile data could not be loaded"); return; }
  if (!data.Name) { showError("Invalid profile data: Name is required"); return; }
  if (data?.Status && data.Status !== "Active") { showError("This profile is currently inactive"); return; }

  try {
    const container = document.querySelector(".card-container");
    container.style.display = "block";

    const isIdView = window.location.hash.startsWith("id_");

    const profileData = {
      name: data.Name || "User",
      link: data.Link || "tccards",
      id: data.ID || "",
      tagline: data.Tagline || "",
      profilePic: data["Profile Picture URL"] || CONFIG.defaultProfilePic,
      socialLinks: data["Social Links"] || "",
      email: data.Email || "",
      phone: data.Phone || "",
      address: data.Address || "",
      selectedStyle: data["Selected Style"] || "",
      backgroundImage: data["Background Image"] || "",
    };

    const shareUrl = isIdView
      ? `https://card.tccards.tn/id_${profileData.id}`
      : `https://card.tccards.tn/@${escapeHtml(profileData.link)}`;

    updateMetaTags(profileData, isIdView);

    // ── Background + theme resolution ──────────────────────────
    const { background, theme: cardTheme, isImage } = resolveBackground(
      profileData.selectedStyle,
      profileData.backgroundImage
    );

    document.body.style.background = background;
    document.body.style.backgroundSize = isImage ? 'cover' : 'auto';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';

    // ── Theme-dependent glassmorphism ──────────────────────────
    const cardBg     = cardTheme === 'light' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(17, 24, 39, 0.85)';
    const cardBorder = cardTheme === 'light' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)';
    const nameBg     = cardTheme === 'light' ? 'bg-white/30' : 'bg-gray-800';
    const nameText   = cardTheme === 'light' ? 'text-gray-900' : 'text-white';
    const taglineText = cardTheme === 'light' ? 'text-gray-800' : 'text-gray-300';
    const buttonBg   = cardTheme === 'light' ? 'bg-white/30 hover:bg-white/50' : 'bg-gray-800 hover:bg-gray-700';
    const shareIconBg = cardTheme === 'light' ? 'bg-white/30 text-gray-800' : 'bg-gray-800 text-gray-300';
    const dividerColor = cardTheme === 'light' ? 'border-white/30' : 'border-white/10';

    container.innerHTML = `
      <div class="w-full container max-w-md p-6 md:p-24 rounded-xl shadow-2xl mx-auto"
           style="background: ${cardBg}; backdrop-filter: blur(20px); border: 1px solid ${cardBorder}; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.4), 0 10px 10px -5px rgba(0,0,0,0.2);">
        <div class="flex justify-end mb-0 top-right" onclick="showShareOptions('${shareUrl}')">
          <div class="w-8 h-8 ${shareIconBg} rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
            <i class="fas fa-share-alt"></i>
          </div>
        </div>
        <div class="flex flex-col items-center">
          <img src="${escapeHtml(profileData.profilePic)}" class="w-32 h-32 bg-gray-800 rounded-full mb-4 profile-picture" style="box-shadow: 0 0 0 4px ${cardTheme === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'};" alt="${escapeHtml(profileData.name)}'s profile">

          <div class="w-full h-12 ${nameBg} rounded mb-2 flex items-center justify-center shadow-lg">
            <h1 class="text-2xl font-bold ${nameText}">${escapeHtml(profileData.name)}</h1>
          </div>

          ${profileData.tagline ? `<p class="tagline-text ${taglineText}" style="text-shadow: 0 2px 4px rgba(0,0,0,0.8);">${escapeHtml(profileData.tagline)}</p>` : ""}

          <div class="w-full bg-transparent mb-4">
            ${renderSocialLinks(profileData.socialLinks)}
          </div>

          ${profileData.email || profileData.phone || profileData.address
            ? `<div class="w-48 h-12 ${buttonBg} rounded mb-4 flex items-center justify-center shadow-lg">
              <button class="contact-btn ${cardTheme === 'light' ? 'text-gray-900' : ''}" onclick="showContactDetails(${escapeHtml(
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

        <div class="mt-8 pt-4 border-t ${dividerColor}">
          <footer class="space-y-2 text-center">
            <div class="w-full py-2 rounded-lg ${cardTheme === 'light' ? 'bg-white/20' : 'bg-white/5'} backdrop-blur-md border ${dividerColor}">
              <a href="https://tccards.tn" class="${cardTheme === 'light' ? 'text-gray-800 hover:text-gray-900' : 'text-gray-300 hover:text-white'} text-sm transition-colors">
                Powered by &copy; Total Connect ${new Date().getFullYear()}
              </a>
            </div>
            <div class="w-1/2 mx-auto py-2 rounded-lg ${cardTheme === 'light' ? 'bg-gray-200' : 'bg-gray-900'} shadow-lg border ${dividerColor}">
              <a href="https://plans.tccards.tn" target="_blank" class="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
                Get your Card
              </a>
            </div>
          </footer>
        </div>
      </div>
    `;

    console.log("Profile loaded");
  } catch (error) {
    console.error("Profile rendering error:", error);
    showError("Error displaying profile");
  }
}

function updateMetaTags(profileData, isIdView) {
  const profileUrl = isIdView
    ? `https://card.tccards.tn/id_${profileData.id}`
    : `https://card.tccards.tn/@${profileData.link}`;

  const title = `${profileData.name} | Total Connect NFC`;
  const description = profileData.tagline
    ? `${profileData.tagline} — View ${profileData.name}'s digital business card.`
    : `View and save ${profileData.name}'s digital business card, powered by Total Connect NFC.`;
  const image = profileData.profilePic || "https://tccards.tn/Assets/150.png";

  document.title = title;

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

  setMeta('meta[name="description"]', "content", description);

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = profileUrl;

  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[property="og:image"]', "content", image);
  setMeta('meta[property="og:url"]', "content", profileUrl);

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
        return { href: url.href, display: domain, domain };
      } catch (e) {
        return null;
      }
    })
    .filter((l) => l !== null);

  if (!validLinks.length) return "";

  return `
    <div class="social-links">
      ${validLinks.map((link) => `
        <a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer" class="social-link-item">
          <img src="https://icons.duckduckgo.com/ip3/${encodeURIComponent(link.domain)}.ico" alt="" class="social-icon"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';" />
          <i class="fas fa-link social-icon-fallback" style="display:none;"></i>
          <span>${escapeHtml(link.display)}</span>
        </a>
      `).join("")}
    </div>
  `;
}

// ========== vCard & Contact Helpers ==========
function generateVCard(contact) {
  const fullName = contact.name || 'Contact';
  const email = contact.email || '';
  const phone = contact.phone || '';
  const address = contact.address || '';
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

async function shareVCardFile(vcardString, fileName) {
  if (navigator.share && navigator.canShare) {
    try {
      const blob = new Blob([vcardString], { type: 'text/vcard;charset=utf-8' });
      const file = new File([blob], fileName, { type: 'text/vcard' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return true;
      }
    } catch (err) {
      console.warn('Web Share failed, falling back to download:', err);
    }
  }
  return false;
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
    if (!contact || typeof contact !== 'object') throw new Error('Invalid contact data');

    const contactHtml = `
      <div class="contact-details">
        <h3 class="contact-name">${escapeHtml(contact.name)}</h3>
        <div class="contact-detail-list">
          ${contact.email ? `<div class="contact-detail-item"><i class="fas fa-envelope"></i><a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a></div>` : ''}
          ${contact.phone ? `<div class="contact-detail-item"><i class="fas fa-phone"></i><a href="tel:${escapeHtml(contact.phone)}">${escapeHtml(contact.phone)}</a></div>` : ''}
          ${contact.address ? `<div class="contact-detail-item"><i class="fas fa-map-marker-alt"></i><a href="https://maps.google.com/?q=${encodeURIComponent(contact.address)}" target="_blank">${escapeHtml(contact.address)}</a></div>` : ''}
        </div>
        <div class="contact-actions-row">
          <button class="contact-action-btn copy-btn" id="copyDetailsBtn"><i class="fas fa-copy"></i> Copy Details</button>
          <button class="contact-action-btn save-btn" id="saveContactBtn"><i class="fas fa-save"></i> Save Contact</button>
        </div>
      </div>
    `;

    await Swal.fire({
      title: 'Contact Details',
      html: contactHtml,
      background: '#1a2332',
      color: '#fff',
      showCloseButton: true,
      closeButtonHtml: '✕',
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      customClass: { closeButton: 'swal-close-button-custom', popup: 'swal-popup-custom' },
      didOpen: (modal) => {
        modal.querySelector('#copyDetailsBtn')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          const copied = await copyContactDetails(contact);
          if (copied) {
            Swal.fire({ icon: 'success', title: 'Copied!', toast: true, position: 'center', showConfirmButton: false, timer: 1500, timerProgressBar: true, background: '#1a1a1a', color: '#fff' });
          } else {
            Swal.fire({ icon: 'error', title: 'Copy failed', text: 'Please allow clipboard access.', toast: true, position: 'center', showConfirmButton: false, timer: 2000 });
          }
        });

        modal.querySelector('#saveContactBtn')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            const vcard = generateVCard(contact);
            const fileName = `${contact.name || 'contact'}.vcf`;
            const shared = await shareVCardFile(vcard, fileName);
            if (shared) {
              Swal.fire({ icon: 'success', title: 'Contact Shared!', text: 'Use the share sheet to add to your contacts.', background: '#1a1a1a', color: '#fff', confirmButtonColor: '#2563eb' });
              return;
            }
            downloadVCard(vcard, fileName);
            Swal.fire({ icon: 'success', title: 'Contact Saved!', text: 'The vCard file has been downloaded.', toast: true, position: 'center', showConfirmButton: false, timer: 2000, timerProgressBar: true, background: '#1a1a1a', color: '#fff' });
          } catch (err) {
            Swal.fire({ icon: 'error', title: 'Save failed', text: 'Could not save contact. Please try again.', background: '#1a1a1a', color: '#fff' });
          }
        });
      },
    });
  } catch (error) {
    console.error('Error in showContactDetails:', error);
    await Swal.fire({ icon: 'error', title: 'Error', text: 'Could not display contact details', background: '#1a1a1a', color: '#fff' });
  }
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

window.showContactDetails = showContactDetails;
window.showShareOptions = showShareOptions;

async function showShareOptions(link) {
  try {
    if (navigator.share) {
      await navigator.share({ title: "Check out this profile", text: "View my digital business card", url: link });
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
        customClass: { confirmButton: "swal-confirm-button", cancelButton: "swal-cancel-button" },
      });
    }
  } catch (error) {
    console.error("Error sharing:", error);
  }
}