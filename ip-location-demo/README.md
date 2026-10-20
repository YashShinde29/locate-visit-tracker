# Locate — a link that detects where it's opened

Deploy free on Vercel. Create a named link to share; when someone opens it, the
page shows an **approximate** location from their IP and asks **permission**
before reading anything precise. Every visit is saved to a private **dashboard**
where you can search, copy, open in Google Maps, and delete entries.

No traditional database. Storage is **Vercel Blob** (free object storage) — one
JSON file. At ~30–40 visits/month you stay far inside the free limits.

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
│  ├─ index.html       # create & copy a named link
│  ├─ visit.html       # the page visitors open — detects location
│  ├─ dashboard.html   # your private list (search / copy / maps / delete)
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
2. **Get the project to Vercel** — either way is fine:
   - **Drag-and-drop:** Vercel dashboard → **Add New → Project → Deploy** → drag the project folder in. *(Do not include `node_modules`.)*
   - **Or via GitHub:** push the folder to a repo, then **Add New → Project → Import** that repo.
3. On the configure screen, set **Framework Preset = Other**. Leave build settings empty. Click **Deploy**.
4. When it finishes you get a URL like `https://your-app.vercel.app`.
5. **Turn on storage (required for saving):**
   Project → **Storage** → **Create Database** → **Blob** → connect it to this project.
   This adds a `BLOB_READ_WRITE_TOKEN` automatically. Then **redeploy once**
   (Deployments → latest → **Redeploy**) so the functions pick it up.
6. **Lock your dashboard (recommended):**
   Project → **Settings → Environment Variables** → add
   `DASHBOARD_KEY` = any secret you choose → **Save** → **Redeploy**.
   Open your dashboard as `https://your-app.vercel.app/dashboard?key=YOUR_SECRET`.
7. **(Optional) Live alerts:** add an env var `WEBHOOK_URL` = a Discord/Slack
   incoming webhook URL, then redeploy. Each visit is also posted there.

### Daily use

- Open your site → type a **custom name** → **Create link** → **Copy** → share it.
- Watch visits at **/dashboard** (with your `?key=` if you set one).
- Deleting: per-entry **Delete**, or tick boxes + **Delete selected**, or **Delete all**. Each asks to confirm.

### Updating after you change files

- GitHub import: just `git push` — Vercel redeploys automatically.
- Drag-and-drop: drag the folder in again, or run `vercel --prod` from the CLI.

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
