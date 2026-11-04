const { currentUser, json, db } = require('../api/_auth');
module.exports = async function handler(req,res){
 try{
  const user=await currentUser(req);if(!user)return json(res,401,{error:'Faça login para continuar.'});
  if(!user.is_master){
   const p=await db().query("SELECT m.is_enabled,rp.can_view FROM app_modules m LEFT JOIN role_permissions rp ON rp.module_key=m.module_key AND rp.role_key=$1 WHERE m.module_key='integrations'",[user.role_key]);
   if(!p.rows[0]?.is_enabled||p.rows[0]?.can_view!==true)return json(res,403,{error:'Sem permissão para consultar integrações.'});
  }
  if(req.method!=='GET')return json(res,405,{error:'Método não permitido.'});
  const configured=!!process.env.TINY_ACCESS_TOKEN;
  if(!configured)return json(res,200,{provider:'Tiny Olist ERP',apiVersion:'v3',configured:false,connected:false,message:'Configure TINY_ACCESS_TOKEN como variável secreta no ambiente Preview para executar a verificação de leitura.'});
  const response=await fetch('https://api.tiny.com.br/public-api/v3/produtos?limit=1',{headers:{Authorization:'Bearer '+process.env.TINY_ACCESS_TOKEN,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  if(response.status===401||response.status===403)return json(res,200,{provider:'Tiny Olist ERP',apiVersion:'v3',configured:true,connected:false,message:'A credencial foi recusada ou não possui permissão de leitura de produtos.'});
  if(!response.ok)return json(res,502,{provider:'Tiny Olist ERP',apiVersion:'v3',configured:true,connected:false,message:'A API do ERP respondeu com HTTP '+response.status+'.'});
  const payload=await response.json();
  return json(res,200,{provider:'Tiny Olist ERP',apiVersion:'v3',configured:true,connected:true,readTest:'passed',hasPayload:!!payload});
 }catch(e){console.error('Tiny integration check failed:',e.message);return json(res,503,{provider:'Tiny Olist ERP',connected:false,message:'Não foi possível verificar a conexão agora.'});}
};
