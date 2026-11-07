const { db } = require('../api/_auth');

// The reporting view is restricted to master users by the caller.
async function dashboardOverview() {
  const result = await db().query(`
    WITH stock AS (
      SELECT p.id,p.name,p.unit,p.min_stock,p.cost_price,
        COALESCE(SUM(CASE WHEN m.movement_type IN ('in','adjustment','release') THEN m.quantity
                    WHEN m.movement_type IN ('out','reservation') THEN -m.quantity END),0) AS available
      FROM products p LEFT JOIN stock_movements m ON m.product_id=p.id
      WHERE p.is_active GROUP BY p.id
    ), orders AS (
      SELECT po.order_number, po.id,po.status, po.expected_at,s.name AS supplier
      FROM purchase_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id
      WHERE po.status IN ('sent','partially_received')
    ), channels AS (
      SELECT channel,SUM(total) AS total FROM sales
      WHERE status='completed' AND sold_at>=CURRENT_DATE-6 GROUP BY channel ORDER BY total DESC LIMIT 5
    )
    SELECT (SELECT SUM(total) FROM sales WHERE status='completed' AND sold_at>=CURRENT_DATE) AS sales,
      (SELECT SUM(total) FROM purchase_orders WHERE status<>'cancelled' AND created_at>=CURRENT_DATE-6) AS purchases,
      (SELECT SUM(GREATEST(0,available)*cost_price) FROM stock) AS stock_value,
      (SELECT count(*) FROM stock WHERE available<min_stock) AS low,
      (SELECT count(*) FROM stock) AS products,
      (SELECT count(*) FROM orders) AS pending,
      (SELECT count(*) FROM product_lots WHERE is_active AND quantity_remaining>0 AND expiry_date<=CURRENT_DATE+2) AS near,
      (SELECT json_agg(x) FROM (SELECT name,unit,min_stock,available FROM stock ORDER BY available<min_stock DESC,name,id LIMIT 5) x) AS stock_rows,
      (SELECT json_agg(x) FROM (SELECT * FROM orders ORDER BY expected_at NULLS LAST,id LIMIT 4) x) AS agenda,
      (SELECT json_agg(channels) FROM channels) AS channels
  `);
  return result.rows[0];
}
module.exports = { dashboardOverview };
