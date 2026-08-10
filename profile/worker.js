export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const username = path.startsWith('/@') ? path.slice(2) : null;

    // --- Detect bot/crawler ---
    const ua = request.headers.get('user-agent') || '';
    const isBot = /bot|crawler|facebook|twitter|linkedin|whatsapp|slack|telegram|discord/i.test(ua);

    if (username) {
      // Humans → instant 302 redirect (no page load)
      if (!isBot) {
        return Response.redirect(`https://card.tccards.tn/#${username}`, 302);
      }

      // Bots → serve cached HTML with meta tags + your original loader
      const cacheKey = new Request(`https://cache.card.tccards.tn/${username}`, request);
      const cache = caches.default;
      let cached = await cache.match(cacheKey);
      if (cached) return cached;

      const apiUrl = `https://script.google.com/macros/s/AKfycbwKdG3ktzHcukFjVCxaMqn6Twyj_Qioj1yoQt5Dj5QmsZxE3wvLaaU4zFBOZbWJNGYX/exec?link=${username}`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const resp = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeout);
        const data = await resp.json();
        const profile = data.data || data;

        if (profile && profile.Name) {
          const title = `${profile.Name} | tccard`;
          const desc = profile.Tagline || `View ${profile.Name}'s digital business card.`;
          const image = profile['Profile Picture URL'] || 'https://tccards.tn/Assets/150.png';
          const html = buildBotHtml(title, desc, image, username);
          const response = new Response(html, {
            headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=3600' },
          });
          await cache.put(cacheKey, response.clone());
          return response;
        }
      } catch (_) {}

      // Fallback bot HTML
      const fallbackHtml = buildBotHtml(
        `${username} | tccard`,
        `Connect with ${username}`,
        'https://tccards.tn/Assets/150.png',
        username
      );
      const fallbackResponse = new Response(fallbackHtml, {
        headers: { 'Content-Type': 'text/html' },
      });
      await cache.put(cacheKey, fallbackResponse.clone());
      return fallbackResponse;
    }

    // All other requests (CSS, JS, /, 404) → pass through
    return fetch(request);
  },
};

function buildBotHtml(title, desc, image, username) {
  // Your original skeleton loader (copied from index.html + style.css)
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:url" content="https://card.tccards.tn/@${escapeHtml(username)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(desc)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="icon" href="https://tccards.tn/Assets/150.png" type="image/x-icon">
  <link rel="apple-touch-icon" sizes="180x180" href="https://tccards.tn/Assets/150.png">
  <link rel="icon" type="image/png" sizes="32x32" href="https://tccards.tn/Assets/150.png">
  <link rel="icon" type="image/png" sizes="16x16" href="https://tccards.tn/Assets/150.png">
  <link rel="shortcut icon" href="https://tccards.tn/Assets/150.png">
  <link rel="mask-icon" href="https://tccards.tn/Assets/150.png" color="#f0850aff">
  <link rel="manifest" href="https://tccards.tn/manifest.json">
  <style>
    /* Your original loader CSS */
    body {
      margin: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #0a0a0f;
      font-family: Arial, sans-serif;
    }
    .loader {
      text-align: center;
      padding: 2rem;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 1rem;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      position: relative;
      overflow: hidden;
      width: 400px;
    }
    .loader::after {
      content: "";
      position: absolute;
      top: 0;
      left: -150%;
      width: 100%;
      height: 100%;
      background: linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.10) 50%, transparent 100%);
      animation: skeleton-hover 0.8s infinite;
      pointer-events: none;
    }
    @keyframes skeleton-hover {
      0% { left: -150%; }
      100% { left: 150%; }
    }
    .skeleton-block {
      background: #1e293b;
      border-radius: 8px;
      margin: 0.5rem auto;
    }
    .skeleton-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #1e293b;
      margin: 0 auto 1rem;
    }
    .skeleton-line {
      height: 16px;
      width: 60%;
      background: #1e293b;
      border-radius: 4px;
      margin: 0.5rem auto;
    }
    .skeleton-line-half {
      width: 40%;
    }
    .skeleton-line-full {
      width: 80%;
    }
  </style>
</head>
<body>
  <div class="loader">
    <div class="skeleton-circle"></div>
    <div class="skeleton-line"></div>
    <div class="skeleton-line skeleton-line-half"></div>
    <div class="skeleton-line skeleton-line-full"></div>
    <div class="skeleton-line skeleton-line-full"></div>
    <div class="skeleton-line skeleton-line-full"></div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}