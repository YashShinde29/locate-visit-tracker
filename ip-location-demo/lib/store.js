// Stores all visits in a single JSON file in Vercel Blob (free object storage).
// No database. At ~40 visits/month this stays far inside the free Hobby limits.
//
// Visits are stored in a private Blob store. The dashboard reads them through
// the server, gated by DASHBOARD_KEY.

import { put, get, list, del } from '@vercel/blob';

const PATHNAME = 'data/visits.json';
const MAX_KEPT = 1000; // safety cap so the file can't grow forever

async function findBlob() {
  const { blobs } = await list({ prefix: PATHNAME });
  return blobs.find((b) => b.pathname === PATHNAME) || null;
}

async function write(visits) {
  await put(PATHNAME, JSON.stringify(visits), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function readVisits() {
  const result = await get(PATHNAME, { access: 'private' });
  if (!result || result.statusCode !== 200) return [];
  try {
    const data = await new Response(result.stream).json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function addVisit(visit) {
  const visits = await readVisits();
  visits.unshift(visit); // newest first
  const capped = visits.slice(0, MAX_KEPT);
  await write(capped);
  return capped.length;
}

// Remove specific visits by their visitId. Returns the number remaining.
export async function deleteVisits(ids) {
  const set = new Set(ids);
  const visits = await readVisits();
  const remaining = visits.filter((v) => !set.has(v.visitId));
  await write(remaining);
  return remaining.length;
}

// Remove everything.
export async function clearVisits() {
  const found = await findBlob();
  if (found) await del(found.url);
}
