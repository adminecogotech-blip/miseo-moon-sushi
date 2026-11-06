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
      SELECT i.product_id,SUM(i.quantity) AS sold FROM completed c
      JOIN sale_items i ON i.sale_id=c.id GROUP BY i.product_id
    ), incoming AS (
      SELECT i.product_id,SUM(GREATEST(0,i.quantity-i.received_quantity)) AS incoming
      FROM purchase_order_items i JOIN purchase_orders po ON po.id=i.purchase_order_id
      WHERE po.status IN ('sent','partially_received') AND po.expected_at>=CURRENT_DATE
        AND po.expected_at<CURRENT_DATE+($1::int+1)
      GROUP BY i.product_id
    )
    SELECT (SELECT COUNT(*)::int FROM completed) AS orders,
      COALESCE((SELECT json_agg(row_data ORDER BY row_data.name,row_data.id) FROM (
        SELECT stock.*,p.cost_price,COALESCE(d.sold,0) AS sold14,COALESCE(i.incoming,0) AS incoming
        FROM stock JOIN products p ON p.id=stock.id
        LEFT JOIN demand d ON d.product_id=p.id LEFT JOIN incoming i ON i.product_id=p.id
      ) row_data),'[]'::json) AS products
  `, [days]);
  return {...result.rows[0], days, forecast: true};
}

module.exports = {planningView};
