(() => {
  const el = (id) => document.getElementById(id);
  const fields = { title: 'pageTitle', category: 'pageCategory', intro: 'pageIntro', body: 'pageBody', destination: 'pageDestination' };
  let initialized = false;
  let dirty = false;
  let publicUrl = '';
  el('loginForm').addEventListener('submit', (event) => {
    event.preventDefault();
    sessionStorage.setItem('adminKey', el('adminPassword').value);
    location.replace('/admin');
  });
  el('signOut').addEventListener('click', () => {
    sessionStorage.removeItem('adminKey');
    location.replace('/admin');
  });
  async function reload() {
    el('publishContent').disabled = true;
    el('editorStatus').textContent = 'Loading published content...';
    try {
      const response = await fetch('/api/content', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load content. Check Blob storage and try Reload.');
      const data = await response.json();
      for (const [field, id] of Object.entries(fields)) el(id).value = data[field] || '';
      dirty = false;
      el('publishContent').disabled = false;
      el('editorStatus').textContent = 'Ready to edit. Changes are public only after publishing.';
    } catch (error) { el('editorStatus').textContent = error.message; }
  }
  async function init() {
    if (initialized) return;
    initialized = true;
    el('loginForm').hidden = true;
    el('adminLogin').querySelector('h1').textContent = 'Admin';
    el('adminLogin').querySelector('p').textContent = 'Signed in. Manage your public page and visitor records below.';
    reload();
    try {
      const response = await fetch('/api/site');
      if (!response.ok) throw new Error();
      const config = await response.json();
      publicUrl = (config.publicOrigin || location.origin) + '/';
      el('publicUrl').href = publicUrl;
      el('publicUrl').textContent = publicUrl;
    } catch { el('publicUrl').textContent = 'Public address unavailable. Check PUBLIC_SITE_URL in Vercel.'; }
  }
  document.addEventListener('admin-authorized', init);
  if (!el('linkCreator').hidden) init();
  el('copyPublic').addEventListener('click', async () => {
    if (!publicUrl) return;
    try { await navigator.clipboard.writeText(publicUrl); el('editorStatus').textContent = 'Public link copied.'; }
    catch { el('editorStatus').textContent = 'Copy the public address shown above manually.'; }
  });
  el('reloadContent').addEventListener('click', () => {
    if (!dirty || confirm('Discard your unpublished edits and reload?')) reload();
  });
  el('editorForm').addEventListener('input', () => { dirty = true; });
  window.addEventListener('beforeunload', (event) => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  });
  el('editorForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    el('publishContent').disabled = true;
    el('editorStatus').textContent = 'Publishing...';
    try {
      const body = Object.fromEntries(Object.entries(fields).map(([field, id]) => [field, el(id).value]));
      const response = await fetch('/api/content', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-dashboard-key': sessionStorage.getItem('adminKey') || '' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? 'Session key rejected. Sign out and sign in again.' : result.error || 'Publishing failed.');
      dirty = false;
      el('editorStatus').textContent = 'Published. Visitors will see the new content when they open or refresh the same public link.';
    } catch (error) { el('editorStatus').textContent = error.message; }
    finally { el('publishContent').disabled = false; }
  });
})();
