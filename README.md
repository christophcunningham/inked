# Inked

A chronological RSS reader pulling from ~63 sources across wire services, broadcasters, investigative outlets, policy journals, science publications, and local press. No ads, no algorithms, no affiliations.

---

## What it is

Inked is a single HTML file that pulls live RSS feeds from 63 news sources and renders them as a clean chronological headline stream. Articles are cached locally for up to 3 days so content doesn't disappear as feeds roll over. Articles older than 10 months are filtered out globally.

It runs entirely in the browser. There is no backend, no database, no login. A Cloudflare Worker acts as a lightweight RSS proxy to handle cross-origin fetching.

---

## Sources

| Outlet | Category |
|---|---|
| AP News (via Bluesky) | Wire |
| Reuters (via Google News) | Wire |
| BBC | International Broadcast |
| BBC Science | Science |
| Al Jazeera | International Broadcast |
| Deutsche Welle | International Broadcast |
| France 24 | International Broadcast |
| Der Spiegel | European Press |
| El País | European Press |
| Guardian | Quality General |
| Global Voices | Citizen Journalism |
| South China Morning Post | Asia / China |
| The Japan Times | Japan |
| China Digital Times | China / Independent |
| The Economist | Policy / Analysis |
| Foreign Affairs | Policy / Analysis |
| Foreign Policy | Policy / Analysis |
| Financial Times | Business / Economics |
| Wall Street Journal (via Bluesky) | US Legacy |
| New York Times | US Legacy |
| NPR | US Public Radio |
| Politico | US Politics |
| The Hill | US Politics |
| The Bulwark | US Politics |
| The American Prospect | US Politics / Left |
| The Nation | Left / Opinion |
| The New Yorker | Long-form / Culture |
| Savage Minds | Culture / Politics |
| DiEM25 (via Bluesky) | European Left |
| Novara Media | Left / UK |
| Institute for the Study of War (via Bluesky) | Defense / Conflict |
| Kyiv Independent (via Bluesky) | Ukraine / War |
| Middle East Eye | Middle East |
| Arab News | Middle East |
| Tehran Times | Iran State Media |
| The Intercept | Investigative |
| ProPublica | Investigative |
| Drop Site | Investigative |
| Organized Crime and Corruption Reporting Project | Investigative |
| Bellingcat | Open-Source Investigation |
| Dawn | Pakistan |
| Ars Technica | Technology / Science |
| MIT Technology Review | Technology |
| New Scientist | Science |
| Quanta Magazine | Science / Physics |
| NASA | Space |
| Hacker News | Technology |
| 404 Media | Technology / Investigative |
| Rest of World | Technology / Global |
| Unusual Whales | Markets / Policy |
| CBC | Canadian Broadcast |
| Globe and Mail | Canadian Press |
| The Narwhal | Canadian Investigative |
| The Breach | Canadian Investigative |
| Hell Gate | NYC Local |
| The City | NYC Local |
| Latinoamérica21 | Latin America |
| The Hankyoreh | South Korea / Independent |
| Defense One | Defense / Policy |
| Daily Maverick | South Africa / Investigative |
| Sahara Reporters | Nigeria / Citizen Journalism |
| Mada Masr | Egypt / Independent |
| L'Orient Today | Lebanon |

Paywalled outlets show an **Archive** button linking to archive.ph. Outlets marked `••` support in-app full-text reading where RSS content is available.

Some sources (AP News, ISW, WSJ, DiEM25, Kyiv Independent) are fetched via Bluesky RSS feeds due to direct feed blocks on Cloudflare Worker IPs. The Worker extracts the original article URL from the post body automatically.

The Economist pulls from four section feeds (Leaders, International, Business, Science & Technology) but appears as a single source throughout the app.

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

## Features

**Feed tab** — Chronological headline stream across all sources. Filter to a single source using the chip bar at the top. Tap a headline to open the article. Outlets with full RSS text show a `••` indicator and an inline **Read** button. Paywalled outlets show an **Archive** button. Swipe right on any article to flag it for later.

**Images tab** — Continuous photo grid pulling images from all RSS sources. Configurable column density (1 / 3 / 5 / 9). Tap any image to reveal the caption and article link. Header and footer collapse to slim frosted-glass bars when scrolling.

**Sources page (Info)** — Full list of all sources with article counts, country flags, and geographic codes. Toggle individual sources on or off to exclude them from the feed and filter bar — preference is saved in localStorage. Use the **Select All / Deselect All** button to bulk toggle. Filter the list by theme using the footer chips: **Politics · Investigations · Tech & Science · Business · War**.

**Flagged** — Save articles for later by swiping right (mobile) or using the hover flag button (desktop). Access via the flag icon in the footer. Swipe left on a flagged article to remove it.

**Search** — Filter the feed by keyword across headlines and full-text articles. Tap the search icon or press `S` on desktop.

**Desktop keyboard shortcuts** —

| Key | Action |
|---|---|
| `F` | Feed |
| `G` | Images |
| `S` | Search |
| `⇧F` | Flagged |
| `,` | Info |

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

Multiple entries can share the same `id` to merge feeds under a single source chip (e.g. The Economist pulls from four section feeds but appears as one). The sources page and filter bar deduplicate by `id` automatically.

When adding a new source, also add its geo and theme metadata in two places:

```js
// SOURCE_GEO — flag emoji and short geo code shown on the Sources page
SOURCE_GEO['my_id'] = { flag: '🇺🇸', geo: 'US' };

// SOURCE_META — region and theme tags for Sources page filtering
// regions: americas | europe | middleeast | asia | global
// themes:  politics | investigations | techscience | business | war
SOURCE_META['my_id'] = { regions: ['americas'], themes: ['politics'] };
```

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

Source on/off preferences are stored separately in `localStorage` under `inked_disabled_sources` and persist across sessions.

---

## License

GPL-3.0 — see [LICENSE](LICENSE) for details.

---

*Designed and built by [C. Cunningham](https://github.com/christophcunningham), 2026.*
