# Inked

Built for those who want to stay on top of the news cycle without ads, algorithms, or noise. A clean, chronological feed pulling from reputable wire services, broadcasters, investigative outlets, policy journals, science publications, and local press — spanning a wide range of viewpoints and perspectives. Filter by source or read everything in order. No affiliations. No sponsorships. No agenda.

---

## What it is

Inked is a single HTML file that pulls live RSS feeds from 48 news sources and renders them as a clean chronological headline stream. Articles are cached locally for up to 3 days so content doesn't disappear as feeds roll over. Articles older than 10 months are filtered out globally.

It runs entirely in the browser. There is no backend, no database, no login. A Cloudflare Worker acts as a lightweight RSS proxy to handle cross-origin fetching.

---

## Sources

| Outlet | Category |
|---|---|
| AP (via Bluesky) | Wire |
| Reuters (via Google News) | Wire |
| BBC | International Broadcast |
| BBC Science | Science |
| Al Jazeera | International Broadcast |
| DW | International Broadcast |
| France 24 | International Broadcast |
| Der Spiegel | European Press |
| Guardian | Quality General |
| Global Voices | Citizen Journalism |
| South China Morning Post | Asia / China |
| The Economist | Policy / Analysis |
| Foreign Affairs | Policy / Analysis |
| Foreign Policy | Policy / Analysis |
| Financial Times | Business / Economics |
| ISW (via Bluesky) | Defense / Conflict |
| NYT | US Legacy |
| WSJ (via Bluesky) | US Legacy |
| Politico | US Politics |
| The Hill | US Politics |
| The Bulwark | US Politics |
| NPR | US Public Radio |
| The Intercept | Investigative |
| ProPublica | Investigative |
| Drop Site | Investigative |
| OCCRP | Investigative |
| Bellingcat | Open-Source Investigation |
| Middle East Eye | Middle East |
| The Nation | Left / Opinion |
| New Yorker | Long-form / Culture |
| Savage Minds | Culture / Politics |
| Ars Technica | Technology / Science |
| MIT Technology Review | Technology |
| New Scientist | Science |
| Quanta | Science / Physics |
| NASA | Space |
| Unusual Whales | Markets / Policy |
| CBC | Canadian Broadcast |
| Globe and Mail | Canadian Press |
| The Narwhal | Canadian Investigative |
| The Breach | Canadian Investigative |
| Hell Gate | NYC Local |
| The City | NYC Local |
| NYPD (via Google News) | NYC |

Paywalled outlets show an **Archive** button linking to archive.ph. Outlets marked `••` support in-app full-text reading where RSS content is available.

Some sources (AP, ISW, WSJ) are fetched via their Bluesky RSS feeds due to direct feed blocks on Cloudflare Worker IPs. The Worker extracts the original article URL from the post body automatically.

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

**`index.html`** — The entire front-end. Self-contained, no build step, no dependencies. Fetches all feeds in parallel on load, merges with a 3-day localStorage cache, deduplicates, sorts chronologically, and renders with lazy DOM loading (20 articles at a time as you scroll).

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

- Push `index.html`, `inked-worker.js`, and `README.md` to a GitHub repository
- Connect the repo to Cloudflare Pages (Workers & Pages → Create → Connect to Git)
- No build command needed — it's a static file
- Cloudflare will deploy to `your-project.pages.dev`

### 4. Add to Home Screen (iOS)

- Open the Pages URL in Safari
- Tap Share → Add to Home Screen
- Name it **Inked**
- Drop an `icon.png` (square, 512×512) in the repo root for a custom home screen icon

### 5. Add to Home Screen (Android)

- Open the Pages URL in Chrome
- Tap the browser menu → Add to Home Screen or Install App

---

## Adding or removing sources

All feeds are defined in the `FEEDS` array near the top of the script in `index.html`:

```js
{ id: 'unique_id', name: 'Display Name', url: 'https://feed.url/rss', home: 'https://outlet.com' }
```

Multiple entries can share the same `id` to merge feeds under a single source chip (e.g. Economist pulls from four section feeds but appears as one). The sources page and filter bar deduplicate by `id` automatically.

Outlets whose RSS includes full article text can be added to `FULL_TEXT_FEEDS`:

```js
const FULL_TEXT_FEEDS = new Set(['propublica', 'intercept', 'dropsite', ...]);
```

These will display a `••` indicator and a **Read** button that expands the article inline.

Paywalled outlets can be added to `PAYWALLED`:

```js
const PAYWALLED = new Set(['wsj', 'nyt', 'economist', 'ft', ...]);
```

---

## Caching

Articles are stored in `localStorage` for up to 3 days (2MB cap). This means:

- Articles load instantly on return visits from cache while fresh feeds fetch in the background
- Content doesn't disappear when it rolls off a feed's RSS window
- The cache trims automatically — oldest articles are removed first if the size limit is reached
- Articles older than 10 months are filtered out globally regardless of cache
- Cache is per-browser and per-device; clearing browser data will reset it

---

## License

GPL-3.0 — see [LICENSE](LICENSE) for details.

---

*Designed and built by [C. Cunningham](https://github.com/christophcunningham), 2026.*
