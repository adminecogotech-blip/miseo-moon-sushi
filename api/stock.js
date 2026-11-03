const { db, currentUser, json } = require('./_auth');

async function allowed(user, action) {
  if (user.is_master) return true;
  const r = await db().query(
    'SELECT rp.' + action + ' AS allowed FROM role_permissions rp JOIN app_modules m ON m.module_key=rp.module_key WHERE rp.role_key=$1 AND rp.module_key=$2 AND m.is_enabled=true LIMIT 1',
    [user.role_key, 'stock']
  );
  return !!r.rows[0]?.allowed;
}

module.exports = async function handler(req, res) {
  try {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'Faça login para continuar.' });

    if (req.method === 'GET') {
      if (!(await allowed(user, 'can_view'))) return json(res, 403, { error: 'Seu perfil não tem permissão para consultar o estoque.' });
      const products = await db().query(`
        SELECT p.id, p.sku, p.name, p.category, p.unit, p.min_stock,
          COALESCE(SUM(CASE WHEN sm.movement_type IN ('in','adjustment') THEN sm.quantity WHEN sm.movement_type='out' THEN -sm.quantity ELSE 0 END),0) AS available_stock,
          COALESCE(SUM(CASE WHEN sm.movement_type='reservation' THEN sm.quantity WHEN sm.movement_type='release' THEN -sm.quantity ELSE 0 END),0) AS reserved_stock
        FROM products p
        LEFT JOIN stock_movements sm ON sm.product_id=p.id
        WHERE p.is_active=true
        GROUP BY p.id
        ORDER BY p.name
        LIMIT 300
      `);
      const movements = await db().query(`
        SELECT sm.id, sm.product_id, p.name AS product_name, p.sku, sm.movement_type, sm.quantity, sm.reference_type, sm.reference_id, sm.notes, sm.created_at
        FROM stock_movements sm JOIN products p ON p.id=sm.product_id
        ORDER BY sm.created_at DESC LIMIT 100
      `);
      return json(res, 200, { products: products.rows, movements: movements.rows });
    }

    if (req.method === 'POST') {
      if (!(await allowed(user, 'can_create'))) return json(res, 403, { error: 'Seu perfil não tem permissão para registrar movimentações.' });
      const body = req.body || {};
      const productId = Number(body.product_id);
      const quantity = Number(body.quantity);
      const types = ['in', 'out', 'adjustment', 'reservation', 'release'];
      if (!Number.isInteger(productId) || productId < 1) return json(res, 400, { error: 'Selecione um produto válido.' });
      if (!types.includes(body.movement_type)) return json(res, 400, { error: 'Tipo de movimentação inválido.' });
      if (!Number.isFinite(quantity) || quantity <= 0) return json(res, 400, { error: 'Informe uma quantidade maior que zero.' });
      const product = await db().query('SELECT id FROM products WHERE id=$1 AND is_active=true', [productId]);
      if (!product.rowCount) return json(res, 404, { error: 'Produto não encontrado ou inativo.' });
      if (['out','reservation'].includes(body.movement_type)) {
        const current = await db().query(`
          SELECT
            COALESCE(SUM(CASE WHEN movement_type IN ('in','adjustment') THEN quantity WHEN movement_type='out' THEN -quantity ELSE 0 END),0) AS available,
            COALESCE(SUM(CASE WHEN movement_type='reservation' THEN quantity WHEN movement_type='release' THEN -quantity ELSE 0 END),0) AS reserved
          FROM stock_movements WHERE product_id=$1
        `, [productId]);
        const available = Number(current.rows[0].available) - Number(current.rows[0].reserved);
        if (quantity > available) return json(res, 409, { error: 'Quantidade maior que o saldo disponível.' });
      }
      const result = await db().query(
        'INSERT INTO stock_movements (product_id,movement_type,quantity,reference_type,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [productId, body.movement_type, quantity, 'manual', String(body.notes || '').trim() || null, user.id]
      );
      return json(res, 201, { ok: true, id: result.rows[0].id });
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (e) {
    console.error('stock API error:', e.message);
    return json(res, 503, { error: 'Não foi possível concluir a operação de estoque.' });
  }
};
