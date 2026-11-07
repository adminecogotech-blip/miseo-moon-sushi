const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('lot expiry rejects impossible calendar dates', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'api', 'lots.js'), 'utf8');
  const start = source.indexOf('function dateOnly(value)');
  const end = source.indexOf('\nmodule.exports', start);
  assert.ok(start >= 0 && end > start);
  const check = vm.runInNewContext(source.slice(start, end) + '\ndateOnly');
  for (const value of ['2024-02-29', '2026-11-05', '2030-12-31']) assert.equal(check(value), true, value);
  for (const value of ['2025-02-29', '2026-02-31', '2026-04-31', '2026-13-01', '2026-00-10', '05/11/2026', '']) assert.equal(check(value), false, value);
});
