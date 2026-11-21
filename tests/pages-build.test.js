const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');

test('Pages build is configured as a local-only demo', () => {
  const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  assert.match(html, /<body data-view="loading" data-static-demo="true">/);
  assert.match(html, /id="demo-start"/);
  assert.match(html, /AI stories, chapter illustrations and family accounts need a separately hosted server/);
});

test('Pages artifact contains all locally referenced app files', () => {
  const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  const references = [
    ...html.matchAll(/(?:src|href)="([^"]+)"/g),
  ].map(match => match[1]).filter(value => !/^(?:https?:|#)/.test(value));

  for (const reference of references) {
    assert.ok(
      fs.existsSync(path.join(output, reference)),
      `Missing Pages asset: ${reference}`
    );
  }
  assert.ok(fs.existsSync(path.join(output, 'assets/little-minds-adventure.png')));
  assert.ok(fs.existsSync(path.join(output, '.nojekyll')));
  assert.ok(!fs.existsSync(path.join(output, 'server.js')));
});
