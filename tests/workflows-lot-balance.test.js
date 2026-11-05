const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('sale completion always requires sufficient active lot balance', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'workflows.js'), 'utf8');
  const releaseAt = source.indexOf("Liberação da reserva para baixa");
  const lotAt = source.indexOf("SELECT id,quantity_remaining FROM product_lots", releaseAt);
  const consumeAt = source.indexOf("for(const l of lot.rows)", lotAt);
  const insufficientAt = source.indexOf("if(remaining>0)throw Object.assign(new Error('Saldo dos lotes insuficiente para concluir a venda.'),{status:409})", consumeAt);
  const stockOutAt = source.indexOf("Baixa da venda", insufficientAt);
  assert.ok(releaseAt >= 0, 'sale reservation must be released inside the transaction');
  assert.ok(lotAt > releaseAt, 'active lots must be queried before stock is issued');
  assert.ok(consumeAt > lotAt, 'every available lot must be considered');
  assert.ok(insufficientAt > consumeAt, 'remaining quantity must be rejected even when no lots exist');
  assert.ok(stockOutAt > insufficientAt, 'stock issue must happen only after lot sufficiency is verified');
  assert.equal(source.slice(lotAt, consumeAt).includes('if(lot.rowCount)'), false,
    'lot sufficiency must not be conditional on at least one lot being found');
});
