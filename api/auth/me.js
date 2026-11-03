const { currentUser, json } = require('../_auth');
module.exports = async function handler(req,res) {
 try { const user=await currentUser(req); if(!user) return json(res,401,{user:null}); return json(res,200,{user:{id:user.id,email:user.email,name:user.name,role:user.role_key,isMaster:user.is_master,mustChangePassword:user.must_change_password}}); }
 catch(e){ console.error('auth session error:',e.message); return json(res,503,{error:'Serviço de autenticação indisponível.'}); }
};
