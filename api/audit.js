const { db, currentUser, json, method } = require('./_auth');

module.exports = async function handler(req, res) {
  if (!method(req, res, 'GET')) return;
  try {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'Faça login para continuar.' });
    if (!user.is_master) {
      const permission = await db().query('SELECT m.is_enabled, rp.can_view FROM app_modules m LEFT JOIN role_permissions rp ON rp.module_key=m.module_key AND rp.role_key=$1 WHERE m.module_key=$2 LIMIT 1', [user.role_key, 'inventory_audit']);
      if (!permission.rows[0] || !permission.rows[0].is_enabled || permission.rows[0].can_view !== true) return json(res, 403, { error: 'Seu perfil não tem permissão para consultar a auditoria.' });
    }
    const result = await db().query('SELECT a.id,a.action,a.entity_type,a.entity_id,a.details,a.created_at,u.username AS actor_username,u.display_name AS actor_name FROM audit_logs a LEFT JOIN app_users u ON u.id=a.user_id ORDER BY a.created_at DESC,a.id DESC LIMIT 300');
    return json(res, 200, { items: result.rows });
  } catch (e) {
    console.error('audit API error:', e.message);
    return json(res, 503, { error: 'Não foi possível carregar a auditoria.' });
  }
};
