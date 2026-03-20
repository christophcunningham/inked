# Inked

> *When a story is set, it gets inked — committed to type, sent to press.*

A no-frills, ad-free RSS headline reader. Single-column, typographically considered, built to feel like reading a newspaper rather than scrolling a feed. Selected sources provide a center-to-left broad overview of the current state of the world.

No algorithm. No tracking. Just the news.

---

## What it is

Inked is a single HTML file that pulls live RSS feeds from 36 news sources — wire services, international broadcasters, investigative outlets, policy journals, science publications, and local NYC press — and renders them as a clean chronological headline stream.

It runs entirely in the browser. There is no backend, no database, no login. A Cloudflare Worker acts as a lightweight RSS proxy to handle cross-origin fetching.

---

## Sources

| Outlet | Category |
|---|---|
| AP | Wire |
| Reuters (via Google News) | Wire |
| BBC | International Broadcast |
| BBC Science | Science |
| Al Jazeera | International Broadcast |
| DW | International Broadcast |
| France 24 | International Broadcast |
| NHK World | International Broadcast |
| Der Spiegel | European Press |
| Guardian | Quality General |
| The Economist | Policy / Analysis |
| Foreign Affairs | Policy / Analysis |
| Foreign Policy | Policy / Analysis |
| ISW | Defense / Conflict |
| CNN | US Legacy |
| NYT | US Legacy |
| WSJ | US Legacy |
| Politico | US Politics |
| The Hill | US Politics |
| The Bulwark | US Politics |
| The Intercept | Investigative |
| ProPublica | Investigative |
| Drop Site | Investigative |
| OCCRP | Investigative |
| The Nation | Left / Opinion |
| New Yorker | Long-form / Culture |
| Ars Technica | Technology / Science |
| New Scientist | Science |
| Savage Minds | Culture / Politics |
| Unusual Whales | Markets / Policy |
| White House (via Google News) | Government |
| Hell Gate | NYC Local |
| The City | NYC Local |
| Notify NYC (via Google News) | NYC Emergency |
| NYPD (via Google News) | NYC Emergency |

Outlets marked `••` in the feed support in-app full-text reading where RSS content is available.

---

## Architecture

```
Browser (index.html)
    └── fetch(WORKER_URL?url=<rss_feed>)
            └── Cloudflare Worker (inked-worker.js)
                    └── fetch(<rss_feed>)
                            └── Parse RSS/Atom XML → JSON
                                    └── Return { status, items[] }
```

**`index.html`** — The entire front-end. Self-contained, no build step, no dependencies. Fetches all feeds in parallel on load, parses dates, deduplicates, sorts chronologically, and renders with lazy DOM loading (20 articles at a time as you scroll).

**`inked-worker.js`** — The Cloudflare Worker source code, included here for reference. This file is **not served from this repository** — it must be deployed separately via the Cloudflare Workers dashboard (see below). Cloudflare runs it on their infrastructure independently of this repo.

---

## Deployment

### 1. Deploy the Worker

The `inked-worker.js` file in this repo is the source code for the RSS proxy. You need to deploy it manually to Cloudflare Workers — it does not deploy automatically from GitHub.

- Go to [Cloudflare Workers](https://workers.cloudflare.com/) → Create → **Start with Hello World**
- Delete the placeholder code and paste the full contents of `inked-worker.js`
- Name it (e.g. `inked-worker`) and click **Deploy**
- Copy your Worker URL — it will look like `https://inked-worker.yourname.workers.dev`

> **Note:** Keep `inked-worker.js` in your repo as a reference copy, but it only runs when deployed through the Cloudflare Workers dashboard. Changes to the file in GitHub have no effect until you manually repaste and redeploy in the Workers editor.

### 2. Configure the HTML

Open `index.html` and update the Worker URL near the top of the script block:

```js
const WORKER_URL = 'https://inked-worker.yourname.workers.dev';
```

### 3. Deploy to Cloudflare Pages

- Push `index.html` and `README.md` to a GitHub repository
- Connect the repo to Cloudflare Pages (Workers & Pages → Create → Connect to Git)
- No build command needed — it's a static file
- Cloudflare will deploy to `your-project.pages.dev`

### 4. Add to Home Screen (iOS)

- Open the Pages URL in Safari
- Tap Share → Add to Home Screen
- Name it **Inked**
- Drop an `icon.png` (square, 512×512) in the repo root for a custom home screen icon

---

## Adding or removing sources

All feeds are defined in the `FEEDS` array near the top of the script in `index.html`:

```js
{ id: 'unique_id', name: 'Display Name', url: 'https://feed.url/rss', home: 'https://outlet.com' }
```

Outlets whose RSS includes full article text can be added to `FULL_TEXT_FEEDS`:

```js
const FULL_TEXT_FEEDS = new Set(['propublica', 'intercept', 'dropsite', ...]);
```

These will display a `••` indicator and a **Read** button that expands the article inline.

---

## License

GPL-3.0 — see [LICENSE](LICENSE) for details.

---

*Designed and built by [C. Cunningham](https://github.com/christophcunningham), 2026.*

