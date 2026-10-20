const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../api/site.js'), 'utf8')
  .replace('export default function', 'function');

function request(env, method = 'GET') {
  const context = vm.createContext({ process: { env }, URL });
  vm.runInContext(code, context);
  const res = {
    setHeader() {},
    status(code) { this.code = code; return this; },
    json(data) { this.data = data; },
  };
  context.handler({ method }, res);
  return res;
}

test('Preview deployments generate production URLs without exposing secrets', () => {
  const response = request({
    VERCEL: '1', VERCEL_URL: 'protected-preview.vercel.app',
    VERCEL_PROJECT_PRODUCTION_URL: 'public-site.vercel.app',
    DASHBOARD_KEY: 'secret',
  });
  assert.equal(response.code, 200);
  assert.equal(response.data.publicOrigin, 'https://public-site.vercel.app');
  assert.deepEqual(Object.keys(response.data), ['publicOrigin']);
});

test('Custom public website URL overrides the automatic production domain', () => {
  assert.equal(request({
    PUBLIC_SITE_URL: 'https://articles.example.com/',
    VERCEL_PROJECT_PRODUCTION_URL: 'fallback.vercel.app',
  }).data.publicOrigin, 'https://articles.example.com');
});

test('Missing hosted configuration fails instead of sharing a protected preview', () => {
  assert.equal(request({ VERCEL: '1', VERCEL_URL: 'preview.vercel.app' }).code, 503);
  assert.equal(request({}).data.publicOrigin, null);
});

test('Invalid public origins and unsupported methods are rejected', () => {
  for (const address of ['javascript:alert(1)', 'http://example.com', 'https://example.com/dashboard?key=secret', 'https://user:pass@example.com']) {
    assert.equal(request({ PUBLIC_SITE_URL: address }).code, 503);
  }
  assert.equal(request({}, 'POST').code, 405);
});
