# Basic - Public Digital Business Card

![Status](https://img.shields.io/badge/Status-Live-brightgreen)
![Hosting](https://img.shields.io/badge/Hosting-GitHub%20Pages-blue)
![Architecture](https://img.shields.io/badge/Architecture-Cloudflare%20Workers-orange)

This is the public showcase repository for `card.tccards.tn`. It serves the static HTML, CSS, and JavaScript that renders the beautiful, SEO-optimized digital business cards for users.

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

## 📄 License

This project is licensed under the **Proprietary Source Code License**. See the [LICENSE](LICENSE) file for details.

---

## 📞 Contact & Support

- **Company:** TC Cards
- **Website:** [tccards.tn](https://tccards.tn)
- **Live Demo:** [card.tccards.tn](https://card.tccards.tn/@random)

