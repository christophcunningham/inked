# Inked

A chronological RSS reader pulling from ~68 sources across wire services, broadcasters, investigative outlets, policy journals, science publications, and local press. No ads, no algorithms, no affiliations.

---

## What it is

Inked is a single HTML file that pulls live RSS feeds from 68 news sources and renders them as a clean chronological headline stream. Articles are cached locally for up to 3 days so content doesn't disappear as feeds roll over. Articles older than 10 months are filtered out globally.

It runs entirely in the browser. There is no backend, no database, no login. A Cloudflare Worker acts as a lightweight RSS proxy to handle cross-origin fetching.

---

## Sources

| Outlet | Category |
|---|---|
| AP News (via Bluesky) | Wire |
| Reuters (via Google News) | Wire |
| BBC | Wire |
| BBC Science | Wire · Tech & Science |
| Al Jazeera | Wire · War |
| Deutsche Welle | Wire |
| France 24 | Wire |
| CBC | Wire |
| PBS NewsHour | Wire · US Politics |
| Global Voices | World · Investigations |
| Semafor | World · Business |
| Bellingcat | World · Investigations · War |
| Foreign Policy | World · War |
| Foreign Affairs | World · War |
| The Economist | World · Business · Newspapers |
| Arab News | World |
| Middle East Eye | World · War |
| Tehran Times | World |
| Rest of World | World · Tech & Science · Business |
| Organized Crime and Corruption Reporting Project | World · Investigations · War |
| Institute for the Study of War (via Bluesky) | World · War |
| Kyiv Independent (via Bluesky) | World · War · Investigations |
| Defense One | World · War |
| Latinoamérica21 | World |
| Mada Masr | World · Investigations |
| L'Orient Today | World |
| DiEM25 (via Bluesky) | World |
| Novara Media | World |
| China Digital Times | World |
| Le Monde (English) | World · Newspapers |
| Politico | US Politics |
| The Hill | US Politics |
| The Bulwark | US Politics |
| The American Prospect | US Politics · Investigations |
| The Nation | US Politics |
| NPR | US Politics |
| Unusual Whales | US Politics · Business |
| Hell Gate | US Politics |
| The City | US Politics · Investigations |
| Savage Minds | US Politics |
| Drop Site | US Politics · Investigations · War |
| New York Times | US Politics · Newspapers |
| Guardian | Newspapers |
| Wall Street Journal (via Bluesky) | Newspapers · Business |
| Financial Times | Newspapers · Business |
| El País | Newspapers |
| Der Spiegel | Newspapers |
| Globe and Mail | Newspapers |
| The Straits Times | Newspapers · Business |
| The Hankyoreh | Newspapers |
| Dawn | Newspapers |
| Daily Maverick | Newspapers · Investigations |
| Sahara Reporters | Newspapers · Investigations |
| The Japan Times | Newspapers |
| South China Morning Post | Newspapers · Business |
| The New Yorker | Newspapers |
| ProPublica | Investigations |
| The Intercept | Investigations · War |
| The Narwhal | Investigations |
| The Breach | Investigations |
| 404 Media | Investigations · Tech & Science |
| Ars Technica | Tech & Science |
| MIT Technology Review | Tech & Science |
| New Scientist | Tech & Science |
| Quanta Magazine | Tech & Science |
| NASA | Tech & Science |
| Hacker News | Tech & Science |
| The Register | Tech & Science |

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

**Almanac tab** — A location-aware daily conditions page in the tradition of the farmers' almanac. Uses browser geolocation (with manual city override) and stores your last location in localStorage. Powered entirely by free, no-key APIs and client-side calculation. Sections include:

- **Severe Weather** — NWS active alerts for your location (US only), color-coded by severity with event-appropriate icons. Hidden when no alerts are active.
- **Transit** — Nearby subway, rail, and bikeshare agencies with direct links to their live status pages. Covers 60+ agencies across the US, UK, Europe, Japan, Australia, and Canada. Detected by proximity.
- **Airport Conditions** — FAA delay programs for all airports within 60 miles (US only). Normal status vs. Ground Delay / Ground Stop / Airspace Flow, with reason and delay window when available.
- **Weather** — Current conditions, temperature (°F/°C toggle, persisted), feels like, high/low, humidity, wind speed and direction, precipitation, UV index with category label, and AQI. Powered by Open-Meteo.
- **Sun** — Sunrise, sunset, solar noon, dawn, dusk, golden hour, and day length. Includes a Daylight Saving Time status row (active/inactive, with countdown when within 14 days). Powered by Open-Meteo daily parameters.
- **Moon** — Phase name with emoji glyph, illumination percentage, and cycle age. Calculated client-side from a known epoch using the 29.53-day synodic period.
- **Night Sky** — Approximate visibility of all 7 naked-eye planets (Mercury through Neptune) in the evening or morning sky, calculated using truncated VSOP87 orbital series (Jean Meeus). Also shows seasonal evening constellations, the Sun's current astronomical zodiacal position, and Milky Way core visibility status.
- **Upcoming** — Next moon phases, solstices, equinoxes, and major meteor shower peaks within the next 60 days. All calculated client-side.
- **Holidays & Observances** — Next 3 upcoming holidays across US Federal, global civic, UN observances, and culturally significant dates worldwide. Moveable feasts (Chinese New Year, Ramadan, Mardi Gras, Diwali, Easter) hardcoded through 2030.
- **Tides** — Today's high and low tide times and heights from the nearest NOAA CO-OPS station within 75 miles (US coastal only). Silently hidden inland.
- **Migration** — Seasonal bird migration status (warblers, shorebirds, raptors, waterfowl, and more) by latitude band, plus Ruby-throated Hummingbird, Monarch Butterfly, and coastal whale migration windows.
- **Land** — USDA hardiness zone estimate, last spring frost / first fall frost dates, current planting season status, and in-season vegetables and fruits for the current month (US only).

**Sources page (Info)** — Full list of all sources with article counts, country flags, and geographic codes. Toggle individual sources on or off to exclude them from the feed and filter bar — preference is saved in localStorage. Use the **Select All / Deselect All** button to bulk toggle. Filter the list by theme using the footer chips: **Wire · World · US Politics · Newspapers · Investigations · Tech & Science · Business · War**.

**Flagged** — Save articles for later by swiping right (mobile) or using the hover flag button (desktop). Access via the flag icon in the footer. Swipe left on a flagged article to remove it.

**Search** — Filter the feed by keyword across headlines and full-text articles. Tap the search icon or press `S` on desktop.

**Page color** — Three theme options selectable from the Sources page: **Light** (warm off-white, default), **Dark** (deep warm dark), and **Warm** (terracotta). Preference is saved in localStorage. The Images tab always renders in dark mode regardless of theme to preserve photo fidelity.

**Desktop keyboard shortcuts** —

| Key | Action |
|---|---|
| `F` | Feed |
| `G` | Images |
| `S` | Search |
| `A` | Almanac |
| `⇧F` | Flagged |
| `,` | Info / Sources |

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
// themes:  wire | world | uspolitics | newspapers | investigations | techscience | business | war
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

Source on/off preferences are stored separately in `localStorage` under `inked_disabled_sources` and persist across sessions. Almanac location is stored under `inked_almanac_location`. Temperature unit preference is stored under `inked_almanac_temp_unit`. Page color theme is stored under `inked_color_theme`.

---

## License

GPL-3.0 — see [LICENSE](LICENSE) for details.

---

*Designed and built by [C. Cunningham](https://github.com/christophcunningham), 2026.*
