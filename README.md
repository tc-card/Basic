# Basic - Public Digital Business Card

![Status](https://img.shields.io/badge/Status-Live-brightgreen)
![Hosting](https://img.shields.io/badge/Hosting-GitHub%20Pages-blue)
![Architecture](https://img.shields.io/badge/Architecture-Cloudflare%20Workers-orange)

This is the public showcase repository for `card.tccards.tn`. It serves the static HTML, CSS, and JavaScript that renders the beautiful, SEO-optimized digital business cards for users.

---

## ✨ Features

- **Dynamic URL Routing:** Supports both `https://card.tccards.tn/@username` and `https://card.tccards.tn/id_<uuid>` formats.
- **SEO & Social Media Previews:** A Cloudflare Worker intercepts bot requests (WhatsApp, Twitter, Facebook, LinkedIn) and dynamically serves the correct Open Graph metadata for the user.
- **Dark Glassmorphism Card:** Ensures maximum text readability and a premium aesthetic, even against bright or complex user-uploaded background images.
- **Dynamic Gradients:** Supports named presets like `ocean`, `sunset`, `midnight`, `neon`, and `purple` fetched from the database.
- **Random Profile Discovery:** Visiting `https://card.tccards.tn/@Random-profile` or `https://card.tccards.tn/@random` automatically loads a random user profile from a curated list.
- **Contact & vCard Support:** Allows visitors to view contact details, download vCards, and copy contact information instantly.

---

## 🛠 Tech Stack

- **Frontend:** HTML5, Tailwind CSS, Pure Vanilla JavaScript
- **Backend Data:** Google Apps Script (`profile.gs`) and Google Sheets
- **Routing & SEO:** Cloudflare Worker
- **Hosting:** GitHub Pages (via GitHub Actions workflow)

---

## 📂 File Structure

```text
tc-card/Basic/
├── .github/
│   └── workflows/
│       └── static.yml        # GitHub Actions workflow for deployment
├── profile/                  # Main public profile card
│   ├── index.html
│   ├── main.js
│   └── style.css
├── profile.gs                # Google Apps Script backend (Data lookup & cache)
├── worker.js                 # Cloudflare Worker (Routing & Bot handling)
├── .redirects                # Redirects file (Netlify/Pages)
├── 404.html                  # Custom 404 error page
├── 504.html                  # Custom 504 error page
├── index.html                # Root landing (likely handles redirects)
└── README.md                 # This file
```

---

## 🚀 Setup & Deployment

### Step 1: Set up the Database (Google Sheets)
1. Create a Google Sheet and a sheet named `Form`.
2. Add the exact headers: `Timestamp`, `Name`, `Email`, `Link`, `Tagline`, `Phone`, `Address`, `Social Links`, `Style`, `Profile Picture`, `Form Email`, `ID`, `Status`.
3. Deploy `profile.gs` as a Web App (Execute as: Me, Access: Anyone).
4. Copy the deployment URL and update the `id` value inside `const CONFIG = {` in `profile/main.js`.

### Step 2: Set up Routing (Cloudflare Worker)
1. Create a new Worker in Cloudflare.
2. Copy `worker.js` into your worker.
3. Create a Route for `card.tccards.tn/*` (Proxied).
4. Ensure assets (CSS/JS) pass through to the correct `profile/` directory on GitHub Pages.

### Step 3: Host on GitHub Pages
1. Push all files to this repository.
2. The `.github/workflows/static.yml` will automatically deploy the site.
3. Ensure `card.tccards.tn` points to your GitHub Pages URL (via a CNAME record).

### Step 4: Handle Redirects
The `.redirects` file handles root URL redirects. For example, `/profile/@username` should route to the static `profile/index.html` if needed. Ensure your workflow or hosting provider respects these rules.

---
## 👥 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Commit your changes (`git commit -m 'Add your feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the **Proprietary Source Code License**. See the [LICENSE](LICENSE) file for details.

---

## 📞 Contact & Support

- **Company:** TC Cards
- **Website:** [tccards.tn](https://tccards.tn)
- **Live Demo:** [card.tccards.tn](https://card.tccards.tn/@random)

