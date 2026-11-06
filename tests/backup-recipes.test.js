const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('operational backup v3 includes recipes and ingredients in FK-safe order and accepts v1', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'backup.js'), 'utf8');
  assert.match(source, /recipes:\s*\['id','name','description','yield_quantity','yield_unit','instructions','is_active','created_by','created_at','updated_at'\]/);
  assert.match(source, /recipe_ingredients:\s*\['id','recipe_id','product_id','quantity','unit','notes','created_at'\]/);
  const orderMatch = source.match(/const IMPORT_ORDER = \[([^\]]+)\]/);
  assert.ok(orderMatch, 'backup import order must be explicit');
  const order = [...orderMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.ok(order.indexOf('products') < order.indexOf('recipes'), 'products must be imported before recipes');
  assert.ok(order.indexOf('recipes') < order.indexOf('recipe_ingredients'), 'recipes must be imported before ingredients');
  assert.ok(order.indexOf('sales') < order.indexOf('sale_items'));
  assert.ok(order.indexOf('sale_items') < order.indexOf('sale_item_recipe'));
  assert.ok(order.indexOf('sale_item_recipe') < order.indexOf('sale_item_recipe_consumption'));
  assert.match(source, /version: 3/);
  assert.match(source, /!\[1, 2, 3\]\.includes\(backup\.version\)/, 'legacy v1 backups must remain importable');
  assert.match(source, /for \(const table of IMPORT_ORDER\)/, 'export and import must use the same declared table order');
});
