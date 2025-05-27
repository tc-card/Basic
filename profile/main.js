const CONFIG = {
  defaultBg: "linear-gradient(145deg, #1e1b4b, #312e81, #1e1b4b)",
  defaultProfilePic: "https://tccards.tn/Assets/default.png",
  databases: [
    {
      id: 'AKfycbzPv8Rr4jM6Fcyjm6uelUtqw2hHLCFWYhXJlt6nWTIKaqUL_9j_41rwzhFGMlkF2nrG',
      plan: 'basic'
    }
  ],
  styles: {
    corporateGradient: { 
      background: 'linear-gradient(145deg, rgb(9, 9, 11), rgb(24, 24, 27), rgb(9, 9, 11))',
      textGradient: 'linear-gradient(90deg, #ffffff, #d1d5db)',
      buttonGradient: 'linear-gradient(135deg, #4b5563, #6b7280)'
    },
    oceanGradient: { 
      background: 'linear-gradient(145deg, rgb(2, 6, 23), rgb(15, 23, 42), rgb(2, 6, 23))',
      textGradient: 'linear-gradient(90deg, #93c5fd, #bfdbfe)',
      buttonGradient: 'linear-gradient(135deg, #1e40af, #3b82f6)'
    },
    royalGradient: {
      background: 'linear-gradient(145deg, #1e1b4b, #312e81, #1e1b4b)',
      textGradient: 'linear-gradient(90deg, #c7d2fe, #e0e7ff)',
      buttonGradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
    },
    midnightGradient: {
      background: 'linear-gradient(145deg, #0f172a, #1e293b, #0f172a)',
      textGradient: 'linear-gradient(90deg, #e2e8f0, #f1f5f9)',
      buttonGradient: 'linear-gradient(135deg, #475569, #64748b)'
    }
  }
};

document.addEventListener("DOMContentLoaded", function() {
  // Set initial background with smooth transition
  document.body.style.transition = 'background 0.8s ease';
  document.body.style.background = CONFIG.defaultBg;
  document.body.style.backgroundSize = "cover";
  
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
  const isIdLookup = hash.startsWith('id_');
  const identifier = isIdLookup ? hash.split('_')[1] : hash;
  
  // Show loading animation
  showLoader();
  
  // Start database search with retry logic
  searchDatabases(CONFIG.databases, identifier, isIdLookup);
});

// Enhanced database search with exponential backoff
async function searchDatabases(databases, identifier, isIdLookup, index = 0, retryCount = 0) {
  try {
    if (index >= databases.length) {
      showError("Profile not found in any database");
      return;
    }

    const db = databases[index];
    const param = isIdLookup ? 'id' : 'link';
    const url = `https://script.google.com/macros/s/${db.id}/exec?${param}=${encodeURIComponent(identifier)}`;
    
    const response = await fetchWithTimeout(url, {
      timeout: 5000 + (retryCount * 1000) // Increase timeout with each retry
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    
    if (data?.status === "error") {
      return searchDatabases(databases, identifier, isIdLookup, index + 1, 0);
    }
    
    if (data && typeof data === 'object') {
      handleProfileData(data);
    } else {
      searchDatabases(databases, identifier, isIdLookup, index + 1, 0);
    }
  } catch (error) {
    console.error("Database search error:", error);
    if (retryCount < 3) {
      // Exponential backoff before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
      return searchDatabases(databases, identifier, isIdLookup, index, retryCount + 1);
    } else {
      searchDatabases(databases, identifier, isIdLookup, index + 1, 0);
    }
  }
}

// Improved fetch with timeout and better error handling
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal  
    });
    clearTimeout(id);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

function showLoader() {
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.innerHTML = `
    <div class="loader-spinner"></div>
    <div class="loader-text">Loading profile...</div>
  `;
  document.body.appendChild(loader);
}

function hideLoader() {
  const loader = document.querySelector('.loader');
  if (loader) {
    loader.classList.add('fade-out');
    setTimeout(() => loader.remove(), 500);
  }
}

function handleProfileData(data) {
  try {
    // Hide loader with fade out effect
    hideLoader();
    
    // Normalize data structure
    data = data.data || data;

    if (!data || typeof data !== 'object') {
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
  container.style.display = 'block';
  
  // Prepare profile data with defaults
  const profileData = {
    name: data.Name || 'User',
    link: data.Link || 'tccards',
    tagline: data.Tagline || '',
    profilePic: data['Profile Picture URL'] || CONFIG.defaultProfilePic,
    form: data['Form'] || '',
    socialLinks: data['Social Links'] || '',
    email: data.Email || '',
    phone: data.Phone || '',
    address: data.Address || '',
    style: data['Selected Style'] || 'royalGradient',
    formSubmitUrl: data['Form Submit URL'] || 'https://script.google.com/macros/s/AKfycbxU8axs4Xduqc84jj_utLsi-pCxSEyw9exEO7PuNo940qQ1bJ4-NxREnUgVhdzS9plb/exec'
  };

  // Apply background style if available
  applyBackgroundStyle(profileData.style);

  // Create the profile card HTML
  container.innerHTML = createProfileCardHTML(profileData);
  
  // Add fade-in animation
  container.classList.add('fade-in-up');
  
  // Initialize image fallback
  initImageFallback();
  
  // Initialize form if present
  if (profileData.form) {
    initContactForm(profileData);
  }
}

function applyBackgroundStyle(selectedStyle) {
  if (!selectedStyle) return;

  const style = CONFIG.styles[selectedStyle] || CONFIG.styles.royalGradient;
  document.body.style.background = style.background;
  
  // Update text gradients if available
  const textElements = document.querySelectorAll('.gradient-text');
  textElements.forEach(el => {
    if (style.textGradient) {
      el.style.backgroundImage = style.textGradient;
    }
  });
}

function createProfileCardHTML(profileData) {
  const style = CONFIG.styles[profileData.style] || CONFIG.styles.royalGradient;
  
  return `
    <div class="profile-card">
      <button class="share-btn" onclick="showShareOptions('${escapeHtml(profileData.link)}')" aria-label="Share profile">
        <i class="fas fa-share-alt"></i>
      </button>
      
      <div class="profile-picture-container">
        <img src="${escapeHtml(profileData.profilePic)}" 
         class="profile-picture js-profile-image" 
         alt="${escapeHtml(profileData.name)}'s profile"
         data-fallback="${escapeHtml(CONFIG.defaultProfilePic)}">
        <div class="profile-picture-fallback"></div>
      </div>
      
      <h1 class="profile-name gradient-text">${escapeHtml(profileData.name)}</h1>
      ${profileData.tagline ? `<p class="profile-tagline">${escapeHtml(profileData.tagline)}</p>` : ''}

      ${renderSocialLinks(profileData.socialLinks)}
      
      ${(profileData.email || profileData.phone || profileData.address) ? 
        `<button class="contact-btn" onclick="showContactDetails(${escapeHtml(JSON.stringify({
          name: profileData.name,
          profilePic: profileData.profilePic,
          email: profileData.email,
          phone: profileData.phone,
          address: profileData.address,
          style: style.background
        }))})">
          <i class="fas fa-paper-plane"></i> Get in Touch
        </button>` : ''}

      ${profileData.form ? `
        <button class="contact-btn secondary" onclick="showContactForm()">
          <i class="fas fa-envelope"></i> Contact Form
        </button>
        <div class="form-container hidden">
          <form id="contactForm">
            <div class="form-group">
              <input type="text" name="name" placeholder="Your Name" class="form-input" required>
            </div>
            <div class="form-group">
              <input type="email" name="email" placeholder="Your Email" class="form-input" required>
            </div>
            <div class="form-group">
              <input type="text" name="subject" placeholder="Subject" class="form-input" required>
            </div>
            <div class="form-group">
              <textarea name="message" placeholder="Your Message" class="form-input" required></textarea>
            </div>
            <button type="submit" class="submit-btn">
              <i class="fas fa-paper-plane"></i> Send Message
            </button>
          </form>
        </div>
      ` : ''}

      <div class="profile-footer">
        <p>Powered by &copy; Total Connect ${new Date().getFullYear()}</p>
        <p><a href="https://get.tccards.tn" target="_blank" class="cta-link">Get Your Free Digital Profile</a></p>
      </div>
    </div>
  `;
}

function initImageFallback() {
  const profileImages = document.querySelectorAll('.js-profile-image');
  profileImages.forEach(img => {
    img.onerror = function() {
      this.src = this.dataset.fallback;
    };
    
    // Add loading animation
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.5s ease';
    
    img.onload = function() {
      this.style.opacity = '1';
    };
    
    // Show fallback if image doesn't load within 3 seconds
    setTimeout(() => {
      if (!img.complete || img.naturalWidth === 0) {
        img.src = img.dataset.fallback;
      }
    }, 3000);
  });
}

function initContactForm(profileData) {
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      handleFormSubmit(e, profileData);
    });
  }
}

async function handleFormSubmit(e, profileData) {
  const form = e.target;
  const formData = new FormData(form);
  const submitBtn = form.querySelector('button[type="submit"]');
  
  // Disable submit button during submission
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  
  try {
    // Add additional data to form
    formData.append('to', profileData.email);
    formData.append('profile', profileData.name);
    
    const response = await fetch(profileData.formSubmitUrl, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Form submission failed');
    
    const result = await response.json();
    
    if (result.status === 'success') {
      await Swal.fire({
        icon: 'success',
        title: 'Message Sent!',
        text: 'Your message has been sent successfully',
        background: '#1e1b4b',
        color: '#fff'
      });
      form.reset();
    } else {
      throw new Error(result.message || 'Form submission failed');
    }
  } catch (error) {
    console.error('Form submission error:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to send message. Please try again later.',
      background: '#1e1b4b',
      color: '#fff'
    });
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
  }
}

function showContactForm() {
  const formContainer = document.querySelector('.form-container');
  formContainer.classList.toggle('hidden');
}

function renderSocialLinks(links) {
  if (!links || typeof links !== 'string') return '';

  const platformIcons = {
    'facebook.com': 'fab fa-facebook-f',
    'twitter.com': 'fab fa-twitter', 
    'x.com': 'fab fa-x-twitter',
    'instagram.com': 'fab fa-instagram',
    'linkedin.com': 'fab fa-linkedin-in',
    'youtube.com': 'fab fa-youtube',
    'tiktok.com': 'fab fa-tiktok',
    'pinterest.com': 'fab fa-pinterest-p',
    'snapchat.com': 'fab fa-snapchat-ghost',
    'reddit.com': 'fab fa-reddit-alien',
    'discord.com': 'fab fa-discord',
    'twitch.tv': 'fab fa-twitch',
    'github.com': 'fab fa-github',
    'discord.gg': 'fab fa-discord',
    'cal.com': 'fas fa-calendar-alt',
    'calendly.com': 'fas fa-calendar-alt',
    'linktree.com': 'fas fa-link',
    'linktr.ee': 'fas fa-link',
    'tccards.tn': 'fas fa-id-card',
    'medium.com': 'fab fa-medium-m',
    'whatsapp.com': 'fab fa-whatsapp',
    'wa.me': 'fab fa-whatsapp',
    'dribbble.com': 'fab fa-dribbble',
    'behance.net': 'fab fa-behance',
    'telegram.org': 'fab fa-telegram-plane',
    't.me': 'fab fa-telegram-plane',
    'vimeo.com': 'fab fa-vimeo-v',
    'spotify.com': 'fab fa-spotify',
    'apple.com': 'fab fa-apple',
    'google.com': 'fab fa-google',
    'youtube-nocookie.com': 'fab fa-youtube',
    'soundcloud.com': 'fab fa-soundcloud',
    'paypal.com': 'fab fa-paypal',
    'github.io': 'fab fa-github',
    'stackoverflow.com': 'fab fa-stack-overflow',
    'quora.com': 'fab fa-quora'
  };

  const validLinks = links.split("\n")
    .map(link => {
      link = link.trim();
      if (!link) return null;
      
      try {
        if (!/^https?:\/\//i.test(link)) link = 'https://' + link;
        const url = new URL(link);
        const domain = url.hostname.replace(/^www\./, '');
        
        const iconClass = Object.keys(platformIcons).find(key => 
          domain.includes(key)
        ) ? platformIcons[Object.keys(platformIcons).find(key => domain.includes(key))] : 'fas fa-link';
        
        // Get platform name for display
        let displayName = domain.split('.')[0];
        if (domain === 'x.com') displayName = 'Twitter';
        if (domain === 'linkedin.com') displayName = 'LinkedIn';
        if (domain === 'instagram.com') displayName = 'Instagram';
        
        return {
          href: url.href,
          display: displayName,
          icon: iconClass,
          domain: domain
        };
      } catch (e) {
        return null;
      }
    })
    .filter(link => link !== null);

  if (!validLinks.length) return '';

  return `
    <div class="social-links">
      ${validLinks.map(link => `
        <a href="${escapeHtml(link.href)}" 
           target="_blank" 
           rel="noopener noreferrer" 
           class="social-link ${link.domain.split('.').join('-')}"
           aria-label="${escapeHtml(link.display)}">
          <i class="${link.icon}"></i>
          <span>${escapeHtml(link.display)}</span>
        </a>
      `).join('')}
    </div>
  `;
}

async function showContactDetails(contact) {
  try {
    if (!contact || typeof contact !== 'object') {
      throw new Error('Invalid contact data');
    }

    const contactHtml = `
      <div class="contact-modal">
        <div class="contact-header">
          <img src="${escapeHtml(contact.profilePic)}" 
               class="contact-avatar" 
               alt="${escapeHtml(contact.name)}" 
               onerror="this.src='${escapeHtml(CONFIG.defaultProfilePic)}'">
          <h3 class="contact-name">${escapeHtml(contact.name)}</h3>
        </div>
        <div class="contact-details">
          ${contact.email ? `
            <div class="contact-detail" onclick="copyToClipboard('${escapeHtml(contact.email)}', 'Email')">
              <div class="contact-icon">
                <i class="fas fa-envelope"></i>
              </div>
              <div class="contact-info">
                <a href="mailto:${escapeHtml(contact.email)}" class="contact-link">${escapeHtml(contact.email)}</a>
              </div>
            </div>` : ''}
          ${contact.phone ? `
            <div class="contact-detail" onclick="copyToClipboard('${escapeHtml(contact.phone)}', 'Phone')">
              <div class="contact-icon">
                <i class="fas fa-phone-alt"></i>
              </div>
              <div class="contact-info">
                <a href="tel:${escapeHtml(contact.phone)}" class="contact-link">${escapeHtml(contact.phone)}</a>
              </div>
            </div>` : ''}
          ${contact.address ? `
            <div class="contact-detail" onclick="copyToClipboard('${escapeHtml(contact.address)}', 'Address')">
              <div class="contact-icon">
                <i class="fas fa-map-marker-alt"></i>
              </div>
              <div class="contact-info">
                <a href="https://maps.google.com/?q=${encodeURIComponent(contact.address)}" 
                   target="_blank" 
                   class="contact-link">${escapeHtml(contact.address)}</a>
              </div>
            </div>` : ''}
        </div>
      </div>
    `;

    const result = await Swal.fire({
      title: 'Contact Details',
      html: contactHtml,
      background: contact.style || '#1e1b4b',
      showConfirmButton: true,
      confirmButtonText: 'Copy All',
      showCancelButton: true,
      cancelButtonText: 'Close',
      customClass: {
        confirmButton: 'swal-confirm-btn',
        cancelButton: 'swal-cancel-btn'
      },
      focusConfirm: false,
      allowOutsideClick: true
    });

    if (result.isConfirmed) {
      await copyContactDetails(contact);
    }

  } catch (error) {
    console.error('Error in showContactDetails:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Could not display contact details',
      background: '#1e1b4b',
      color: '#fff'
    });
  }
}

async function copyToClipboard(text, type) {
  try {
    await navigator.clipboard.writeText(text);
    Swal.fire({
      icon: 'success',
      title: `${type} Copied!`,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      background: '#1e1b4b',
      color: '#fff'
    });
  } catch (error) {
    console.error('Copy failed:', error);
  }
}

async function copyContactDetails(contact) {
  try {
    const contactText = [
      contact.name,
      contact.email && `Email: ${contact.email}`,
      contact.phone && `Phone: ${contact.phone}`,
      contact.address && `Address: ${contact.address}`
    ].filter(Boolean).join('\n\n');

    await navigator.clipboard.writeText(contactText);

    await Swal.fire({
      icon: 'success',
      title: 'Copied!',
      text: 'Contact details copied to clipboard',
      toast: true,
      position: 'bottom',
      showConfirmButton: false,
      timer: 2000,
      background: '#1e1b4b',
      color: '#fff'
    });
  } catch (error) {
    console.error('Copy failed:', error);
    throw new Error('Failed to copy contact details');
  }
}

function showShareOptions(link) {
  const shareUrl = `https://card.tccards.tn/@${link}`;
  const profileName = document.querySelector('.profile-name')?.textContent || 'User';
  const profileImage = document.querySelector('.profile-picture')?.src || CONFIG.defaultProfilePic;

  Swal.fire({
    title: 'Share Profile',
    html: `
      <div class="share-modal">
        <div class="share-profile-header">
          <img src="${profileImage}" 
               class="share-avatar" 
               alt="${profileName}" 
               onerror="this.src='${CONFIG.defaultProfilePic}'">
          <h3 class="share-profile-name">${profileName}</h3>
          <p class="share-profile-handle">@${link}</p>
        </div>
        
        <div class="share-link-container">
          <input type="text" 
                 value="${shareUrl}" 
                 id="share-link-input" 
                 class="share-link-input" 
                 readonly
                 aria-label="Profile share link">
          <button onclick="copyShareLink()" 
                  class="share-copy-btn"
                  aria-label="Copy link">
            <i class="fas fa-copy"></i>
          </button>
        </div>
        
        <div class="share-platforms">
          <button onclick="shareTo('facebook')" 
                  class="share-platform facebook"
                  aria-label="Share on Facebook">
            <i class="fab fa-facebook-f"></i>
          </button>
          <button onclick="shareTo('whatsapp')" 
                  class="share-platform whatsapp"
                  aria-label="Share on WhatsApp">
            <i class="fab fa-whatsapp"></i>
          </button>
          <button onclick="shareTo('linkedin')" 
                  class="share-platform linkedin"
                  aria-label="Share on LinkedIn">
            <i class="fab fa-linkedin-in"></i>
          </button>
          <button onclick="shareTo('telegram')" 
                  class="share-platform telegram"
                  aria-label="Share on Telegram">
            <i class="fab fa-telegram-plane"></i>
          </button>
          <button onclick="shareTo('twitter')" 
                  class="share-platform twitter"
                  aria-label="Share on Twitter">
            <i class="fab fa-twitter"></i>
          </button>
          <button onclick="shareTo('email')" 
                  class="share-platform email"
                  aria-label="Share via Email">
            <i class="fas fa-envelope"></i>
          </button>
        </div>
        
        <div class="share-cta">
          <a href="https://get.tccards.tn" 
             target="_blank" 
             class="share-cta-btn">
            Create Your Own Profile
          </a>
        </div>
      </div>
    `,
    showConfirmButton: false,
    showCloseButton: true,
    background: '#1e1b4b',
    width: '90%',
    maxWidth: '420px',
    customClass: {
      closeButton: 'share-close-btn'
    }
  });
}

function copyShareLink() {
  const input = document.getElementById('share-link-input');
  input.select();
  document.execCommand('copy');
  
  Swal.fire({
    title: 'Copied!',
    text: 'Link copied to clipboard',
    icon: 'success',
    toast: true,
    position: 'bottom',
    showConfirmButton: false,
    timer: 2000,
    background: '#1e1b4b',
    color: '#fff'
  });
}

function shareTo(platform) {
  const shareLink = document.getElementById('share-link-input').value;
  const profileName = document.querySelector('.profile-name')?.textContent || 'this profile';
  const shareText = `Check out ${profileName}'s digital profile: ${shareLink}`;
  
  let url = '';
  switch(platform) {
    case 'facebook':
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`;
      break;
    case 'whatsapp':
      url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      break;
    case 'linkedin':
      url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareLink)}&title=${encodeURIComponent('Digital Profile')}&summary=${encodeURIComponent(shareText)}`;
      break;
    case 'telegram':
      url = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareText)}`;
      break;
    case 'twitter':
      url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareLink)}`;
      break;
    case 'email':
      url = `mailto:?subject=${encodeURIComponent(`Check out ${profileName}'s profile`)}&body=${encodeURIComponent(shareText)}`;
      break;
  }
  
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showError(message) {
  hideLoader();
  
  const container = document.querySelector(".card-container") || document.body;
  container.innerHTML = `
    <div class="error-state fade-in-up">
      <div class="error-icon">
        <i class="fas fa-exclamation-circle"></i>
      </div>
      <h3 class="error-title">Oops!</h3>
      <p class="error-message">${escapeHtml(message)}</p>
      <p class="error-help">Please check the URL or try again later.</p>
      <div class="error-actions">
        <button onclick="window.location.href='https://tccards.tn'" class="error-btn home-btn">
          <i class="fas fa-home"></i> Return Home
        </button>
        <button onclick="window.location.reload()" class="error-btn refresh-btn">
          <i class="fas fa-sync-alt"></i> Try Again
        </button>
      </div>
    </div>
  `;
  
  container.style.opacity = '1';
  container.style.transform = 'translateY(0)';
}

// Initialize the app
function initApp() {
  // Create card container if it doesn't exist
  if (!document.querySelector('.card-container')) {
    const container = document.createElement('div');
    container.className = 'card-container';
    document.body.appendChild(container);
  }
}

// Start the app
initApp();