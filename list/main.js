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

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", function () {
// Check if hash exists
const hash = window.location.hash.substring(1);

if (!hash) {
  const currentURL = window.location.href;
  const baseProfileURL = "https://card.tccards.tn/profile/";

  // If current URL matches base profile URL exactly, redirect
  if (currentURL === baseProfileURL) {
    window.location.href = "https://card.tccards.tn/list/"; // Redirect to list page
    return;
  }

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
        </div>
    </center>
    `;
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