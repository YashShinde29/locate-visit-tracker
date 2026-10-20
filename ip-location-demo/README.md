# Locate ? article visits and a private dashboard

The public home page and `/visit` show an Everyday Atlas article about the history of timekeeping. A visible privacy note explains visit collection. The page requests location through the browser's real permission prompt; reading and the optional Continue link work if permission is denied. Browsers may suppress automatic prompts, so an optional Share location button is also available.

Open `/dashboard?key=YOUR_SECRET` to create named article links and view visits. Set `DASHBOARD_KEY` in Vercel: visit access remains locked when it is missing or incorrect. Share only generated article links, never your dashboard URL.

Visits use private Vercel Blob storage. Allowing precise location updates the existing visit rather than adding another row. This demo uses one JSON file and is intended for low traffic; simultaneous writes from different visitors can overwrite one another.

## Features

- **SaaS-style responsive UI** — blue/slate theme, Inter font, works on phone, tablet, and desktop. A real data table on desktop; stacked cards on mobile.
- **Custom link names** — name each link ("Project A", "Client X") so visits are easy to tell apart.
- **Optional destination URL** — when creating a link you can add a URL; the opened page then shows a "Continue" button to it (never a silent redirect).
- **Summary cards** — live counts of links, saved visits, and selected entries.
- **Search, filter, sort** — search by name/location/IP, filter by link, sort newest/oldest.
- **Delete one** — per-entry Delete, with a confirmation dialog that names what's being removed.
- **Delete many** — tick checkboxes + "Delete selected", or "Delete all". Both confirm with scope first.
- **Expandable details** — full link URL, coordinates, IP, and device tucked into an expandable row.
- **Clear states** — friendly loading, empty, no-results, locked, and storage-error screens.
- **Copy / Maps** — copy an entry's full details, or open its exact point in Google Maps.
- **Optional alerts** — also ping a Discord/Slack webhook on each visit.

The UI loads the Inter font from Google Fonts (free, no key); everything else is self-contained. No build step, no CSS framework, no JS dependencies on the front end.

## Project structure

```
ip-location-demo/
├─ public/
│  ├─ index.html       # public history article
│  ├─ visit.html       # the page visitors open — detects location
│  ├─ dashboard.html   # link creation and private visit list
│  └─ style.css
├─ api/
│  ├─ geo.js           # reads IP location from Vercel's geo headers
│  ├─ report.js        # saves each visit to Blob (+ optional webhook)
│  └─ visits.js        # read / delete-some / delete-all (key-protected)
├─ lib/
│  ├─ store.js         # Blob read / add / delete / clear
│  └─ http.js          # JSON body helper
├─ vercel.json
├─ package.json
└─ README.md
```

---

# 1) Setup on a new computer

You only need this zip folder. Then:

1. **Install Node.js** (version 18 or newer) from https://nodejs.org if it isn't already installed.
   Check with:
   ```
   node -v
   ```
2. **Unzip** this project and open a terminal **inside the project folder**
   (the folder that contains `package.json`).
3. **Install dependencies:**
   ```
   npm install
   ```
   That's the only package to fetch (`@vercel/blob`). `node_modules` is created locally; you don't commit or zip it.
4. **(Optional) Run it locally:**
   ```
   npm install -g vercel     # one-time: installs the Vercel CLI
   vercel dev                # serves the site at http://localhost:3000
   ```
   Note: locally the IP lookup shows the server's location, not a real visitor's — that only works once deployed. Saving to Blob also only works once storage is connected (step 2 of hosting), so local runs are mainly for checking the pages render.

---

# 2) Host it on Vercel (free)

1. **Create a free account** at https://vercel.com (sign in with GitHub, GitLab, or email).
2. **Get the project to Vercel** — push it to a GitHub repo, then use **Add New → Project → Import** in Vercel. If the repository contains an outer folder named `ip-location-demo`, set **Root Directory** to `ip-location-demo`. Otherwise use `./`. The root must contain `package.json`, `api/`, and `public/`.
3. On the configure screen, set **Framework Preset = Other**. Leave build settings empty. Set a strong `DASHBOARD_KEY` environment variable for Production before clicking **Deploy**.
4. When it finishes you get a URL like `https://your-app.vercel.app`.
5. **Turn on storage (required for saving):**
   Project → **Storage** → **Create Storage** → **Blob** → choose **Private** and connect it to this project. The app requires a private store; a public store will not work with the storage code. Vercel adds the Blob credentials automatically. Then **redeploy once**
   (Deployments → latest → **Redeploy**) so the functions pick it up.
6. **Open your dashboard:**
   Open your dashboard as `https://your-app.vercel.app/dashboard?key=YOUR_SECRET`.
7. **(Optional) Live alerts:** add an env var `WEBHOOK_URL` = a Discord/Slack
   incoming webhook URL, then redeploy. Each visit is also posted there.

### Daily use

- Open your site → type a **custom name** → **Create link** → **Copy** → share it.
- Watch visits at **/dashboard?key=YOUR_SECRET**. Refresh the dashboard to load new visits.
- Deleting: per-entry **Delete**, or tick boxes + **Delete selected**, or **Delete all**. Each asks to confirm.

### Updating after you change files

- GitHub import: just `git push` — Vercel redeploys automatically.
- You can also run `vercel --prod` from the app directory after linking the project with the Vercel CLI.

---

## How detection works

- **Approximate (IP):** Vercel adds headers like `x-vercel-ip-city`; `api/geo.js` reads them. City-level at best. No key.
- **Precise (GPS):** the browser's Geolocation API. The visitor must tap **Allow** — the browser enforces this; there's no silent workaround.
- **Reverse geocoding & maps:** free, keyless (BigDataCloud + OpenStreetMap + Google Maps links).

## Free-tier notes

- Vercel Hobby is free with no expiry, but is **non-commercial** — fine for personal use. Verify current limits at vercel.com/pricing.
- Blob Hobby: ~1 GB storage, 2,000 operations/month, 10 GB transfer — monthly allowances that renew each month. This app uses a couple of operations per visit, so you're far under.
- Stored data has no expiry; it stays until you delete it.

## Please use it responsibly

Reading someone's location — even roughly — without telling them can violate
privacy laws (GDPR, CCPA, and others) and most platforms' terms. Keep the
on-page notice, use it with people who understand what the link does, don't track
anyone without consent, and clear old data periodically (now easy from the dashboard).

## Verify an update

### Sharing on WhatsApp

The dashboard generates `/visit` links using Vercel's production domain, even when you open the dashboard through a preview/deployment URL. You can override this by setting `PUBLIC_SITE_URL` to your full public HTTPS origin (for example, `https://your-domain.com`) in Vercel and redeploying. Do not include a path or dashboard key.

If visitors see a Vercel login screen, check Project Settings → Deployment Protection. Standard Protection leaves production domains public; All Deployments also protects the production domain. The dashboard's own `DASHBOARD_KEY` still protects visit data when the article is public. Create fresh links after deploying this update; old preview links are not automatically changed. Test a fresh article link in a signed-out browser.

Run all checks with `node --test tests/*.test.cjs`.

Run `node --test tests/article.test.cjs` from this app folder. After pushing to GitHub and waiting for Vercel to finish, open a generated link, try both Allow and Block in fresh browser permission states, and confirm the dashboard records a visit. Allowed location should update that visit. Confirm `/api/visits` without a key returns 401. Browser prompts cannot be forced after a visitor has already allowed or blocked permission.
