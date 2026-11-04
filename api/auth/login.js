const { db, hash, verifyPassword, setCookie, ensureSchema, json, method } = require('../_auth');
const crypto = require('crypto');
module.exports = async function handler(req,res) {
  if (!method(req,res,'POST')) return;
  try {
    await ensureSchema();
    const username = String(req.body?.username || req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!username || !password) return json(res,400,{error:'Informe usuário e senha.'});
    const result = await db().query(`SELECT u.id,u.username,u.display_name,u.password_hash,u.role_key,u.is_active,u.must_change_password,r.is_master
      FROM app_users u JOIN app_roles r ON r.role_key=u.role_key WHERE lower(u.username)=lower($1) LIMIT 1`,[username]);
    const user = result.rows[0];
    if (!user || !user.is_active || !verifyPassword(password,user.password_hash)) return json(res,401,{error:'Usuário ou senha inválidos.'});
    const token = crypto.randomBytes(32).toString('base64url');
    await db().query('INSERT INTO app_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval \'12 hours\')',[user.id,hash(token)]);
    setCookie(res,token);
    return json(res,200,{user:{id:user.id,username:user.username,email:user.username,name:user.display_name,role:user.role_key,isMaster:user.is_master,mustChangePassword:user.must_change_password}});
  } catch(e) { console.error('auth login error:',e.message); return json(res,503,{error:'Serviço de autenticação indisponível.'}); }
};
