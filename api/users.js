const { db, passwordHash, currentUser, json, method } = require('./_auth');
module.exports = async function handler(req,res) {
 try {
  const actor=await currentUser(req);
  if(!actor) return json(res,401,{error:'Faça login para continuar.'});
  if(!actor.is_master) return json(res,403,{error:'Apenas o administrador mestre pode gerenciar usuários.'});
  if(req.method==='GET') {
   const r=await db().query(`SELECT u.id,u.display_name AS name,u.username AS email,u.role_key AS role,u.is_active,u.must_change_password,u.created_at
    FROM app_users u JOIN app_roles r ON r.role_key=u.role_key WHERE r.is_master=false ORDER BY u.display_name,u.username`);
   return json(res,200,{users:r.rows});
  }
  if(req.method==='POST') {
   const name=String(req.body?.name||'').trim(), email=String(req.body?.email||'').trim().toLowerCase(), password=String(req.body?.password||''), role=String(req.body?.role||'operator');
   if(name.length<2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res,400,{error:'Informe nome e e-mail válidos.'});
   if(password.length<12) return json(res,400,{error:'A senha inicial deve ter pelo menos 12 caracteres.'});
   if(!['operator'].includes(role)) return json(res,400,{error:'Perfil não permitido.'});
   const encoded=passwordHash(password).value;
   const r=await db().query('INSERT INTO app_users(username,display_name,password_hash,role_key,is_active,must_change_password) VALUES($1,$2,$3,$4,true,true) RETURNING id,display_name AS name,username AS email,role_key AS role,is_active,must_change_password,created_at',[email,name,encoded,role]);
   return json(res,201,{user:r.rows[0]});
  }
  if(req.method==='PATCH') {
   const id=Number(req.body?.id), active=req.body?.is_active;
   if(!Number.isSafeInteger(id) || typeof active!=='boolean') return json(res,400,{error:'Informe o usuário e o estado de ativação.'});
   const r=await db().query(`UPDATE app_users u SET is_active=$2,updated_at=now() FROM app_roles r
    WHERE u.id=$1 AND u.role_key=r.role_key AND r.is_master=false RETURNING u.id,u.username AS email,u.is_active`,[id,active]);
   if(!r.rowCount) return json(res,404,{error:'Usuário não encontrado.'});
   return json(res,200,{user:r.rows[0]});
  }
  return json(res,405,{error:'Método não permitido.'});
 } catch(e){ if(e.code==='23505') return json(res,409,{error:'Já existe uma conta com esse e-mail.'}); console.error('users api error:',e.message); return json(res,503,{error:'Não foi possível processar a solicitação.'}); }
};
