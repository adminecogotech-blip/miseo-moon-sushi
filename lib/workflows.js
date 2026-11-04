const { db, currentUser, json, auditEvent } = require('../api/_auth');

const moduleFor = { purchases: 'purchases', sales: 'sales' };
async function permitted(user, moduleKey, action) {
  if (user.is_master) return true;
  const r = await db().query(
    'SELECT m.is_enabled,rp.' + action + ' AS allowed FROM app_modules m LEFT JOIN role_permissions rp ON rp.module_key=m.module_key AND rp.role_key=$1 WHERE m.module_key=$2 LIMIT 1',
    [user.role_key, moduleKey]
  );
  return !!(r.rows[0] && r.rows[0].is_enabled && r.rows[0].allowed === true);
}
function validLines(lines) {
  return Array.isArray(lines) && lines.length > 0 && lines.length <= 200 &&
    lines.every(x => Number.isInteger(Number(x.product_id)) && Number(x.product_id) > 0 &&
      Number.isFinite(Number(x.quantity)) && Number(x.quantity) > 0 &&
      (x.unit_cost === undefined || (Number.isFinite(Number(x.unit_cost)) && Number(x.unit_cost) >= 0)) &&
      (x.unit_price === undefined || (Number.isFinite(Number(x.unit_price)) && Number(x.unit_price) >= 0)));
}
module.exports = async function handler(req, res) {
  const user = await currentUser(req);
  if (!user) return json(res, 401, { error: 'Faça login para continuar.' });
  const kind = String(req.query?.kind || '');
  if (!moduleFor[kind]) return json(res, 400, { error: 'Fluxo inválido.' });
  const moduleKey = moduleFor[kind];
  const client = await db().connect();
  try {
    if (req.method === 'GET') {
      if (!(await permitted(user, moduleKey, 'can_view'))) return json(res,403,{error:'Sem permissão para consultar.'});
      if (kind === 'purchases') {
        const r = await client.query(`SELECT po.*,s.name supplier_name,COALESCE(jsonb_agg(jsonb_build_object('id',i.id,'product_id',i.product_id,'product_name',p.name,'sku',p.sku,'quantity',i.quantity,'received_quantity',i.received_quantity,'unit_cost',i.unit_cost) ORDER BY i.id) FILTER(WHERE i.id IS NOT NULL),'[]'::jsonb) items FROM purchase_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id LEFT JOIN purchase_order_items i ON i.purchase_order_id=po.id LEFT JOIN products p ON p.id=i.product_id WHERE po.status <> 'cancelled' GROUP BY po.id,s.name ORDER BY po.created_at DESC LIMIT 200`);
        return json(res,200,{items:r.rows});
      }
      const r = await client.query(`SELECT s.*,COALESCE(jsonb_agg(jsonb_build_object('id',i.id,'product_id',i.product_id,'product_name',p.name,'sku',p.sku,'quantity',i.quantity,'unit_price',i.unit_price) ORDER BY i.id) FILTER(WHERE i.id IS NOT NULL),'[]'::jsonb) items FROM sales s LEFT JOIN sale_items i ON i.sale_id=s.id LEFT JOIN products p ON p.id=i.product_id WHERE s.status <> 'cancelled' GROUP BY s.id ORDER BY s.sold_at DESC LIMIT 200`);
      return json(res,200,{items:r.rows});
    }
    if (req.method === 'POST') {
      if (!(await permitted(user,moduleKey,'can_create'))) return json(res,403,{error:'Sem permissão para cadastrar.'});
      const b=req.body||{};
      if (!validLines(b.items)) return json(res,400,{error:'Informe ao menos um item válido.'});
      await client.query('BEGIN');
      let id, total=0;
      for (const line of b.items) {
        const p=await client.query('SELECT id,cost_price,sale_price FROM products WHERE id=$1 AND is_active=true',[Number(line.product_id)]);
        if (!p.rowCount) throw Object.assign(new Error('Produto inválido ou inativo.'),{status:400});
        const price=kind==='purchases' ? Number(line.unit_cost ?? p.rows[0].cost_price) : Number(line.unit_price ?? p.rows[0].sale_price);
        total += Number(line.quantity)*price;
      }
      if (kind==='purchases') {
        if (b.supplier_id && !(await client.query('SELECT id FROM suppliers WHERE id=$1 AND is_active=true',[b.supplier_id])).rowCount) throw Object.assign(new Error('Fornecedor inválido.'),{status:400});
        const h=await client.query(`INSERT INTO purchase_orders(supplier_id,order_number,status,expected_at,total,notes,created_by) VALUES($1,$2,'draft',$3,$4,$5,$6) RETURNING id`,[b.supplier_id||null,b.order_number||null,b.expected_at||null,total,String(b.notes||'').trim()||null,user.id]);
        id=h.rows[0].id;
        for(const line of b.items){const p=await client.query('SELECT cost_price FROM products WHERE id=$1',[line.product_id]);await client.query('INSERT INTO purchase_order_items(purchase_order_id,product_id,quantity,unit_cost,received_quantity) VALUES($1,$2,$3,$4,0)',[id,line.product_id,line.quantity,line.unit_cost??p.rows[0].cost_price]);}
      } else {
        const h=await client.query(`INSERT INTO sales(sale_number,channel,status,subtotal,total,sold_at,notes,created_by) VALUES($1,$2,'open',$3,$3,COALESCE($4::timestamptz,now()),$5,$6) RETURNING id`,[b.sale_number||null,b.channel||'balcao',total,b.sold_at||null,String(b.notes||'').trim()||null,user.id]);
        id=h.rows[0].id;
        for(const line of b.items){
          const p=await client.query('SELECT id FROM products WHERE id=$1 AND is_active=true FOR UPDATE',[line.product_id]);
          const stock=await client.query(`SELECT COALESCE(SUM(CASE WHEN movement_type IN ('in','adjustment') THEN quantity WHEN movement_type='out' THEN -quantity ELSE 0 END),0)-COALESCE(SUM(CASE WHEN movement_type='reservation' THEN quantity WHEN movement_type='release' THEN -quantity ELSE 0 END),0) available FROM stock_movements WHERE product_id=$1`,[line.product_id]);
          if(Number(stock.rows[0].available)<Number(line.quantity)) throw Object.assign(new Error('Estoque disponível insuficiente para um ou mais itens.'),{status:409});
          const price=Number(line.unit_price??(await client.query('SELECT sale_price FROM products WHERE id=$1',[line.product_id])).rows[0].sale_price);
          await client.query('INSERT INTO sale_items(sale_id,product_id,quantity,unit_price) VALUES($1,$2,$3,$4)',[id,line.product_id,line.quantity,price]);
          await client.query("INSERT INTO stock_movements(product_id,movement_type,quantity,reference_type,reference_id,notes,created_by) VALUES($1,'reservation',$2,'sale',$3,'Reserva da venda',$4)",[line.product_id,line.quantity,id,user.id]);
        }
      }
      await auditEvent(client,user.id,kind==='purchases'?'purchase.created':'sale.created',kind==='purchases'?'purchase_orders':'sales',id,{total,itemCount:b.items.length});
      await client.query('COMMIT');
      return json(res,201,{ok:true,id,total});
    }
    if (req.method === 'PATCH') {
      if (!(await permitted(user,moduleKey,'can_edit'))) return json(res,403,{error:'Sem permissão para alterar.'});
      const b=req.body||{},id=Number(b.id);
      if(!Number.isInteger(id)||id<1)return json(res,400,{error:'Registro inválido.'});
      await client.query('BEGIN');
      if(kind==='purchases'){
        if(!validLines(b.items)) throw Object.assign(new Error('Informe os itens e quantidades recebidas.'),{status:400});
        const h=await client.query("SELECT id,status FROM purchase_orders WHERE id=$1 FOR UPDATE",[id]);
        if(!h.rowCount||!['draft','sent','partial'].includes(h.rows[0].status)) throw Object.assign(new Error('Pedido não encontrado ou não pode receber.'),{status:409});
        for(const line of b.items){
          const item=await client.query('SELECT i.id,i.product_id,i.quantity,i.received_quantity,p.name FROM purchase_order_items i JOIN products p ON p.id=i.product_id WHERE i.purchase_order_id=$1 AND i.product_id=$2 FOR UPDATE',[id,line.product_id]);
          if(!item.rowCount) throw Object.assign(new Error('Item não pertence ao pedido.'),{status:400});
          const remaining=Number(item.rows[0].quantity)-Number(item.rows[0].received_quantity),qty=Number(line.quantity);
          if(qty>remaining) throw Object.assign(new Error('Recebimento excede a quantidade pendente.'),{status:409});
          if(qty<=0) throw Object.assign(new Error('Quantidade recebida deve ser positiva.'),{status:400});
          await client.query('UPDATE purchase_order_items SET received_quantity=received_quantity+$1 WHERE id=$2',[qty,item.rows[0].id]);
          const lotCode=String(line.lot_code||('REC-'+id+'-'+item.rows[0].id+'-'+Date.now())).slice(0,100);
          const expiry=String(line.expiry_date||'');
          if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(expiry)||Number.isNaN(Date.parse(expiry))) throw Object.assign(new Error('Informe a validade do lote recebido.'),{status:400});
          const lot=await client.query(`INSERT INTO product_lots(product_id,lot_code,expiry_date,quantity_received,quantity_remaining,notes,created_by) VALUES($1,$2,$3,$4,$4,$5,$6) RETURNING id`,[line.product_id,lotCode,expiry,String(qty),line.notes||'Recebimento de compra '+id,user.id]);
          await client.query("INSERT INTO stock_movements(product_id,movement_type,quantity,reference_type,reference_id,notes,created_by) VALUES($1,'in',$2,'purchase_order',$3,$4,$5)",[line.product_id,qty,id,'Recebimento do pedido '+id,user.id]);
        }
        const remaining=await client.query('SELECT COALESCE(SUM(quantity-received_quantity),0) pending FROM purchase_order_items WHERE purchase_order_id=$1',[id]);
        const status=Number(remaining.rows[0].pending)<=0?'received':'partial';
        await client.query('UPDATE purchase_orders SET status=$1,updated_at=now() WHERE id=$2',[status,id]);
        await auditEvent(client,user.id,'purchase.received','purchase_orders',id,{status,items:b.items.length});
        await client.query('COMMIT');
        return json(res,200,{ok:true,id,status});
      }
      const h=await client.query("SELECT id,status FROM sales WHERE id=$1 FOR UPDATE",[id]);
      if(!h.rowCount||h.rows[0].status!=='open') throw Object.assign(new Error('Venda não encontrada ou já finalizada.'),{status:409});
      const items=await client.query('SELECT product_id,quantity FROM sale_items WHERE sale_id=$1',[id]);
      if(!items.rowCount) throw Object.assign(new Error('Venda sem itens.'),{status:409});
      for(const item of items.rows){
        await client.query("INSERT INTO stock_movements(product_id,movement_type,quantity,reference_type,reference_id,notes,created_by) VALUES($1,'release',$2,'sale',$3,'Liberação da reserva para baixa',$4)",[item.product_id,item.quantity,id,user.id]);
        const lot=await client.query('SELECT id,quantity_remaining FROM product_lots WHERE product_id=$1 AND is_active=true AND quantity_remaining>0 ORDER BY expiry_date,id FOR UPDATE',[item.product_id]);
        if(lot.rowCount){
          let remaining=Number(item.quantity);
          for(const l of lot.rows){if(remaining<=0)break;const take=Math.min(remaining,Number(l.quantity_remaining));if(take>0){await client.query('UPDATE product_lots SET quantity_remaining=quantity_remaining-$1,updated_at=now() WHERE id=$2',[take,l.id]);remaining-=take;}}
          if(remaining>0)throw Object.assign(new Error('Saldo dos lotes insuficiente para concluir a venda.'),{status:409});
        }
        await client.query("INSERT INTO stock_movements(product_id,movement_type,quantity,reference_type,reference_id,notes,created_by) VALUES($1,'out',$2,'sale',$3,'Baixa da venda',$4)",[item.product_id,item.quantity,id,user.id]);
      }
      await client.query("UPDATE sales SET status='completed' WHERE id=$1",[id]);
      await auditEvent(client,user.id,'sale.completed','sales',id,{itemCount:items.rowCount});
      await client.query('COMMIT');
      return json(res,200,{ok:true,id,status:'completed'});
    }
    return json(res,405,{error:'Método não permitido.'});
  } catch(e) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('workflow API error:',e.message);
    return json(res,e.status||503,{error:e.status?e.message:'Não foi possível concluir o fluxo.'});
  } finally { client.release(); }
};
