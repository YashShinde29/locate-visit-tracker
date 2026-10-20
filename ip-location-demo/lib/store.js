// Stores all visits in a single JSON file in Vercel Blob (free object storage).
// No database. At ~40 visits/month this stays far inside the free Hobby limits.
//
// The blob's URL is unguessable and is never sent to the browser — the dashboard
// reads data only through the server, gated by DASHBOARD_KEY.

import { put, list, del } from '@vercel/blob';

const PATHNAME = 'data/visits.json';
const MAX_KEPT = 1000; // safety cap so the file can't grow forever

async function findBlob() {
  const { blobs } = await list({ prefix: PATHNAME });
  return blobs.find((b) => b.pathname === PATHNAME) || null;
}

async function write(visits) {
  await put(PATHNAME, JSON.stringify(visits), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function readVisits() {
  const found = await findBlob();
  if (!found) return [];
  const res = await fetch(found.url, { cache: 'no-store' });
  if (!res.ok) return [];
  try {
    const data = await res.json();
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
