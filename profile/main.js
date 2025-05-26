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
      textGradient: 'linear-gradient(90deg, #ffffff, #d1d5db)'
    },
    oceanGradient: { 
      background: 'linear-gradient(145deg, rgb(2, 6, 23), rgb(15, 23, 42), rgb(2, 6, 23))',
      textGradient: 'linear-gradient(90deg, #93c5fd, #bfdbfe)'
    },
    royalGradient: {
      background: 'linear-gradient(145deg, #1e1b4b, #312e81, #1e1b4b)',
      textGradient: 'linear-gradient(90deg, #c7d2fe, #e0e7ff)'
    }
  }
};

document.addEventListener("DOMContentLoaded", function() {
  // Set initial background
  document.body.style.background = CONFIG.defaultBg;
  
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
  
  searchDatabases(CONFIG.databases, identifier, isIdLookup);
});

async function searchDatabases(databases, identifier, isIdLookup, index = 0) {
  try {
    if (index >= databases.length) {
      showError("Profile not found in any database");
      return;
    }

    const db = databases[index];
    const param = isIdLookup ? 'id' : 'link';
    const url = `https://script.google.com/macros/s/${db.id}/exec?${param}=${encodeURIComponent(identifier)}`;
    
    const response = await fetchWithTimeout(url, {
      timeout: 5000
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    
    if (data?.status === "error") {
      return searchDatabases(databases, identifier, isIdLookup, index + 1);
    }
    
    if (data && typeof data === 'object') {
      handleProfileData(data);
    } else {
      searchDatabases(databases, identifier, isIdLookup, index + 1);
    }
  } catch (error) {
    console.error("Database search error:", error);
    searchDatabases(databases, identifier, isIdLookup, index + 1);
  }
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal  
  });
  clearTimeout(id);
  
  return response;
}

function handleProfileData(data) {
  try {
    // Hide loader
    const loader = document.querySelector('.loader');
    if (loader) loader.style.display = 'none';
    
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
    style: data['Selected Style'] || 'royalGradient'
  };

  // Apply background style if available
  applyBackgroundStyle(profileData.style);

  // Create the profile card HTML
  container.innerHTML = createProfileCardHTML(profileData);
  
  // Add fade-in animation
  container.classList.add('fade-in-up');
  container.style.opacity = '1';
  container.style.transform = 'translateY(0)';

  // Initialize form if present
  if (profileData.formType) {
    const form = container.querySelector('form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleFormSubmit(e, profileData.formType, profileData.email, profileData.formSubmitUrl);
      });
    }
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
    <div class="profile-card relative">
      <button class="share-btn" onclick="showShareOptions('${escapeHtml(profileData.link)}')">
        <i class="fas fa-share-alt"></i>
      </button>
      
      <img src="${escapeHtml(profileData.profilePic)}" 
       class="profile-picture" 
       alt="${escapeHtml(profileData.name)}'s profile"
       onerror="this.src='${escapeHtml(CONFIG.defaultProfilePic)}'">
      
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
          <i class="fas fa-paper-plane mr-2"></i> Get in Touch
        </button>` : ''}

      <div class="profile-footer">
        <p>Powered by &copy; Total Connect ${new Date().getFullYear()}</p>
        <p><a href="https://get.tccards.tn" target="_blank">Get Your Free Digital Profile</a></p>
      </div>
    </div>
  `;
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
        
        return {
          href: url.href,
          display: domain.split('.')[0],
          icon: iconClass
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
        <a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer" class="social-link">
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
          <img src="${escapeHtml(contact.profilePic)}" class="contact-avatar" alt="${escapeHtml(contact.name)}" onerror="this.src='${escapeHtml(CONFIG.defaultProfilePic)}'">
          <h3 class="contact-name">${escapeHtml(contact.name)}</h3>
        </div>
        <div class="contact-details">
          ${contact.email ? `
            <div class="contact-detail" onclick="navigator.clipboard.writeText('${escapeHtml(contact.email)}')">
              <div class="contact-icon">
                <i class="fas fa-envelope"></i>
              </div>
              <div class="contact-info">
                <a href="mailto:${escapeHtml(contact.email)}" class="text-white hover:underline">${escapeHtml(contact.email)}</a>
              </div>
            </div>` : ''}
          ${contact.phone ? `
            <div class="contact-detail" onclick="navigator.clipboard.writeText('${escapeHtml(contact.phone)}')">
              <div class="contact-icon">
                <i class="fas fa-phone-alt"></i>
              </div>
              <div class="contact-info">
                <a href="tel:${escapeHtml(contact.phone)}" class="text-white hover:underline">${escapeHtml(contact.phone)}</a>
              </div>
            </div>` : ''}
          ${contact.address ? `
            <div class="contact-detail" onclick="navigator.clipboard.writeText('${escapeHtml(contact.address)}')">
              <div class="contact-icon">
                <i class="fas fa-map-marker-alt"></i>
              </div>
              <div class="contact-info">
                <a href="https://maps.google.com/?q=${encodeURIComponent(contact.address)}" target="_blank" class="text-white hover:underline">${escapeHtml(contact.address)}</a>
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
        confirmButton: 'bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg',
        cancelButton: 'bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg'
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
      <div class="text-center p-6 max-w-md mx-auto bg-gray-900 rounded-xl shadow-lg overflow-hidden">
        <div class="flex flex-col items-center">
          <img src="${profileImage}" class="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-indigo-500/30 shadow-md" onerror="this.src='${CONFIG.defaultProfilePic}'">
          <h3 class="text-2xl font-bold text-white mb-2">${profileName}</h3>
          <p class="text-gray-300 mb-6 text-sm">Share this profile with your connections</p>
          
          <div class="w-full mb-6 relative">
            <input type="text" value="${shareUrl}" id="share-link-input" class="w-full bg-gray-800 text-white p-3 pr-12 rounded-lg outline-none border border-gray-700 focus:border-indigo-500 transition-all" readonly>
            <button onclick="copyShareLink()" class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-md transition-colors" title="Copy link">
              <i class="fas fa-copy"></i>
            </button>
          </div>
          
          <div class="grid grid-cols-4 gap-3 mb-6">
            <button onclick="shareTo('facebook')" class="w-12 h-12 rounded-full bg-[#1877f2] text-white flex items-center justify-center hover:scale-110 transition-transform" title="Share on Facebook">
              <i class="fab fa-facebook-f text-xl"></i>
            </button>
            <button onclick="shareTo('whatsapp')" class="w-12 h-12 rounded-full bg-[#25d366] text-white flex items-center justify-center hover:scale-110 transition-transform" title="Share on WhatsApp">
              <i class="fab fa-whatsapp text-xl"></i>
            </button>
            <button onclick="shareTo('linkedin')" class="w-12 h-12 rounded-full bg-[#0a66c2] text-white flex items-center justify-center hover:scale-110 transition-transform" title="Share on LinkedIn">
              <i class="fab fa-linkedin-in text-xl"></i>
            </button>
            <button onclick="shareTo('telegram')" class="w-12 h-12 rounded-full bg-[#0088cc] text-white flex items-center justify-center hover:scale-110 transition-transform" title="Share on Telegram">
              <i class="fab fa-telegram-plane text-xl"></i>
            </button>
          </div>
          
          <a href="https://get.tccards.tn" target="_blank" class="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium py-3 px-8 rounded-full hover:shadow-lg transition-all hover:scale-105">
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
      closeButton: 'text-gray-400 hover:text-white'
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
  const shareText = `Check out ${document.querySelector('.profile-name')?.textContent || 'this'}'s digital profile: ${shareLink}`;
  
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
  }
  
  window.open(url, '_blank', 'noopener,noreferrer');
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
  const container = document.querySelector(".card-container") || document.body;
  container.innerHTML = `
    <div class="error-state fade-in-up">
      <h3 class="error-title">Error</h3>
      <h3 class="error-message">${escapeHtml(message)}</h3>
      <p class="text-gray-400 text-sm">Please check the URL or try again later.</p>
      <button onclick="window.location.href='https://tccards.tn'" class="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg">
        Return Home
      </button>
    </div>
  `;
  
  // Remove loader
  const loader = document.querySelector('.loader');
  if (loader) loader.remove();
  
  // Show error
  container.style.opacity = '1';
  container.style.transform = 'translateY(0)';
}