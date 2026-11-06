const units = new Map(Object.entries({
  g:['mass',1],kg:['mass',1000],mg:['mass',0.001],
  ml:['volume',1],l:['volume',1000],
  un:['count',1],unidade:['count',1],unidades:['count',1],
  porção:['portion',1],porções:['portion',1]
}));
function factor(from,to) {
  const a=String(from||'').trim().toLowerCase(), b=String(to||'').trim().toLowerCase();
  if(a && a===b) return 1;
  const source=units.get(a), target=units.get(b);
  if(source && target && source[0]===target[0]) return source[1]/target[1];
  throw Object.assign(new Error('Unidades incompatíveis na ficha técnica: '+a+' / '+b),{status:409});
}
async function captureRecipe(client,item) {
  if(!item.recipe_id) return;
  const recipe=(await client.query('SELECT yield_quantity,yield_unit FROM recipes WHERE id=$1 AND is_active FOR SHARE',[item.recipe_id])).rows[0];
  if(!recipe) throw Object.assign(new Error('A receita da venda foi arquivada.'),{status:409});
  const ingredients=(await client.query(`SELECT ri.product_id,ri.quantity,ri.unit,p.unit AS stock_unit,p.is_active
    FROM recipe_ingredients ri JOIN products p ON p.id=ri.product_id WHERE ri.recipe_id=$1 FOR SHARE OF p`,[item.recipe_id])).rows;
  if(!ingredients.length || ingredients.some(i=>!i.is_active)) throw Object.assign(new Error('Confira os ingredientes ativos da receita.'),{status:409});
  const sold= factor(item.unit,recipe.yield_unit);
  const rows=ingredients.map(i=>({...i,scale:factor(i.unit,i.stock_unit)}));
  await client.query(`INSERT INTO sale_item_recipe_consumption(sale_item_id,product_id,stock_unit,quantity)
    SELECT $1,product_id,stock_unit,SUM(quantity*scale)*$3::numeric*$4::numeric/$5::numeric
    FROM jsonb_to_recordset($2::jsonb) AS i(product_id bigint,stock_unit text,quantity numeric,scale numeric)
    GROUP BY product_id,stock_unit`,[item.id,JSON.stringify(rows),item.quantity,sold,recipe.yield_quantity]);
  await client.query('UPDATE sale_item_recipe SET yield_quantity=$2,yield_unit=$3,captured_at=now() WHERE sale_item_id=$1',[item.id,recipe.yield_quantity,recipe.yield_unit]);
}
module.exports={captureRecipe,factor};
