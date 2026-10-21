import { get, put } from '@vercel/blob';
import { readJsonBody } from '../lib/http.js';
import { defaultContent } from '../lib/default-content.js';

const pathname = 'data/page.json';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).json({ error: 'method_not_allowed' });
  if (req.method === 'PUT' && (!process.env.DASHBOARD_KEY || req.headers['x-dashboard-key'] !== process.env.DASHBOARD_KEY)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    if (req.method === 'GET') {
      const result = await get(pathname, { access: 'private', useCache: false });
      if (!result) return res.status(200).json(defaultContent);
      if (result.statusCode !== 200) throw new Error('Content unavailable');
      return res.status(200).json(await new Response(result.stream).json());
    }
    const body = await readJsonBody(req);
    const limits = { title: 160, intro: 1200, category: 100, body: 30000, destination: 2048 };
    const content = {};
    for (const [field, limit] of Object.entries(limits)) {
      if (typeof body[field] !== 'string' || body[field].length > limit) return res.status(400).json({ error: `Invalid ${field}` });
      content[field] = body[field].trim();
    }
    if (!content.title || !content.body) return res.status(400).json({ error: 'Title and article text are required.' });
    if (content.destination) {
      try {
        const url = new URL(content.destination);
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error();
      } catch { return res.status(400).json({ error: 'Use an http:// or https:// destination URL.' }); }
    }
    content.updatedAt = new Date().toISOString();
    await put(pathname, JSON.stringify(content), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
    return res.status(200).json({ ok: true, content });
  } catch {
    return res.status(503).json({ error: 'Content storage is unavailable. Check the private Blob connection.' });
  }
}
