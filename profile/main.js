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

const RANDOM_PROFILE_LINKS = [
  "Ali",
  "SkanDev",
  "yassine",
  "mehdigh",
  "Oussemabennour",
  "Paralingua",
  "Keeto",
  "houssem",
  "Emna",
  "Omar",
  "Mohamed",
  "Hamza",
  "Oussema",
  "the_cyber_corner",
  "Seddik",
  "Nour",
  "Ameni",
  "Chiheb",
];

// Tracks the active card theme so popups can match it.
let currentTheme = 'dark';

document.addEventListener("DOMContentLoaded", function () {
  // iOS Safari: prevent the heuristic "data detectors" from turning plain
  // contact text into auto-detected phone/email/address links. This is a
  // major trigger for Safari's "collecting client data" warning.
  const formatDetection = document.createElement("meta");
  formatDetection.name = "format-detection";
  formatDetection.content = "telephone=no, email=no, address=no";
  document.head.appendChild(formatDetection);

  document.body.style.background = CONFIG.defaultBg;
  document.body.style.backgroundSize = "cover";
  document.body.style.backdropFilter = "blur(5px)";

  let hash = window.location.hash.substring(1);
  if (!hash) {
    showError("No profile link provided");
    return;
  }

  const normalizedHash = hash.toLowerCase();
  if (normalizedHash === "random" || normalizedHash === "random-profile") {
    hash = RANDOM_PROFILE_LINKS[
      Math.floor(Math.random() * RANDOM_PROFILE_LINKS.length)
    ];
    window.history.replaceState(null, null, `https://card.tccards.tn/@${hash}`);
  }

  const isIdLookup = hash.startsWith("id_");
  const identifier = isIdLookup ? hash.slice(3) : hash;

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
      handleProfileData(data, undefined, isIdLookup);
    } else {
      showError("Invalid profile data");
    }
  } catch (error) {
    console.error("Profile search error:", error);
    showError("Failed to load profile");
  }
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 18000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(resource, { ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// ═══════════════════════════════════════════════════════════════
// CASE-INSENSITIVE SHEET FIELD ACCESSOR
// ═══════════════════════════════════════════════════════════════
function fieldKeyMatches(left, right) {
  const a = String(left).replace(/[^a-z0-9]/gi, '');
  const b = String(right).replace(/[^a-z0-9]/gi, '');
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    let ac = a.charCodeAt(i);
    let bc = b.charCodeAt(i);
    if (ac >= 65 && ac <= 90) ac += 32;
    if (bc >= 65 && bc <= 90) bc += 32;
    if (ac !== bc) return false;
  }
  return true;
}

function getField(data, ...candidates) {
  if (!data || typeof data !== 'object') return '';
  for (const candidate of candidates) {
    const key = Object.keys(data).find(name => fieldKeyMatches(name, candidate));
    if (key !== undefined && data[key] !== undefined && data[key] !== null) return data[key];
  }
  return '';
}

// ═══════════════════════════════════════════════════════════════
// BACKGROUND + THEME RESOLVER
// ═══════════════════════════════════════════════════════════════
function resolveBackground(selectedStyle) {
  const styleStr = typeof selectedStyle === 'string' ? selectedStyle.trim() : '';

  // No style selected → "default" morphed-glass theme on the default image.
  if (!styleStr) {
    return { background: CONFIG.defaultBg, theme: 'default', isImage: true };
  }

  let theme = 'dark';
  const themeMatch = styleStr.match(/\/(dark|light)\s*$/i);
  if (themeMatch) theme = /^light$/i.test(themeMatch[1]) ? 'light' : 'dark';

  // Image backgrounds are stored in the Style field as url('...')/theme.
  if (/^url\(/i.test(styleStr)) {
    const urlMatch = styleStr.match(/url\(["']?(.*?)["']?\)/i);
    const url = urlMatch?.[1] || '';
    if (url && /^https?:\/\//i.test(url)) {
      return { background: `url("${url}")`, theme, isImage: true };
    }
    return { background: CONFIG.defaultBg, theme: 'default', isImage: true };
  }

  if (/linear-gradient/i.test(styleStr)) {
    const gradient = themeMatch ? styleStr.slice(0, themeMatch.index).trim() : styleStr;
    return { background: gradient, theme, isImage: false };
  }

  return { background: CONFIG.defaultBg, theme: 'default', isImage: true };
}

// ═══════════════════════════════════════════════════════════════
// THEME-AWARE POPUP PALETTE
// ═══════════════════════════════════════════════════════════════
function getPopupTheme() {
  if (currentTheme === 'light') {
    return {
      background: '#f1f5f9',
      color: '#0f172a',
      toastBg: '#e2e8f0',
      toastColor: '#0f172a',
      isLight: true,
    };
  }
  if (currentTheme === 'default') {
    return {
      background: '#0f172a',
      color: '#ffffff',
      toastBg: '#0b1220',
      toastColor: '#ffffff',
      isLight: false,
    };
  }
  return {
    background: '#111827',
    color: '#ffffff',
    toastBg: '#0b1220',
    toastColor: '#ffffff',
    isLight: false,
  };
}

function handleProfileData(data, plan, isIdView = false) {
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

  const resolvedName = getField(data, 'Name');
  if (!resolvedName) { showError("Invalid profile data: Name is required"); return; }

  const resolvedStatus = String(getField(data, 'Status') || "").trim();
  if (resolvedStatus && !/^active$/i.test(resolvedStatus)) { showError("This profile is currently inactive"); return; }

  try {
    const container = document.querySelector(".card-container");
    container.style.display = "block";

    const profileData = {
      name:            getField(data, 'Name') || 'User',
      link:            getField(data, 'Link') || 'tccards',
      id:              getField(data, 'ID'),
      tagline:         getField(data, 'Tagline'),
      profilePic:      getField(data, 'Profile Picture URL', 'Profile Picture', 'Profile Pic') || CONFIG.defaultProfilePic,
      socialLinks:     normalizeSocialLinks(getField(data, 'Social Links', 'SocialLinks')),
      email:           getField(data, 'Email') || '',
      phone:           getField(data, 'Phone') || '',
      address:         getField(data, 'Address') || '',
      selectedStyle:   getField(data, 'Selected Style', 'Style') || '',
    };

    const shareUrl = isIdView
      ? `https://card.tccards.tn/id_${profileData.id}`
      : `https://card.tccards.tn/@${escapeHtml(profileData.link)}`;

    updateMetaTags(profileData, isIdView);

    // ── Background + theme resolution ──────────────────────────
    const { background, theme: cardTheme, isImage } = resolveBackground(profileData.selectedStyle);

    // Expose the theme so popups can match the card.
    currentTheme = cardTheme;
    document.body.dataset.theme = cardTheme;

    document.body.style.background = background;
    document.body.style.backgroundSize = isImage ? 'cover' : 'auto';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';

    // ── Theme-dependent glassmorphism ──────────────────────────
    // "default" gets a soft morphed-glass gradient so the card blends into
    // the default background instead of looking flat.
    const isLight = cardTheme === 'light';
    const cardBg = isLight
      ? 'rgba(255, 255, 255, 0.2)'
      : cardTheme === 'default'
        ? 'linear-gradient(145deg, rgba(17, 24, 39, 0.72), rgba(2, 6, 23, 0.55))'
        : 'rgba(17, 24, 39, 0.85)';
    const cardBorder  = isLight ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)';
    const nameBg      = isLight ? 'bg-white/30' : 'bg-gray-800';
    const nameText    = isLight ? 'text-gray-900' : 'text-white';
    const taglineText = isLight ? 'text-gray-800' : 'text-gray-300';
    const buttonBg    = isLight ? 'bg-white/30 hover:bg-white/50' : 'bg-gray-800 hover:bg-gray-700';
    const shareIconBg = isLight ? 'bg-white/30 text-gray-800' : 'bg-gray-800 text-gray-300';
    const dividerColor = isLight ? 'border-white/30' : 'border-white/10';

    container.innerHTML = `
      <div class="w-full container max-w-md p-6 md:p-24 rounded-xl shadow-2xl mx-auto"
           style="background: ${cardBg}; backdrop-filter: blur(20px); border: 1px solid ${cardBorder}; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.4), 0 10px 10px -5px rgba(0,0,0,0.2);">
        <div class="flex justify-end mb-0 top-right" onclick="showShareOptions('${shareUrl}')">
          <div class="w-8 h-8 ${shareIconBg} rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
            <i class="fas fa-share-alt"></i>
          </div>
        </div>
        <div class="flex flex-col items-center">
          <img src="${escapeHtml(profileData.profilePic)}" class="w-32 h-32 bg-gray-800 rounded-full mb-4 profile-picture" style="box-shadow: 0 0 0 4px ${isLight ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'};" alt="${escapeHtml(profileData.name)}'s profile">

          <div class="w-full h-12 ${nameBg} rounded mb-2 flex items-center justify-center shadow-lg">
            <h1 class="text-2xl font-bold ${nameText}">${escapeHtml(profileData.name)}</h1>
          </div>

          ${profileData.tagline ? `<p class="tagline-text ${taglineText}" style="text-shadow: 0 2px 4px rgba(0,0,0,0.8);">${escapeHtml(profileData.tagline)}</p>` : ""}

          <div class="w-full bg-transparent mb-4">
            ${renderSocialLinks(profileData.socialLinks)}
          </div>

          ${profileData.email || profileData.phone || profileData.address
            ? `<div class="w-48 h-12 ${buttonBg} rounded mb-4 flex items-center justify-center shadow-lg">
              <button class="contact-btn ${isLight ? 'text-gray-900' : ''}" onclick="showContactDetails(${escapeHtml(
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
            <div class="w-full py-2 rounded-lg ${isLight ? 'bg-white/20' : 'bg-white/5'} backdrop-blur-md border ${dividerColor}">
              <a href="https://tccards.tn" class="${isLight ? 'text-gray-800 hover:text-gray-900' : 'text-gray-300 hover:text-white'} text-sm transition-colors">
                Powered by &copy; Total Connect ${new Date().getFullYear()}
              </a>
            </div>
            <div class="w-1/2 mx-auto py-2 rounded-lg ${isLight ? 'bg-gray-200' : 'bg-gray-900'} shadow-lg border ${dividerColor}">
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

function normalizeSocialLinks(links) {
  if (Array.isArray(links)) return links.map(link => String(link).trim()).filter(Boolean).join("\n");
  if (typeof links !== "string") return "";
  return links.split(/\r?\n/).map(link => link.trim()).filter(Boolean).join("\n");
}

function renderSocialLinks(links) {
  links = normalizeSocialLinks(links);
  if (!links) return "";

  const validLinks = links
    .split(/\r?\n/)
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

    const popup = getPopupTheme();

    const contactHtml = `
      <div class="contact-details" x-apple-data-detectors="false">
        <h3 class="contact-name">${escapeHtml(contact.name)}</h3>
        <div class="contact-detail-list" x-apple-data-detectors="false">
          ${contact.email ? `<div class="contact-detail-item" x-apple-data-detectors="false"><i class="fas fa-envelope"></i><a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a></div>` : ''}
          ${contact.phone ? `<div class="contact-detail-item" x-apple-data-detectors="false"><i class="fas fa-phone"></i><a href="tel:${escapeHtml(contact.phone)}">${escapeHtml(contact.phone)}</a></div>` : ''}
          ${contact.address ? `<div class="contact-detail-item" x-apple-data-detectors="false"><i class="fas fa-map-marker-alt"></i><a href="https://maps.google.com/?q=${encodeURIComponent(contact.address)}" target="_blank" rel="noopener noreferrer">${escapeHtml(contact.address)}</a></div>` : ''}
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
      background: popup.background,
      color: popup.color,
      showCloseButton: true,
      closeButtonHtml: '✕',
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      customClass: {
        closeButton: 'swal-close-button-custom',
        popup: popup.isLight ? 'swal-theme-light' : 'swal-theme-dark',
      },
      didOpen: (modal) => {
        modal.querySelector('#copyDetailsBtn')?.addEventListener('click', async (e) => {
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
              background: popup.toastBg,
              color: popup.toastColor,
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
              background: popup.toastBg,
              color: popup.toastColor,
            });
          }
        });

        modal.querySelector('#saveContactBtn')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            const vcard = generateVCard(contact);
            const fileName = `${contact.name || 'contact'}.vcf`;
            const shared = await shareVCardFile(vcard, fileName);
            if (shared) {
              Swal.fire({
                icon: 'success',
                title: 'Contact Shared!',
                text: 'Use the share sheet to add to your contacts.',
                background: popup.background,
                color: popup.color,
                confirmButtonColor: '#2563eb',
              });
              return;
            }
            downloadVCard(vcard, fileName);
            Swal.fire({
              icon: 'success',
              title: 'Contact Saved!',
              text: 'The vCard file has been downloaded.',
              toast: true,
              position: 'center',
              showConfirmButton: false,
              timer: 2000,
              timerProgressBar: true,
              background: popup.toastBg,
              color: popup.toastColor,
            });
          } catch (err) {
            Swal.fire({
              icon: 'error',
              title: 'Save failed',
              text: 'Could not save contact. Please try again.',
              background: popup.background,
              color: popup.color,
            });
          }
        });
      },
    });
  } catch (error) {
    console.error('Error in showContactDetails:', error);
    const popup = getPopupTheme();
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Could not display contact details',
      background: popup.background,
      color: popup.color,
    });
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
      const popup = getPopupTheme();
      const shareHtml = `
        <div class="share-options">
          <h3>Share this profile</h3>
          <div class="share-links">
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}" target="_blank" rel="noopener noreferrer" class="share-link facebook">Facebook</a>
            <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}" target="_blank" rel="noopener noreferrer" class="share-link twitter">Twitter</a>
            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}" target="_blank" rel="noopener noreferrer" class="share-link linkedin">LinkedIn</a>
            <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(link)}" target="_blank" rel="noopener noreferrer" class="share-link whatsapp">WhatsApp</a>
          </div>
        </div>
      `;
      Swal.fire({
        title: "Share Profile",
        html: shareHtml,
        showCancelButton: true,
        cancelButtonText: "Close",
        background: popup.background,
        color: popup.color,
        customClass: {
          confirmButton: "swal-confirm-button",
          cancelButton: "swal-cancel-button",
          popup: popup.isLight ? 'swal-theme-light' : 'swal-theme-dark',
        },
      });
    }
  } catch (error) {
    console.error("Error sharing:", error);
  }
}