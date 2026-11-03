const { db, passwordHash, currentUser, json } = require('./_auth');
const crypto = require('crypto');
module.exports = async function handler(req,res) {
 try {
  const actor=await currentUser(req);
  if(!actor) return json(res,401,{error:'Faça login para continuar.'});
  if(!actor.is_master) return json(res,403,{error:'Apenas um administrador da plataforma pode gerenciar usuários e perfis.'});
  if(req.method==='GET') {
   const r=await db().query(`SELECT u.id,u.display_name AS name,u.username AS username,u.username AS email,u.role_key AS role,u.is_active,u.must_change_password,u.created_at
    FROM app_users u ORDER BY u.display_name,u.username`);
   return json(res,200,{users:r.rows});
  }
  if(req.method==='POST') {
   const name=String(req.body?.name||'').trim(), username=String(req.body?.username||req.body?.email||'').trim().toLowerCase(), password=String(req.body?.password||''), role=String(req.body?.role||'operator');
   if(name.length<2 || !/^[a-z0-9._-]{3,80}$/.test(username)) return json(res,400,{error:'Informe nome e usuário válido (3 a 80 caracteres: letras, números, ponto, hífen ou sublinhado).'});
   if(password.length<12) return json(res,400,{error:'A senha inicial deve ter pelo menos 12 caracteres.'});
   if(!['operator','master'].includes(role)) return json(res,400,{error:'Perfil não permitido.'});
   const exists=await db().query('SELECT 1 FROM app_roles WHERE role_key=$1',[role]);
   if(!exists.rowCount) return json(res,400,{error:'Esse perfil não está configurado.'});
   const encoded=passwordHash(password).value;
   const r=await db().query('INSERT INTO app_users(username,display_name,password_hash,role_key,is_active,must_change_password) VALUES($1,$2,$3,$4,true,true) RETURNING id,display_name AS name,username,username AS email,role_key AS role,is_active,must_change_password,created_at',[username,name,encoded,role]);
   return json(res,201,{user:r.rows[0]});
  }
  if(req.method==='PATCH') {
   const id=Number(req.body?.id);
   if(!Number.isSafeInteger(id)||id<=0) return json(res,400,{error:'Informe um usuário válido.'});
   if(req.body?.reset_password===true) {
    if(id===Number(actor.id)) return json(res,400,{error:'Para sua própria conta, use a troca de senha no perfil.'});
    const temporaryPassword=crypto.randomBytes(18).toString('base64url');
    const client=await db().connect();
    try {
     await client.query('BEGIN');
     const target=await client.query('SELECT id FROM app_users WHERE id=$1 FOR UPDATE',[id]);
     if(!target.rowCount) { await client.query('ROLLBACK'); return json(res,404,{error:'Usuário não encontrado.'}); }
     await client.query('UPDATE app_users SET password_hash=$2,must_change_password=true,updated_at=now() WHERE id=$1',[id,passwordHash(temporaryPassword).value]);
     await client.query('DELETE FROM app_sessions WHERE user_id=$1',[id]);
     await client.query('COMMIT');
     return json(res,200,{ok:true,temporaryPassword,message:'Senha temporária criada. Ela será exibida apenas nesta resposta; compartilhe-a por um canal seguro.'});
    } catch(e) { await client.query('ROLLBACK').catch(()=>{}); throw e; }
    finally { client.release(); }
   }
   if(typeof req.body?.is_active==='boolean') {
    if(id===Number(actor.id)&&req.body.is_active===false) return json(res,400,{error:'Você não pode desativar sua própria conta.'});
    const target=await db().query('SELECT u.id,u.role_key,u.is_active,r.is_master FROM app_users u JOIN app_roles r ON r.role_key=u.role_key WHERE u.id=$1',[id]);
    if(!target.rowCount) return json(res,404,{error:'Usuário não encontrado.'});
    if(target.rows[0].is_master && (req.body.is_active===false || target.rows[0].is_active===false)) {
     const count=await db().query(`SELECT count(*)::int AS n FROM app_users u JOIN app_roles r ON r.role_key=u.role_key WHERE r.is_master=true AND u.is_active=true`);
     if(count.rows[0].n<=1) return json(res,400,{error:'Não é possível desativar o último administrador ativo.'});
    }
    const r=await db().query('UPDATE app_users SET is_active=$2,updated_at=now() WHERE id=$1 RETURNING id,username,username AS email,is_active,role_key AS role',[id,req.body.is_active]);
    return json(res,200,{user:r.rows[0]});
   }
   const role=String(req.body?.role||'');
   if(!['operator','master'].includes(role)) return json(res,400,{error:'Perfil não permitido.'});
   if(id===Number(actor.id)&&role!=='master') return json(res,400,{error:'Você não pode retirar o perfil administrador da própria conta.'});
   const target=await db().query('SELECT u.id,u.role_key,r.is_master FROM app_users u JOIN app_roles r ON r.role_key=u.role_key WHERE u.id=$1',[id]);
   if(!target.rowCount) return json(res,404,{error:'Usuário não encontrado.'});
   if(target.rows[0].is_master && role!=='master') {
    const count=await db().query(`SELECT count(*)::int AS n FROM app_users u JOIN app_roles r ON r.role_key=u.role_key WHERE r.is_master=true AND u.is_active=true`);
    if(count.rows[0].n<=1) return json(res,400,{error:'Mantenha pelo menos um administrador ativo na plataforma.'});
   }
   const r=await db().query('UPDATE app_users SET role_key=$2,updated_at=now() WHERE id=$1 RETURNING id,username,username AS email,role_key AS role,is_active',[id,role]);
   return json(res,200,{user:r.rows[0]});
  }
  return json(res,405,{error:'Método não permitido.'});
 } catch(e){ if(e.code==='23505') return json(res,409,{error:'Já existe uma conta com esse usuário.'}); console.error('users api error:',e.message); return json(res,503,{error:'Não foi possível processar a solicitação.'}); }
};
