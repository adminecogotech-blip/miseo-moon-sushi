const { db, currentUser, json, auditEvent } = require('./_auth');

async function allowed(user, action) {
  if (user.is_master) return true;
  const r = await db().query(
    'SELECT m.is_enabled, rp.' + action + ' AS allowed FROM app_modules m LEFT JOIN role_permissions rp ON rp.module_key=m.module_key AND rp.role_key=$1 WHERE m.module_key=$2 LIMIT 1',
    [user.role_key, 'stock']
  );
  if (!r.rows.length || !r.rows[0].is_enabled) return false;
  if (r.rows[0].allowed !== null && r.rows[0].allowed !== undefined) return !!r.rows[0].allowed;
  return user.role_key === 'operator' && action !== 'can_delete';
}
function dateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
module.exports = async function handler(req, res) {
  try {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'Faça login para continuar.' });
    if (req.method === 'GET') {
      if (!(await allowed(user, 'can_view'))) return json(res, 403, { error: 'Sem permissão para consultar lotes.' });
      const result = await db().query(`
        SELECT l.id,l.product_id,p.name AS product_name,p.sku,l.lot_code,l.expiry_date,
          l.quantity_received,l.quantity_remaining,l.notes,l.is_active,l.created_at,l.updated_at,
          CASE WHEN l.expiry_date < CURRENT_DATE THEN 'expired'
               WHEN l.expiry_date <= CURRENT_DATE + 7 THEN 'critical'
               WHEN l.expiry_date <= CURRENT_DATE + 30 THEN 'warning' ELSE 'ok' END AS expiry_status
        FROM product_lots l JOIN products p ON p.id=l.product_id
        WHERE l.is_active=true ORDER BY l.expiry_date ASC,l.lot_code ASC LIMIT 500
      `);
      return json(res, 200, { items: result.rows });
    }
    if (req.method === 'POST') {
      if (!(await allowed(user, 'can_create'))) return json(res, 403, { error: 'Sem permissão para cadastrar lotes.' });
      const b=req.body||{}, productId=Number(b.product_id), qty=Number(b.quantity_received), lot=String(b.lot_code||'').trim(), expiry=String(b.expiry_date||'');
      if (!Number.isInteger(productId)||productId<1) return json(res,400,{error:'Selecione um produto válido.'});
      if (!lot||lot.length>100) return json(res,400,{error:'Informe o código do lote (até 100 caracteres).'});
      if (!dateOnly(expiry)) return json(res,400,{error:'Informe uma validade válida.'});
      if (!Number.isFinite(qty)||qty<=0) return json(res,400,{error:'A quantidade deve ser maior que zero.'});
      const p=await db().query('SELECT id FROM products WHERE id=$1 AND is_active=true',[productId]);
      if(!p.rowCount)return json(res,404,{error:'Produto não encontrado ou inativo.'});
      const result=await db().query(`
        WITH lot AS (
          INSERT INTO product_lots(product_id,lot_code,expiry_date,quantity_received,quantity_remaining,notes,created_by)
          VALUES($1,$2,$3,$4,$4,$5,$6) RETURNING id,product_id,quantity_received
        ), movement AS (
          INSERT INTO stock_movements(product_id,movement_type,quantity,reference_type,reference_id,notes,created_by)
          SELECT product_id,'in',quantity_received,'product_lot',id,'Entrada do lote '||$2,$6 FROM lot
          RETURNING id
        ) SELECT lot.id FROM lot CROSS JOIN movement
      `,[productId,lot,expiry,qty,String(b.notes||'').trim()||null,user.id]);
      await auditEvent(db(), user.id, 'lot.created', 'product_lots', result.rows[0].id, { productId, lotCode: lot, expiryDate: expiry, quantity: qty });
      return json(res,201,{ok:true,id:result.rows[0].id});
    }
    const b=req.body||{}, id=Number(b.id||req.query?.id);
    if(!Number.isInteger(id)||id<1)return json(res,400,{error:'Identificador do lote inválido.'});
    if(req.method==='PATCH'){
      if(!(await allowed(user,'can_edit')))return json(res,403,{error:'Sem permissão para editar lotes.'});
      const lot=String(b.lot_code||'').trim(), expiry=String(b.expiry_date||'');
      if(!lot||lot.length>100||!dateOnly(expiry))return json(res,400,{error:'Informe código e validade válidos.'});
      const result=await db().query('UPDATE product_lots SET lot_code=$2,expiry_date=$3,notes=$4,updated_at=NOW() WHERE id=$1 AND is_active=true RETURNING id',[id,lot,expiry,String(b.notes||'').trim()||null]);
      if(!result.rowCount)return json(res,404,{error:'Lote não encontrado ou já cancelado.'});
      await auditEvent(db(), user.id, 'lot.updated', 'product_lots', id, { lotCode: lot, expiryDate: expiry });
      return json(res,200,{ok:true,id});
    }
    if(req.method==='DELETE'){
      if(!(await allowed(user,'can_edit')))return json(res,403,{error:'Sem permissão para cancelar lotes.'});
      const result=await db().query(`
        WITH lot AS (
          UPDATE product_lots SET is_active=false,updated_at=NOW()
          WHERE id=$1 AND is_active=true RETURNING id,product_id,quantity_remaining,lot_code
        ), movement AS (
          INSERT INTO stock_movements(product_id,movement_type,quantity,reference_type,reference_id,notes,created_by)
          SELECT product_id,'out',quantity_remaining,'lot_cancel',id,'Cancelamento do lote '||lot_code,$2
          FROM lot WHERE quantity_remaining>0 RETURNING id
        ) SELECT lot.id FROM lot
      `,[id,user.id]);
      if(!result.rowCount)return json(res,404,{error:'Lote não encontrado ou já cancelado.'});
      await auditEvent(db(), user.id, 'lot.cancelled', 'product_lots', id, {});
      return json(res,200,{ok:true,id});
    }
    return json(res,405,{error:'Método não permitido.'});
  } catch(e) {
    if(e.code==='23505')return json(res,409,{error:'Já existe esse código de lote para o produto selecionado.'});
    if(e.code==='23503')return json(res,400,{error:'Produto ou usuário relacionado não encontrado.'});
    console.error('lots API error:',e.message);
    return json(res,503,{error:'Não foi possível concluir a operação de lotes.'});
  }
};