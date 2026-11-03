const test = require('node:test');
const assert = require('node:assert/strict');
const { planLotConsumption } = require('../lib/stock-lots');

test('FIFO allocates the earliest expiry first and splits across lots', () => {
  const result = planLotConsumption([
    { id: 3, expiry_date: '2027-03-01', quantity_remaining: '4' },
    { id: 1, expiry_date: '2026-12-01', quantity_remaining: '2' },
    { id: 2, expiry_date: '2027-01-01', quantity_remaining: '5' }
  ], 6);
  assert.equal(result.ok, true);
  assert.deepEqual(result.allocations, [
    { id: 1, quantity: 2 },
    { id: 2, quantity: 4 }
  ]);
});

test('FIFO refuses to consume more than the lot balance', () => {
  const result = planLotConsumption([
    { id: 1, expiry_date: '2026-12-01', quantity_remaining: '2' },
    { id: 2, expiry_date: '2027-01-01', quantity_remaining: '1' }
  ], 4);
  assert.equal(result.ok, false);
  assert.equal(result.available, 3);
  assert.deepEqual(result.allocations, []);
});

test('FIFO handles exhausted lots and zero remaining quantity', () => {
  const result = planLotConsumption([
    { id: 1, expiry_date: '2026-01-01', quantity_remaining: '0' },
    { id: 2, expiry_date: '2026-02-01', quantity_remaining: '2.5' }
  ], 2.5);
  assert.equal(result.ok, true);
  assert.deepEqual(result.allocations, [{ id: 2, quantity: 2.5 }]);
});

test('FIFO rejects invalid quantities', () => {
  for (const quantity of [0, -1, NaN, Infinity]) {
    assert.throws(() => planLotConsumption([], quantity), TypeError);
  }
});
