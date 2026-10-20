// Only public website configuration is returned; dashboard keys stay server-side.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const configured = process.env.PUBLIC_SITE_URL;
  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const address = configured || (productionDomain ? `https://${productionDomain}` : '');
  if (!address) {
    // Local development can use its own origin. A hosted deployment must not
    // accidentally generate links using a protected preview address.
    res.status(process.env.VERCEL ? 503 : 200).json(
      process.env.VERCEL ? { error: 'production_url_missing' } : { publicOrigin: null }
    );
    return;
  }
  try {
    const url = new URL(address);
    if (url.protocol !== 'https:' || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid origin');
    res.status(200).json({ publicOrigin: url.origin });
  } catch {
    res.status(503).json({ error: 'invalid_public_site_url' });
  }
}
