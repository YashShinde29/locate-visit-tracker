// Returns approximate location based on the visitor's IP address.
//
// In production on Vercel, the geo data comes from headers Vercel adds to
// every request automatically — no API key, no external call, no cost.
// On localhost (where those headers don't exist) it falls back to a free,
// keyless lookup so you can still test.

function isPrivateIp(ip) {
  return /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd)/.test(ip);
}

export default async function handler(req, res) {
  const h = req.headers;
  const ip =
    (h['x-forwarded-for'] || '').split(',')[0].trim() ||
    h['x-real-ip'] ||
    '';

  // 1) Preferred source: Vercel's built-in geo headers (free, instant).
  let geo = {
    source: 'vercel',
    ip,
    city: h['x-vercel-ip-city'] ? decodeURIComponent(h['x-vercel-ip-city']) : null,
    region: h['x-vercel-ip-country-region'] || null,
    country: h['x-vercel-ip-country'] || null,
    latitude: h['x-vercel-ip-latitude'] || null,
    longitude: h['x-vercel-ip-longitude'] || null,
    timezone: h['x-vercel-ip-timezone'] || null,
  };

  // 2) Fallback for local dev or if headers are missing.
  if (!geo.city && !geo.country) {
    try {
      const target = ip && !isPrivateIp(ip) ? `https://ipwho.is/${ip}` : 'https://ipwho.is/';
      const r = await fetch(target);
      const d = await r.json();
      if (d && d.success !== false) {
        geo = {
          source: 'ipwho.is',
          ip: d.ip || ip,
          city: d.city || null,
          region: d.region || null,
          country: d.country_code || d.country || null,
          latitude: d.latitude ?? null,
          longitude: d.longitude ?? null,
          timezone: (d.timezone && d.timezone.id) || null,
        };
      }
    } catch (e) {
      geo.error = 'ip_lookup_failed';
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(geo);
}
