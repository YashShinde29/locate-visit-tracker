const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../public/page-content.js'), 'utf8');
function node() { return { children: [], style: {}, hidden: false, textContent: '', append(child) { this.children.push(child); }, prepend(child) { this.children.unshift(child); }, replaceChildren() { this.children = []; }, setAttribute() {} }; }
async function render(content, ok = true) {
  const nodes = new Map();
  const find = (selector) => { if (!nodes.has(selector)) nodes.set(selector, node()); return nodes.get(selector); };
  const window = {};
  vm.runInNewContext(code, {
    window, URL, AbortSignal,
    document: { querySelector: find, getElementById: find, createElement: node },
    fetch: async () => ({ ok, json: async () => content }),
  });
  await window.pageContentReady;
  return find;
}
test('Published text renders as text, with safe section links and optional destination', async () => {
  const find = await render({ title: '<img onerror=alert(1)>', body: '## Heading\n\n<script>alert(1)</script>', destination: 'https://example.com' });
  assert.equal(find('h1').textContent, '<img onerror=alert(1)>');
  assert.equal(find('article').children[1].textContent, '<script>alert(1)</script>');
  assert.equal(find('aside').children[1].href, '#section-1');
  assert.equal(find('continueLink').href, 'https://example.com/');
});
test('Empty destination is hidden and storage failures leave a readable fallback notice', async () => {
  const find = await render({ title: 'Article', body: 'Plain paragraph', destination: '' });
  assert.equal(find('destination').hidden, true);
  assert.equal(find('aside').hidden, true);
  const failure = await render(null, false);
  assert.match(failure('main').children[0].textContent, /could not be loaded/);
});
