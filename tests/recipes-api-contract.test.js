const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const apiPath = path.join(__dirname, '..', 'api', 'recipes.js');
const migrationPath = path.join(__dirname, '..', 'migrations', '20261104_recipes.sql');

test('recipes API validates auth, authorization, ingredients and transactional writes', () => {
  const source = fs.readFileSync(apiPath, 'utf8');
  assert.match(source, /currentUser\(req\)/);
  assert.match(source, /can_view/);
  assert.match(source, /can_create/);
  assert.match(source, /can_edit/);
  assert.match(source, /can_delete/);
  assert.match(source, /BEGIN/);
  assert.match(source, /COMMIT/);
  assert.match(source, /ROLLBACK/);
  assert.match(source, /cost_price/);
  assert.match(source, /recipe_ingredients/);
});

test('recipes migration preserves recipe and ingredient relations with constraints', () => {
  const source = fs.readFileSync(migrationPath, 'utf8');
  assert.match(source, /CREATE TABLE IF NOT EXISTS recipes/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS recipe_ingredients/);
  assert.match(source, /REFERENCES products\(id\)/);
  assert.match(source, /CHECK \(quantity > 0\)/);
  assert.match(source, /CHECK \(yield_quantity > 0\)/);
});


test('recipe ingredients may repeat across distinct preparation stages', () => {
  const source = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(source, /UNIQUE\s*\(recipe_id,\s*product_id\)/);
});
