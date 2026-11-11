const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');

const endpoint = '/api/records?resource=backup';
function slice(tables, ingredientId, saleItemId) {
  return {
    product_planning_policy: tables.product_planning_policy.filter(row=>String(row.product_id)===String(ingredientId)),
    sale_item_recipe: tables.sale_item_recipe.filter(row=>String(row.sale_item_id)===String(saleItemId)),
    sale_item_recipe_consumption: tables.sale_item_recipe_consumption.filter(row=>
      String(row.sale_item_id)===String(saleItemId) && String(row.product_id)===String(ingredientId))
  };
}

async function verifyRestore(request, exported, ingredientId, saleItemId, policy) {
  const expected = slice(exported.tables,ingredientId,saleItemId);
  for(const rows of Object.values(expected)) assert.equal(rows.length,1);
  assert.equal(Number(expected.product_planning_policy[0].purchase_multiple),4);
  const post = tables => request(endpoint,'POST',{mode:'merge',backup:{format:exported.format,version:3,tables}});
  const read = async()=>{
    const result=await request(endpoint);
    assert.equal(result.status,200);
    return slice(result.body.tables,ingredientId,saleItemId);
  };
  // Change only the new test fixture, so a successful restore has an observable effect.
  const change=await request('/api/stock?view=planning','PATCH',{...policy,purchase_multiple:9});
  assert.equal(change.status,200);
  const changed=await read();
  assert.equal(Number(changed.product_planning_policy[0].purchase_multiple),9);

  // The invalid recipe is checked after the policy write in the same transaction.
  const invalid={...expected,sale_item_recipe:[{...expected.sale_item_recipe[0],recipe_id:-1}]};
  const rejected=await post(invalid);
  assert.equal(rejected.status,409);
  assert.deepEqual(await read(),changed,'a failed import must roll back all fixture changes');

  for(let attempt=0;attempt<2;attempt++){
    const result=await post(expected);
    assert.equal(result.status,200);
    assert.equal(result.body.recordsProcessed,3);
    assert.deepEqual(await read(),expected,'restored rows should match their original export');
  }

  return {version:3,rows:3,failedImportRolledBack:true,repeatMergeVerified:true,
    restoredExportSha256:createHash('sha256').update(JSON.stringify(expected)).digest('hex')};
}
module.exports={verifyRestore};
