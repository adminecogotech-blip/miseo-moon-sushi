const {createHash}=require('node:crypto');

async function planningDrafts(client,user,body) {
  const lines=body.items, key=body.request_id;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(key||'') ||
      !Array.isArray(lines) || !lines.length || lines.length>200 ||
      lines.some(x=>!x || !Number.isSafeInteger(x.product_id) || x.product_id<1 ||
        !/^\d{1,11}(?:\.\d{1,3})?$/.test(String(x.quantity)) || Number(x.quantity)<=0) ||
      new Set(lines.map(x=>x.product_id)).size!==lines.length)
    throw Object.assign(new Error('Selecione de 1 a 200 produtos distintos com quantidade positiva.'),{status:400});
  const items=lines.map(x=>({product_id:x.product_id,quantity:Number(x.quantity)})).sort((a,b)=>a.product_id-b.product_id);
  const fingerprint=createHash('sha256').update(JSON.stringify(items)).digest('hex');
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['planning:'+user.id+':'+key]);
  const previous=(await client.query("SELECT details FROM audit_logs WHERE user_id=$1 AND action='planning.drafts_created' AND details->>'request_id'=$2 LIMIT 1",[user.id,key])).rows[0];
  if(previous){
    if(previous.details.fingerprint!==fingerprint) throw Object.assign(new Error('A seleção mudou desde a tentativa anterior.'),{status:409});
    await client.query('COMMIT');
    return previous.details.orders;
  }
  const catalog=await client.query(`SELECT p.id,p.cost_price,COALESCE(s.id,(SELECT id FROM suppliers WHERE is_active ORDER BY id LIMIT 1)) supplier
    FROM products p LEFT JOIN product_planning_policy policy ON policy.product_id=p.id
    LEFT JOIN suppliers s ON s.id=policy.preferred_supplier_id AND s.is_active
    WHERE p.is_active AND p.id=ANY($1::bigint[]) ORDER BY p.id FOR SHARE OF p`,[items.map(x=>x.product_id)]);
  if(catalog.rowCount!==items.length) throw Object.assign(new Error('Um produto deixou de estar disponível. Atualize o cálculo.'),{status:409});
  const groups=new Map();
  catalog.rows.forEach((row,i)=>{
    const group=groups.get(row.supplier)||[];
    group.push({...items[i],cost:row.cost_price});groups.set(row.supplier,group);
  });
  const orders=[];
  for(const [supplier,group] of groups){
    const order=(await client.query(`INSERT INTO purchase_orders(supplier_id,status,expected_at,total,notes,created_by)
      SELECT $1,'draft',CURRENT_DATE+2,SUM(quantity*cost),'Criado a partir do Planejamento',$2
      FROM jsonb_to_recordset($3::jsonb) x(quantity numeric,cost numeric) RETURNING id`,[supplier,user.id,JSON.stringify(group)])).rows[0];
    await client.query(`INSERT INTO purchase_order_items(purchase_order_id,product_id,quantity,unit_cost,received_quantity)
      SELECT $1,product_id,quantity,cost,0 FROM jsonb_to_recordset($2::jsonb) x(product_id bigint,quantity numeric,cost numeric)`,[order.id,JSON.stringify(group)]);
    orders.push(order.id);
  }
  await client.query("INSERT INTO audit_logs(user_id,action,entity_type,details) VALUES($1,'planning.drafts_created','purchase_orders',$2::jsonb)",[user.id,JSON.stringify({request_id:key,fingerprint,orders})]);
  await client.query('COMMIT');
  return orders;
}
module.exports={planningDrafts};
