# Locate ? one public page and a private admin

## Addresses

- Public: `https://YOUR-PRODUCTION-DOMAIN/` ? share this same link every time.
- Admin: `https://YOUR-PRODUCTION-DOMAIN/admin` ? sign in with your existing `DASHBOARD_KEY`.
- Old `/dashboard` addresses redirect to `/admin`. Older `/visit` links still load the current article.

## Publish content

1. Open `/admin` and enter your admin key. It is kept in this browser tab's session storage until you sign out or close the tab.
2. Edit the title, category, introduction, article text, and optional Continue URL.
3. Use blank lines between paragraphs. Put `## ` at the start of a separate block to make a heading. HTML is displayed as plain text.
4. Click **Publish changes** and wait for confirmation.
5. Copy the public address shown above the editor. Anyone opening or refreshing that same address sees the published content. Already-open pages need refreshing.

Content updates do not require a GitHub push or Vercel redeploy. Code changes still do. Public content lives in `data/page.json` in your private Blob store; visitor records remain in `data/visits.json`. Removing visits does not delete your article. Simultaneous article saves use the last completed write.

## Existing Vercel project: update steps

1. Deploy the latest GitHub commit and wait for **Ready**.
2. Keep **Root Directory = ip-location-demo**, **Framework Preset = Other**, and no build command.
3. Keep the current **private Blob** store connected to Production. The existing `BLOB_READ_WRITE_TOKEN` (if configured) is reused. No extra store or database is needed.
4. Keep `DASHBOARD_KEY` in the Production environment. It is your admin sign-in key; both publishing and visit access are blocked without it.
5. Under Settings ? Deployment Protection, use **Standard Protection** if you want the production domain public. All Deployments can require Vercel login even on the public article. The application's admin key still protects private operations.
6. Optional: set `PUBLIC_SITE_URL` to your production origin, such as `https://example.com`, if you want to override Vercel's detected production domain. Do not include a path or key. Redeploy after changing environment variables.
7. Open `/admin`, sign in, publish a small edit, and check the public address in a signed-out browser. Confirm a visit appears after refreshing the admin visit list.

Use the production domain from Vercel's Domains settings, not a long deployment-specific URL. Never share your admin key. The public Copy button copies only the permanent public URL.

## Location and privacy

The public page includes a visible collection notice. It records approximate IP location and requests precise location through the browser's real permission prompt. Readers can decline and continue reading. Browsers may suppress automatic prompts or remember an earlier decision; an optional Share location button is available. An allowed location updates the existing visit.

## Development and checks

From the inner app directory, run `npm install`. Use `vercel dev` with a linked project for API routes; a plain static server cannot run the backend. Run `node --test tests/*.test.cjs` for automated checks. Live browser permission behavior and the actual Blob connection must be checked on your deployment.

The visit store is a low-traffic demo using one JSON file. Concurrent writes from different visitors can overwrite each other; use a transactional database before scaling to substantial traffic.
