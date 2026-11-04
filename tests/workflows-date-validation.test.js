const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('purchase lot expiry accepts real ISO dates and rejects impossible dates', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'workflows.js'), 'utf8');
  const start = source.indexOf('function validDateOnly(value)');
  const end = source.indexOf('\nmodule.exports', start);
  assert.ok(start >= 0 && end > start, 'validDateOnly helper must exist before the handler');
  const helperSource = source.slice(start, end);
  const validDateOnly = vm.runInNewContext(helperSource + '\nvalidDateOnly');
  for (const value of ['2024-02-29', '2026-11-04', '2030-12-31']) {
    assert.equal(validDateOnly(value), true, value + ' should be accepted');
  }
  for (const value of ['2025-02-29', '2026-02-31', '2026-13-01', '2026-00-10', '04/11/2026', '2026-11-04T00:00:00Z', '']) {
    assert.equal(validDateOnly(value), false, value + ' should be rejected');
  }
});
