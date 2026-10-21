const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const visitId = crypto.randomUUID();
let ipGeo = {};
let reporting = Promise.resolve();
let requesting = false;

function report(preciseGeo) {
  // Serialize this page's initial visit and optional location update.
  reporting = reporting.catch(() => {}).then(async () => {
    const response = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        visitId,
        id: params.get('id') || 'article',
        label: params.get('label') || document.querySelector('h1')?.textContent || 'Public article',
        ip: ipGeo.ip || '', ipGeo, preciseGeo,
        userAgent: navigator.userAgent,
        page: location.href,
        time: new Date().toISOString(),
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.stored) throw new Error('Visit could not be saved');
  });
  return reporting;
}

const initialVisit = (async () => {
  try {
    const response = await fetch('/api/geo', { signal: AbortSignal.timeout(8000) });
    if (response.ok) ipGeo = await response.json();
  } catch { /* Reading the article does not depend on the location service. */ }
  await window.pageContentReady;
  try { await report(null); }
  catch { $('locationStatus').textContent = 'Visit storage is currently unavailable. You can still read the article.'; }
})();

function requestLocation() {
  if (requesting) return;
  if (!navigator.geolocation || !window.isSecureContext) {
    $('locationStatus').textContent = 'Location sharing is unavailable in this browser. You can still read the article.';
    return;
  }
  requesting = true;
  $('shareLocation').disabled = true;
  $('locationStatus').textContent = 'Your browser may ask for location access. Choose Allow to share, or Block to keep reading without it.';
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    await initialVisit;
    try {
      await report({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
      $('locationStatus').textContent = 'Your location was shared with the site owner. You can revoke location permission in your browser settings.';
      $('shareLocation').textContent = 'Location shared';
    } catch {
      $('locationStatus').textContent = 'Your location could not be saved. You can try again.';
      $('shareLocation').disabled = false;
    }
    requesting = false;
  }, (error) => {
    requesting = false;
    $('shareLocation').disabled = false;
    $('locationStatus').textContent = error.code === 1
      ? 'Precise location was not shared. You can keep reading. To allow it later, use your browser’s site settings.'
      : 'Your device could not find your location. You can keep reading or try again.';
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

$('shareLocation').addEventListener('click', requestLocation);
// Let the article and disclosure render before asking through the real browser UI.
window.addEventListener('load', () => setTimeout(requestLocation, 1200), { once: true });
