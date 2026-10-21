const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/article.js'), 'utf8');
const flush = () => new Promise((resolve) => setImmediate(resolve));

function page({ search = '', supported = true, save = true } = {}) {
  const elements = new Map();
  const events = {};
  const reports = [];
  let permission;
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, {
      hidden: true, disabled: false, textContent: '',
      addEventListener(type, fn) { this[type] = fn; },
    });
    return elements.get(id);
  };
  const sandbox = {
    document: { getElementById: element, querySelector: () => ({ textContent: 'Published article' }) },
    location: { search, href: `https://example.test/visit${search}` },
    navigator: {
      userAgent: 'test-browser',
      ...(supported ? { geolocation: {
        getCurrentPosition(allow, deny) { permission = { allow, deny }; },
      } } : {}),
    },
    window: { isSecureContext: true, addEventListener(type, fn) { events[type] = fn; } },
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
    URL, URLSearchParams, AbortSignal,
    setTimeout(fn) { fn(); },
    fetch: async (url, options) => {
      if (url === '/api/geo') return { ok: true, json: async () => ({ ip: '192.0.2.1', city: 'Test city' }) };
      reports.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ stored: save }) };
    },
  };
  vm.runInNewContext(source, sandbox);
  return { element, reports, start: () => events.load(), permission: () => permission };
}

test('Allow sends an update for the same visit and retains link metadata', async () => {
  const p = page({ search: '?id=test&label=History&to=https%3A%2F%2Fyoutube.com%2Fwatch' });
  p.start();
  await flush();
  assert.equal(p.reports.length, 1);
  assert.equal(p.reports[0].preciseGeo, null);
  assert.equal(p.element('destination').hidden, true);
  await p.permission().allow({ coords: { latitude: 18.5, longitude: 73.8, accuracy: 20 } });
  assert.equal(p.reports.length, 2);
  assert.equal(p.reports[1].visitId, p.reports[0].visitId);
  assert.equal(p.reports[1].label, 'History');
  assert.equal(p.reports[1].ip, '192.0.2.1');
  assert.equal(p.reports[1].preciseGeo.latitude, 18.5);
  assert.match(p.element('locationStatus').textContent, /shared with the site owner/);
});

test('Block saves only the approximate visit without requiring a destination', async () => {
  const p = page({ search: '?to=https://example.org' });
  p.start();
  p.permission().deny({ code: 1 });
  await flush();
  assert.equal(p.reports.length, 1);
  assert.equal(p.reports[0].preciseGeo, null);
  assert.equal(p.element('destination').hidden, true);
  assert.match(p.element('locationStatus').textContent, /not shared/);
});

test('Unsupported browsers still record an approximate visit', async () => {
  const p = page({ supported: false });
  p.start();
  await flush();
  assert.equal(p.reports.length, 1);
  assert.match(p.element('locationStatus').textContent, /unavailable/);
});

test('Unsafe destination protocols are not displayed', async () => {
  const p = page({ search: '?to=javascript:alert(1)' });
  await flush();
  assert.equal(p.element('destination').hidden, true);
});

test('Failed saves do not claim that precise location was shared', async () => {
  const p = page({ save: false });
  p.start();
  await flush();
  await p.permission().allow({ coords: { latitude: 18.5, longitude: 73.8, accuracy: 20 } });
  assert.match(p.element('locationStatus').textContent, /could not be saved/);
  assert.equal(p.element('shareLocation').disabled, false);
});

test('All inline scripts parse and page element IDs are unique', () => {
  for (const name of ['index.html', 'visit.html', 'dashboard.html', 'admin.html']) {
    const html = fs.readFileSync(path.join(root, 'public', name), 'utf8');
    for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
      new vm.Script(match[1], { filename: name });
    }
    // Ignore markup inside JavaScript templates when checking page IDs.
    const markup = html.replace(/<script[\s\S]*?<\/script>/g, '');
    const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, name);
  }
});

test('Storage updates a visit without increasing the visit count', async () => {
  let saved = [];
  const code = fs.readFileSync(path.join(root, 'lib/store.js'), 'utf8')
    .replace(/^import .+;$/m, '').replaceAll('export async function', 'async function');
  const context = vm.createContext({
    Response,
    get: async () => saved.length ? {
      statusCode: 200, stream: new Response(JSON.stringify(saved)).body,
    } : null,
    put: async (name, json, options) => {
      assert.equal(options.access, 'private');
      saved = JSON.parse(json);
    },
  });
  vm.runInContext(code, context);
  await context.addVisit({ visitId: 'one', time: 'arrival', preciseGeo: null });
  await context.addVisit({ visitId: 'one', time: 'later', preciseGeo: { latitude: 18.5 } });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].time, 'arrival');
  assert.equal(saved[0].preciseGeo.latitude, 18.5);
  await context.addVisit({ visitId: 'two', time: 'new visitor' });
  assert.equal(saved.length, 2);
});

test('Dashboard API rejects missing configuration and incorrect keys', async () => {
  const code = fs.readFileSync(path.join(root, 'api/visits.js'), 'utf8')
    .replace(/^import .+;$/gm, '').replace('export default async function', 'async function');
  const env = {};
  const context = vm.createContext({
    process: { env }, URL,
    readVisits: async () => [],
  });
  vm.runInContext(code, context);
  const request = async (query) => {
    const res = { status(code) { this.code = code; return this; }, json(data) { this.data = data; }, setHeader() {} };
    await context.handler({ method: 'GET', url: `/api/visits${query}`, headers: {} }, res);
    return res;
  };
  assert.equal((await request('')).code, 401);
  env.DASHBOARD_KEY = 'example-secret';
  assert.equal((await request('?key=wrong')).code, 401);
  assert.equal((await request('?key=example-secret')).code, 200);
});
