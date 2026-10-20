// GET    /api/visits?key=...                  → returns stored visits (newest first)
// DELETE /api/visits?key=...  body {ids:[...]} → deletes those visits
// DELETE /api/visits?key=...  (no ids)         → deletes ALL visits
//
// If DASHBOARD_KEY is set in your Vercel env vars, the key must match.
// If it isn't set, access stays locked until a key is configured.

import { readVisits, deleteVisits, clearVisits } from '../lib/store.js';
import { readJsonBody } from '../lib/http.js';

function authorized(req) {
  const required = process.env.DASHBOARD_KEY;
  if (!required) return false;
  const url = new URL(req.url, 'http://x');
  const key = url.searchParams.get('key') || req.headers['x-dashboard-key'] || '';
  return key === required;
}

export default async function handler(req, res) {
  if (!authorized(req)) {
    res.status(401).json({ ok: false, reason: 'unauthorized' });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      const visits = await readVisits();
      res.status(200).json({ ok: true, keyRequired: !!process.env.DASHBOARD_KEY, visits });
      return;
    }

    if (req.method === 'DELETE') {
      const body = await readJsonBody(req);
      if (Array.isArray(body.ids) && body.ids.length) {
        const remaining = await deleteVisits(body.ids);
        res.status(200).json({ ok: true, deleted: body.ids.length, remaining });
        return;
      }
      await clearVisits();
      res.status(200).json({ ok: true, cleared: true });
      return;
    }

    res.status(405).json({ ok: false, reason: 'method_not_allowed' });
  } catch (e) {
    res.status(200).json({ ok: false, reason: 'store_unavailable', visits: [] });
  }
}
