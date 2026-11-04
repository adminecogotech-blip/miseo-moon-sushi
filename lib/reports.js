const { db, currentUser, json, method } = require('../api/_auth');

async function canViewReports(user) {
  if (user.is_master) return true;
  const r = await db().query('SELECT m.is_enabled, rp.can_view FROM app_modules m LEFT JOIN role_permissions rp ON rp.module_key=m.module_key AND rp.role_key=$1 WHERE m.module_key=$2 LIMIT 1', [user.role_key, 'reports']);
  return !!(r.rows[0] && r.rows[0].is_enabled && r.rows[0].can_view === true);
}

module.exports = async function handler(req, res) {
  if (!method(req, res, 'GET')) return;
  try {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'Faça login para continuar.' });
    if (!(await canViewReports(user))) return json(res, 403, { error: 'Seu perfil não tem permissão para consultar relatórios.' });
    const [counts, stock, lots, taskStates, purchaseStates, sales] = await Promise.all([
      db().query("SELECT (SELECT count(*)::int FROM products WHERE is_active=true) AS products, (SELECT count(*)::int FROM production_tasks) AS production_tasks, (SELECT count(*)::int FROM purchase_orders WHERE status <> 'cancelled') AS purchase_orders, (SELECT count(*)::int FROM suppliers) AS suppliers"),
      db().query("SELECT count(*)::int AS low_stock FROM products p LEFT JOIN (SELECT product_id, COALESCE(SUM(CASE WHEN movement_type IN ('in','adjustment') THEN quantity WHEN movement_type='out' THEN -quantity ELSE 0 END),0) AS physical, COALESCE(SUM(CASE WHEN movement_type='reservation' THEN quantity WHEN movement_type='release' THEN -quantity ELSE 0 END),0) AS reserved FROM stock_movements GROUP BY product_id) s ON s.product_id=p.id WHERE p.is_active=true AND (COALESCE(s.physical,0)-COALESCE(s.reserved,0)) <= p.min_stock"),
      db().query("SELECT count(*) FILTER (WHERE expiry_date < CURRENT_DATE AND quantity_remaining > 0)::int AS expired, count(*) FILTER (WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 AND quantity_remaining > 0)::int AS expiring_7_days, count(*) FILTER (WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30 AND quantity_remaining > 0)::int AS expiring_30_days FROM product_lots WHERE is_active=true"),
      db().query('SELECT status,count(*)::int AS total FROM production_tasks GROUP BY status ORDER BY status'),
      db().query('SELECT status,count(*)::int AS total FROM purchase_orders GROUP BY status ORDER BY status'),
      db().query("SELECT count(*)::int AS count, COALESCE(sum(total),0)::numeric AS total FROM sales WHERE sold_at >= now() - interval '30 days' AND status <> 'cancelled'")
    ]);
    return json(res, 200, { generatedAt: new Date().toISOString(), counts: counts.rows[0], inventory: { lowStock: stock.rows[0].low_stock, ...lots.rows[0] }, productionByStatus: taskStates.rows, purchasesByStatus: purchaseStates.rows, salesLast30Days: { count: sales.rows[0].count, total: sales.rows[0].total } });
  } catch (e) {
    console.error('reports API error:', e.message);
    return json(res, 503, { error: 'Não foi possível calcular os relatórios.' });
  }
};
