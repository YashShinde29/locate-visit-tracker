const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../api/content.js'), 'utf8')
  .replace(/^import .+;$/gm, '').replace('export default async function', 'async function');
function setup() {
  let saved;
  const env = { DASHBOARD_KEY: 'test-secret' };
  const context = vm.createContext({
    process: { env }, URL, Response, defaultContent: { title: 'Original' },
    readJsonBody: async (req) => req.body,
    get: async (name, options) => {
      assert.equal(name, 'data/page.json');
      assert.equal(options.useCache, false);
      return saved ? { statusCode: 200, stream: new Response(JSON.stringify(saved)).body } : null;
    },
    put: async (name, value, options) => {
      assert.equal(name, 'data/page.json');
      assert.equal(options.access, 'private');
      saved = JSON.parse(value);
    },
  });
  vm.runInContext(code, context);
  return { env, async request(method, body, key) {
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    await context.handler({ method, body, headers: { 'x-dashboard-key': key } }, res);
    return res;
  } };
}
const content = { title: 'New history', category: 'History', intro: 'Introduction', body: '## A heading\n\nA paragraph.', destination: 'https://example.com' };
test('Public reads return the initial article, then the latest published version', async () => {
  const app = setup();
  assert.equal((await app.request('GET')).data.title, 'Original');
  assert.equal((await app.request('PUT', content, 'test-secret')).code, 200);
  assert.equal((await app.request('GET')).data.title, content.title);
  await app.request('PUT', { ...content, title: 'Updated again' }, 'test-secret');
  assert.equal((await app.request('GET')).data.title, 'Updated again');
});
test('Missing or invalid admin credentials cannot publish', async () => {
  const app = setup();
  assert.equal((await app.request('PUT', content)).code, 401);
  assert.equal((await app.request('PUT', content, 'wrong')).code, 401);
  delete app.env.DASHBOARD_KEY;
  assert.equal((await app.request('PUT', content)).code, 401);
});
test('Invalid content and unsafe destinations are rejected without changing the page', async () => {
  const app = setup();
  for (const change of [{ title: '' }, { body: '' }, { title: 'a'.repeat(161) }, { destination: 'javascript:alert(1)' }, { destination: 'https://user:password@example.com' }]) {
    assert.equal((await app.request('PUT', { ...content, ...change }, 'test-secret')).code, 400);
  }
  assert.equal((await app.request('GET')).data.title, 'Original');
  assert.equal((await app.request('DELETE', {}, 'test-secret')).code, 405);
});
