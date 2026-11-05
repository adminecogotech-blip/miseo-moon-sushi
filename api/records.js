const { db, currentUser, json, auditEvent } = require('./_auth');

const moduleByResource = { products: 'stock', suppliers: 'suppliers', tasks: 'production', purchases: 'purchases', sales: 'sales' };

async function canAccess(user, resource, action) {
  if (user.is_master) return true;
  const moduleKey = moduleByResource[resource];
  if (!moduleKey) return false;
  const result = await db().query(
    'SELECT m.is_enabled, rp.' + action + ' AS allowed FROM app_modules m LEFT JOIN role_permissions rp ON rp.module_key=m.module_key AND rp.role_key=$1 WHERE m.module_key=$2 LIMIT 1',
    [user.role_key, moduleKey]
  );
  if (!result.rows.length || !result.rows[0].is_enabled) return false;
  if (result.rows[0].allowed !== null && result.rows[0].allowed !== undefined) return !!result.rows[0].allowed;
  return user.role_key === 'operator' && ['stock', 'suppliers', 'production', 'purchases', 'sales'].includes(moduleKey) && action !== 'can_delete';
}

const resources = {
  products: { table: 'products', fields: ['sku','name','category','unit','cost_price','sale_price','min_stock'], required: ['name'], select: 'id,sku,name,category,unit,cost_price,sale_price,min_stock,created_at', order: 'name' },
  suppliers: { table: 'suppliers', fields: ['name','contact_name','phone','whatsapp','email','category','notes'], required: ['name'], select: 'id,name,contact_name,phone,whatsapp,email,category,notes,created_at', order: 'name' },
  tasks: { table: 'production_tasks', fields: ['title','description','task_type','category','status','priority','starts_at','due_at'], required: ['title'], select: 'id,title,description,task_type,status,category,priority,starts_at,due_at,created_at', order: 'due_at NULLS LAST,created_at DESC' },
  purchases: { table: 'purchase_orders', fields: ['supplier_id','order_number','status','expected_at','total','notes'], required: [], select: 'po.id,po.supplier_id,po.order_number,po.status,po.expected_at,po.total,po.notes,s.name AS supplier_name,po.created_at', order: 'po.created_at DESC' },
  sales: { table: 'sales', fields: ['sale_number','channel','status','subtotal','total','sold_at','notes'], required: [], select: 'id,sale_number,channel,status,subtotal,total,sold_at,notes,created_at', order: 'sold_at DESC' }
};

module.exports = async function handler(req, res) {
  try {
    if (String(req.query?.resource || '') === 'recipes') return require('../lib/recipes')(req, res);
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'Faça login para continuar.' });
    const key = String(req.query?.resource || '');
    if (key === 'workflow') return require('../lib/workflows')(req, res);
    if (key === 'connections') return require('../lib/connections')(req, res);
    if (['reports', 'audit', 'backup'].includes(key)) {
      const handler = require('../lib/' + key);
      return handler(req, res);
    }
    const cfg = resources[key];
    if (!cfg) return json(res, 400, { error: 'Módulo inválido.' });

    if (req.method === 'GET') {
      if (!(await canAccess(user, key, 'can_view'))) return json(res, 403, { error: 'Seu perfil não tem permissão para consultar este módulo.' });
      const activeWhere = {
        products: ' WHERE is_active=true',
        suppliers: ' WHERE is_active=true',
        tasks: " WHERE status IS DISTINCT FROM 'cancelled'",
        purchases: " WHERE po.status IS DISTINCT FROM 'cancelled'",
        sales: " WHERE status IS DISTINCT FROM 'cancelled'"
      }[key] || '';
      const sql = key === 'purchases'
        ? 'SELECT ' + cfg.select + ' FROM purchase_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id' + activeWhere + ' ORDER BY ' + cfg.order + ' LIMIT 200'
        : 'SELECT ' + cfg.select + ' FROM ' + cfg.table + activeWhere + ' ORDER BY ' + cfg.order + ' LIMIT 200';
      const result = await db().query(sql);
      return json(res, 200, { items: result.rows });
    }

    // Purchases and sales must use the transactional workflow so item rows,
    // stock reservations, receipts and inventory movements cannot be bypassed.
    if (['purchases', 'sales'].includes(key) && ['POST', 'PATCH', 'DELETE'].includes(req.method)) {
      return json(res, 409, { error: 'Use o fluxo transacional de compras e vendas para manter itens e estoque sincronizados.' });
    }

    if (req.method === 'POST') {
      if (!(await canAccess(user, key, 'can_create'))) return json(res, 403, { error: 'Seu perfil não tem permissão para cadastrar neste módulo.' });
      const body = req.body || {};
      for (const field of cfg.required) if (!String(body[field] ?? '').trim()) return json(res, 400, { error: 'Preencha os campos obrigatórios.' });
      const fields = cfg.fields.filter(field => body[field] !== undefined && body[field] !== null && body[field] !== '');
      if (key === 'purchases' && body.supplier_id && !(await db().query('SELECT id FROM suppliers WHERE id=$1', [body.supplier_id])).rowCount) return json(res, 400, { error: 'Fornecedor não encontrado.' });
      if (['tasks','purchases','sales'].includes(key)) fields.push('created_by');
      const values = fields.map(field => field === 'created_by' ? user.id : body[field]);
      const placeholders = fields.map((field, index) => '$' + (index + 1));
      const result = await db().query('INSERT INTO ' + cfg.table + ' (' + fields.join(',') + ') VALUES (' + placeholders.join(',') + ') RETURNING id', values);
      await auditEvent(db(), user.id, 'record.created', key, result.rows[0].id, { resource: key });
      return json(res, 201, { ok: true, id: result.rows[0].id });
    }

    if (req.method === 'PATCH') {
      if (!(await canAccess(user, key, 'can_edit'))) return json(res, 403, { error: 'Seu perfil não tem permissão para editar neste módulo.' });
      const body = req.body || {};
      const id = Number(body.id);
      if (!Number.isInteger(id) || id < 1) return json(res, 400, { error: 'Registro inválido para edição.' });
      for (const field of cfg.required) if (body[field] !== undefined && !String(body[field] ?? '').trim()) return json(res, 400, { error: 'Preencha os campos obrigatórios.' });
      if (key === 'purchases' && body.supplier_id && !(await db().query('SELECT id FROM suppliers WHERE id=$1', [body.supplier_id])).rowCount) return json(res, 400, { error: 'Fornecedor não encontrado.' });
      const fields = cfg.fields.filter(field => Object.prototype.hasOwnProperty.call(body, field));
      if (!fields.length) return json(res, 400, { error: 'Nenhum campo válido para atualizar.' });
      const values = fields.map(field => body[field] === '' ? null : body[field]);
      values.push(id);
      const sets = fields.map((field, index) => field + '=$' + (index + 1)).join(',');
      const updatedAt = cfg.table === 'sales' ? '' : ', updated_at=now()';
      const sql = 'UPDATE ' + cfg.table + ' SET ' + sets + updatedAt + ' WHERE id=$' + values.length + ' RETURNING id';
      const result = await db().query(sql, values);
      if (!result.rowCount) return json(res, 404, { error: 'Registro não encontrado.' });
      await auditEvent(db(), user.id, 'record.updated', key, result.rows[0].id, { resource: key, fields });
      return json(res, 200, { ok: true, id: result.rows[0].id });
    }

    if (req.method === 'DELETE') {
      if (!(await canAccess(user, key, 'can_delete'))) return json(res, 403, { error: 'Seu perfil não tem permissão para cancelar neste módulo.' });
      const id = Number(req.query?.id || req.body?.id);
      if (!Number.isInteger(id) || id < 1) return json(res, 400, { error: 'Registro inválido para cancelamento.' });
      const cancellation = {
        products: { sql: 'UPDATE products SET is_active=false,updated_at=now() WHERE id=$1 AND is_active=true RETURNING id', label: 'produto' },
        suppliers: { sql: 'UPDATE suppliers SET is_active=false,updated_at=now() WHERE id=$1 AND is_active=true RETURNING id', label: 'fornecedor' },
        tasks: { sql: "UPDATE production_tasks SET status='cancelled',updated_at=now() WHERE id=$1 AND status IS DISTINCT FROM 'cancelled' AND status IS DISTINCT FROM 'completed' RETURNING id", label: 'tarefa de produção' },
        purchases: { sql: "UPDATE purchase_orders SET status='cancelled',updated_at=now() WHERE id=$1 AND status IN ('draft','sent') RETURNING id", label: 'pedido de compra (somente rascunhos ou enviados)' },
        sales: { sql: "UPDATE sales SET status='cancelled' WHERE id=$1 AND status='open' RETURNING id", label: 'venda aberta' }
      }[key];
      if (!cancellation) return json(res, 400, { error: 'Este módulo não permite cancelamento por esta operação.' });
      const result = await db().query(cancellation.sql, [id]);
      if (!result.rowCount) return json(res, 409, { error: 'Registro não encontrado, já cancelado ou fora do estado permitido para cancelamento.' });
      await auditEvent(db(), user.id, 'record.cancelled', key, id, { resource: key });
      return json(res, 200, { ok: true, id, message: 'Registro cancelado.' });
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (error) {
    console.error('records API error:', error.message);
    return json(res, 503, { error: 'Não foi possível concluir a operação.' });
  }
};
