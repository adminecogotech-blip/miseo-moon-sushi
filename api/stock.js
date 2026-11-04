const { db, currentUser, json } = require('./_auth');
const { planLotConsumption } = require('../lib/stock-lots');

async function allowed(user, action) {
  if (user.is_master) return true;
  const r = await db().query(
    'SELECT m.is_enabled, rp.' + action + ' AS allowed FROM app_modules m LEFT JOIN role_permissions rp ON rp.module_key=m.module_key AND rp.role_key=$1 WHERE m.module_key=$2 LIMIT 1',
    [user.role_key, 'stock']
  );
  if (!r.rows.length || !r.rows[0].is_enabled) return false;
  if (r.rows[0].allowed !== null && r.rows[0].allowed !== undefined) return !!r.rows[0].allowed;
  return user.role_key==='operator' && action!=='can_delete';
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

      const client = await db().connect();
      try {
        await client.query('BEGIN');
        // Serialize stock writes for the same product to prevent concurrent overselling.
        const product = await client.query('SELECT id FROM products WHERE id=$1 AND is_active=true FOR UPDATE', [productId]);
        if (!product.rowCount) {
          await client.query('ROLLBACK');
          return json(res, 404, { error: 'Produto não encontrado ou inativo.' });
        }

        const current = await client.query(`
          SELECT
            COALESCE(SUM(CASE WHEN movement_type IN ('in','adjustment') THEN quantity WHEN movement_type='out' THEN -quantity ELSE 0 END),0) AS physical,
            COALESCE(SUM(CASE WHEN movement_type='reservation' THEN quantity WHEN movement_type='release' THEN -quantity ELSE 0 END),0) AS reserved
          FROM stock_movements WHERE product_id=$1
        `, [productId]);
        const physical = Number(current.rows[0].physical);
        const reserved = Number(current.rows[0].reserved);
        const available = physical - reserved;
        if (['out','reservation'].includes(body.movement_type) && quantity > available) {
          await client.query('ROLLBACK');
          return json(res, 409, { error: 'Quantidade maior que o saldo disponível.' });
        }
        if (body.movement_type === 'release' && quantity > reserved) {
          await client.query('ROLLBACK');
          return json(res, 409, { error: 'Quantidade maior que o saldo reservado.' });
        }

        if (body.movement_type === 'out') {
          const lotResult = await client.query(
            'SELECT id,expiry_date,quantity_remaining FROM product_lots WHERE product_id=$1 AND is_active=true AND quantity_remaining>0 ORDER BY expiry_date ASC,id ASC FOR UPDATE',
            [productId]
          );
          // Legacy stock without lots remains usable; once lots exist, an outgoing movement
          // must be fully attributable to lots and cannot silently make lot balances diverge.
          if (lotResult.rowCount > 0) {
            const plan = planLotConsumption(lotResult.rows, quantity);
            if (!plan.ok) {
              await client.query('ROLLBACK');
              return json(res, 409, { error: 'Saldo por lote insuficiente para esta saída. Confira as quantidades dos lotes antes de continuar.' });
            }
            for (const allocation of plan.allocations) {
              const updated = await client.query(
                'UPDATE product_lots SET quantity_remaining=quantity_remaining-$2,updated_at=now() WHERE id=$1 AND is_active=true AND quantity_remaining >= $2 RETURNING id',
                [allocation.id, allocation.quantity]
              );
              if (!updated.rowCount) throw new Error('O saldo do lote mudou durante a movimentação.');
            }
          }
        }

        const result = await client.query(
          'INSERT INTO stock_movements (product_id,movement_type,quantity,reference_type,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
          [productId, body.movement_type, quantity, 'manual', String(body.notes || '').trim() || null, user.id]
        );
        await client.query('INSERT INTO audit_logs(user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5::jsonb)', [user.id, 'stock_movement.created', 'stock_movements', String(result.rows[0].id), JSON.stringify({ productId, movementType: body.movement_type, quantity })]);
        await client.query('COMMIT');
        return json(res, 201, { ok: true, id: result.rows[0].id });
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (e) {
    console.error('stock API error:', e.message);
    return json(res, 503, { error: 'Não foi possível concluir a operação de estoque.' });
  }
};
