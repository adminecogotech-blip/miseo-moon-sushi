const HORIZONS = [1, 3, 7, 14, 30];

async function planningView(pool, master, requestedDays) {
  const days = Number(requestedDays ?? 7);
  if (!HORIZONS.includes(days)) return null;

  const stock = `
    SELECT p.id,p.sku,p.name,p.category,p.unit,p.min_stock,
      SUM(CASE WHEN m.movement_type IN ('in','adjustment','release') THEN m.quantity
               WHEN m.movement_type IN ('out','reservation') THEN -m.quantity ELSE 0 END) AS available_stock,
      SUM(CASE WHEN m.movement_type='reservation' THEN m.quantity
               WHEN m.movement_type='release' THEN -m.quantity ELSE 0 END) AS reserved_stock
    FROM products p LEFT JOIN stock_movements m ON m.product_id=p.id
    WHERE p.is_active GROUP BY p.id`;
  if (!master) {
    const result = await pool.query(stock + ' ORDER BY p.name,p.id');
    return {products: result.rows, forecast: false};
  }
  const result = await pool.query(`
    WITH stock AS (${stock}), completed AS (
      SELECT id FROM sales WHERE status='completed' AND sold_at>=CURRENT_DATE-13 AND sold_at<CURRENT_DATE+1
    ), demand AS (
      SELECT product_id,SUM(quantity) AS sold FROM (
        SELECT i.product_id,i.quantity FROM completed c JOIN sale_items i ON i.sale_id=c.id
        WHERE NOT EXISTS (SELECT 1 FROM sale_item_recipe r WHERE r.sale_item_id=i.id)
        UNION ALL
        SELECT sc.product_id,sc.quantity FROM completed c JOIN sale_items i ON i.sale_id=c.id
        JOIN sale_item_recipe_consumption sc ON sc.sale_item_id=i.id
      ) usage GROUP BY product_id
    ), incoming AS (
      SELECT i.product_id,SUM(GREATEST(0,i.quantity-i.received_quantity)) AS incoming
      FROM purchase_order_items i JOIN purchase_orders po ON po.id=i.purchase_order_id
      WHERE po.status IN ('sent','partially_received') AND po.expected_at>=CURRENT_DATE
        AND po.expected_at<CURRENT_DATE+($1::int+1)
      GROUP BY i.product_id
    )
    SELECT (SELECT COUNT(*)::int FROM completed) AS orders,
      (SELECT COALESCE(json_agg(s ORDER BY s.name,s.id),'[]'::json) FROM (SELECT id,name FROM suppliers WHERE is_active) s) AS suppliers,
      COALESCE((SELECT json_agg(row_data ORDER BY row_data.name,row_data.id) FROM (
        SELECT stock.*,p.cost_price,policy.preferred_supplier_id, COALESCE(policy.safety_stock,0) AS safety_stock, COALESCE(policy.purchase_multiple,1) AS purchase_multiple,COALESCE(d.sold,0) AS sold14,COALESCE(i.incoming,0) AS incoming
        FROM stock JOIN products p ON p.id=stock.id
        LEFT JOIN product_planning_policy policy ON policy.product_id=p.id
        LEFT JOIN demand d ON d.product_id=p.id LEFT JOIN incoming i ON i.product_id=p.id
      ) row_data),'[]'::json) AS products
  `, [days]);
  return {...result.rows[0], days, forecast: true};
}

module.exports = {planningView};
