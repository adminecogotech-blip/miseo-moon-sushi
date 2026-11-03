const { db, passwordHash, ensureSchema, json, method } = require('../_auth');
module.exports = async function handler(req,res) {
 if(!method(req,res,'POST')) return;
 try {
  if(!process.env.ADMIN_BOOTSTRAP_TOKEN || !process.env.DATABASE_URL) return json(res,503,{error:'Configuração inicial indisponível.'});
  const token=String(req.body?.token||'');
  if(token.length<20 || token!==process.env.ADMIN_BOOTSTRAP_TOKEN) return json(res,403,{error:'Token de configuração inválido.'});
  const username=String(req.body?.username||'').trim().toLowerCase();
  const displayName=String(req.body?.displayName||'Administrador MISEO').trim();
  const password=String(req.body?.password||'');
  if(!/^[a-z0-9._-]{3,80}$/.test(username) || displayName.length<2) return json(res,400,{error:'Informe um usuário válido e nome do administrador.'});
  if(password.length<12) return json(res,400,{error:'Crie uma senha com pelo menos 12 caracteres.'});
  await ensureSchema();
  const existingMaster=await db().query('SELECT u.id FROM app_users u JOIN app_roles r ON r.role_key=u.role_key WHERE r.is_master=true LIMIT 1');
  if(existingMaster.rowCount) return json(res,409,{error:'O bootstrap administrativo já foi utilizado. Use o login normal.'});
  const exists=await db().query('SELECT id FROM app_users WHERE lower(username)=lower($1) LIMIT 1',[username]);
  if(exists.rowCount) return json(res,409,{error:'Já existe uma conta com esse usuário.'});
  const roles=await db().query("SELECT role_key FROM app_roles WHERE is_master=true ORDER BY role_key LIMIT 1");
  if(!roles.rowCount) return json(res,503,{error:'Perfil administrador mestre não está configurado.'});
  const encoded=passwordHash(password).value;
  await db().query('INSERT INTO app_users(username,display_name,password_hash,role_key,is_active,must_change_password) VALUES($1,$2,$3,$4,true,false)',[username,displayName,encoded,roles.rows[0].role_key]);
  return json(res,201,{ok:true,message:'Conta administradora criada. Por segurança, remova ADMIN_BOOTSTRAP_TOKEN das variáveis do projeto após o primeiro acesso.'});
 } catch(e){ console.error('auth bootstrap error:',e.message); return json(res,503,{error:'Não foi possível inicializar a conta.'}); }
};
