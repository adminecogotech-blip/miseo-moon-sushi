const { db, currentUser, json, method } = require('./_auth');
module.exports = async function handler(req,res) {
  if (!method(req,res,'GET')) return;
  try {
    const user = await currentUser(req);
    if (!user) return json(res,401,{error:'Faça login para continuar.'});
    const result = await db().query(`
      SELECT
        (SELECT count(*)::int FROM products WHERE is_active=true) AS products,
        (SELECT count(*)::int FROM production_tasks) AS production_tasks,
        (SELECT count(*)::int FROM purchase_orders) AS purchase_orders,
        (SELECT count(*)::int FROM suppliers) AS suppliers
    `);
    const row = result.rows[0];
    const overview = user.is_master ? await require('../lib/dashboard-overview').dashboardOverview() : null;
    return json(res,200,{overview,counts:{
      products:row.products,
      productionTasks:row.production_tasks,
      purchaseOrders:row.purchase_orders,
      suppliers:row.suppliers
    }});
  } catch(e) {
    console.error('dashboard error:',e.message);
    return json(res,503,{error:'Não foi possível carregar os indicadores.'});
  }
};
