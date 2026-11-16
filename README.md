# Basic — Public Digital Business Cards

This repository serves the public profile cards at `card.tccards.tn`. The card page is static HTML, CSS, and JavaScript; it retrieves profile records from Google Apps Script and renders each card in the browser.

## How the pieces work together

1. The root `index.html` sends visitors to the profile page using the requested profile link.
2. `profile/main.js` reads the requested link and fetches that profile from the Apps Script endpoint.
3. `profile/profile.gs` looks up the matching row in the `Form` sheet and returns its profile fields.
4. `profile/renderer.js` builds the profile-card markup and visual variants from the returned data.
5. The Cloudflare Worker in `profile/worker.js` handles profile URLs for people and social crawlers. For crawlers, it returns HTML with profile-specific title, description, and image metadata to improve link previews and search presence; for visitors, it routes to the card page.

New profile submissions enter through the separate **Total Connect** project at `Total Connect/plans/basic/code.gs`. That script writes new records to the `Form` sheet; the public card backend reads the records from there. The submission script is not part of this repository.

## Structure

```text
Basic/
├── .github/workflows/static.yml   # Deploys the static site to GitHub Pages
├── profile/
│   ├── index.html                 # Public card page
│   ├── main.js                    # Profile lookup and page behavior
│   ├── renderer.js                # Card markup and visual templates
│   ├── style.css                  # Card page styles
│   ├── profile.gs                 # Apps Script profile lookup API
│   └── worker.js                  # Cloudflare Worker for profile routing and crawler metadata
├── index.html                     # Root route into the profile page
├── 404.html
├── 504.html
└── _redirects
```

GitHub Actions publishes the static files. The Cloudflare Worker is a separate runtime and must be deployed/configured with the profile domain routes for crawler-aware responses.

## License

This project is licensed under the Proprietary Source Code License. See [LICENSE](LICENSE).

## Contact

- Company: TC Cards
- Website: [tccards.tn](https://tccards.tn)
- Live demo: [card.tccards.tn/@random](https://card.tccards.tn/@random)
