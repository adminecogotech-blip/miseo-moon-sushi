const { db, ensureSchema, json, method } = require('./_auth');
module.exports = async function handler(req,res) {
  if (!method(req,res,'GET')) return;
  try {
    await ensureSchema();
    const result = await db().query(`
      SELECT current_database() AS database_name,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='app_users') AS users_table,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='app_sessions') AS sessions_table,
        EXISTS (SELECT 1 FROM app_users u JOIN app_roles r ON r.role_key=u.role_key WHERE r.is_master=true) AS admin_initialized,
        (SELECT setting_value->>'environment' FROM app_settings WHERE setting_key='tenant' LIMIT 1) AS environment
    `);
    const row = result.rows[0];
    return json(res,200,{
      service:'MISEO | Moon Fish',
      status:'ok',
      database:'connected',
      databaseName:row.database_name,
      revision:process.env.VERCEL_GIT_COMMIT_SHA || null,
      gitBranch:process.env.VERCEL_GIT_COMMIT_REF || null,
      environment:row.environment || 'unknown',
      usersTable:row.users_table,
      sessionsTable:row.sessions_table,
      administratorInitialized:row.admin_initialized,
      note:'Este diagnóstico não expõe credenciais nem dados de usuários.'
    });
  } catch(e) {
    console.error('health check error:',e.message);
    return json(res,503,{service:'MISEO | Moon Fish',status:'error',database:'unavailable',message:'Banco ou esquema ainda não está disponível.'});
  }
};
