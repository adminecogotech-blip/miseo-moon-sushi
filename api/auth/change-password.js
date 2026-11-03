const { db, hash, verifyPassword, passwordHash, currentUser, ensureSchema, json, method } = require('../_auth');
module.exports = async function handler(req,res) {
 if(!method(req,res,'POST')) return;
 try {
  const actor=await currentUser(req);
  if(!actor) return json(res,401,{error:'Faça login para continuar.'});
  const current=String(req.body?.currentPassword||''), next=String(req.body?.newPassword||'');
  if(next.length<12) return json(res,400,{error:'A nova senha deve ter pelo menos 12 caracteres.'});
  const r=await db().query('SELECT password_hash FROM app_users WHERE id=$1',[actor.id]);
  if(!r.rowCount || !verifyPassword(current,r.rows[0].password_hash)) return json(res,403,{error:'A senha atual está incorreta.'});
  await db().query('UPDATE app_users SET password_hash=$2,must_change_password=false,updated_at=now() WHERE id=$1',[actor.id,passwordHash(next).value]);
  await db().query('DELETE FROM app_sessions WHERE user_id=$1 AND token_hash<>$2',[actor.id,hash(require('../_auth').cookie(req,'miseo_session'))]);
  return json(res,200,{ok:true,message:'Senha alterada com sucesso.'});
 } catch(e){ console.error('change password error:',e.message); return json(res,503,{error:'Não foi possível alterar a senha.'}); }
};
