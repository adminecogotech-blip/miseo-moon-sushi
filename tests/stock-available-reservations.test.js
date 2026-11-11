const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('stock available balance subtracts reservations and adds releases', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'api', 'stock.js'), 'utf8');
  assert.match(source, /WHEN sm\.movement_type IN \('out','reservation'\) THEN -sm\.quantity/);
  assert.match(source, /WHEN sm\.movement_type='release' THEN sm\.quantity/);
  assert.match(source, /AS available_stock/);
  assert.match(source, /WHEN sm\.movement_type='reservation' THEN sm\.quantity WHEN sm\.movement_type='release' THEN -sm\.quantity/);
  assert.match(source, /AS reserved_stock/);
});
