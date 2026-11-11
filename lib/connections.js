const { currentUser, json, db, auditEvent } = require('../api/_auth');

const vault=require('./connection-vault');
const messaging=require('./message-connections');
const CATALOG = [
 { key:'saipos',name:'Saipos',category:'delivery',description:'Consulta de pedidos do restaurante pela API de Dados da Saipos.',env:['SAIPOS_AUTHORIZATION'],mode:'API de Dados · consulta de vendas' },
 { key:'ifood', name:'iFood', category:'delivery', description:'Pedidos e atualização de status via API oficial.', env:['IFOOD_CLIENT_ID','IFOOD_CLIENT_SECRET'], mode:'API oficial + credenciais de parceiro' },
 { key:'99food', name:'99Food', category:'delivery', description:'Pedidos e status, conforme acesso oficial disponível para a conta.', env:['NINETY_NINE_FOOD_CLIENT_ID','NINETY_NINE_FOOD_CLIENT_SECRET'], mode:'API oficial + credenciais autorizadas' },
 { key:'stone', name:'Stone', category:'payments', description:'Pagamento e fechamento de comanda, conforme produto contratado.', env:[], mode:'Terminal SmartPOS · aplicativo Android homologado' },
 { key:'cielo', name:'Cielo', category:'payments', description:'Pagamento e conciliação conforme produto Cielo habilitado.', env:['CIELO_LIO_CLIENT_ID','CIELO_LIO_MERCHANT_ID','CIELO_LIO_ACCESS_TOKEN'], mode:'Cielo Smart/LIO · integração remota Order Manager' },
 { key:'rede', name:'Rede', category:'payments', description:'Pagamento integrado conforme produto e credenciamento.', env:['REDE_PV','REDE_TOKEN'], mode:'API/TEF conforme solução contratada' },
 { key:'getnet', name:'Getnet', category:'payments', description:'Pagamento e conciliação conforme credenciamento.', env:['GETNET_CLIENT_ID','GETNET_CLIENT_SECRET'], mode:'API/SDK conforme solução contratada' },
 { key:'pagbank', name:'PagBank', category:'payments', description:'Cobranças e consulta de pagamento pela API compatível com a conta.', env:['PAGBANK_ACCESS_TOKEN'], mode:'API oficial' },
 { key:'mercadopago', name:'Mercado Pago', category:'payments', description:'Pagamentos e consulta de status por API.', env:['MERCADOPAGO_ACCESS_TOKEN'], mode:'API oficial' },
 { key:'safrapay', name:'SafraPay', category:'payments', description:'Integração depende do produto, credenciamento e protocolo fornecido.', env:['SAFRAPAY_CLIENT_ID','SAFRAPAY_CLIENT_SECRET'], mode:'Validar API/TEF com o adquirente' },
 { key:'sumup', name:'SumUp', category:'payments', description:'Pagamentos conforme recursos e país/conta habilitados.', env:['SUMUP_ACCESS_TOKEN'], mode:'API oficial quando habilitada' },
 { key:'infinitepay', name:'InfinitePay', category:'payments', description:'Integração depende dos recursos oficiais disponibilizados à conta.', env:[], mode:'Terminal físico · confirmar interface do equipamento com a InfinitePay' },
 { key:'telegram',name:'Telegram Bot',category:'messaging',description:'Bot e chat de destino para mensagens operacionais.',env:['TELEGRAM_BOT_TOKEN'],mode:'Telegram Bot API' },
 { key:'whatsapp_cloud', name:'WhatsApp Business Platform (Cloud API)', category:'messaging', description:'Mensagens por API oficial da Meta, com número e templates aprovados quando exigidos.', env:['WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_VERIFY_TOKEN','WHATSAPP_APP_SECRET'], mode:'API oficial da Meta + webhook HTTPS' }
];

module.exports = async function handler(req,res) {
 try {
  const user=await currentUser(req);
  if(!user) return json(res,401,{error:'Faça login para continuar.'});
  if(!user.is_master) return json(res,403,{error:'Somente o administrador da plataforma pode configurar conexões.'});
  if(req.method==='GET') {
   const rows=await db().query("SELECT c.provider_key,c.enabled,c.config,c.updated_at,ARRAY(SELECT jsonb_object_keys(v.setting_value)) AS credential_names FROM integration_connections c LEFT JOIN app_settings v ON v.setting_key='connection_vault:'||c.provider_key");
   const byKey=new Map(rows.rows.map(r=>[r.provider_key,r]));
   return json(res,200,{vaultReady:vault.ready(),items:CATALOG.map(p=>{
     const row=byKey.get(p.key),configured=p.env.filter(k=>row?.credential_names?.includes(k)||!!process.env[k]);
     return {...p,enabled:!!row?.enabled,config:row?.config||{},configured,fields:messaging.fields(p),canVerify:['saipos','ifood','telegram','whatsapp_cloud'].includes(p.key)};
   })});
  }
  if(req.method!=='POST')return json(res,405,{error:'Método não permitido.'});
  if(!String(req.headers?.['content-type']||'').includes('application/json'))return json(res,415,{error:'Envie JSON.'});
  const body=req.body||{},provider=CATALOG.find(p=>p.key===body.provider_key);
  if(!provider)return json(res,400,{error:'Provedor inválido.'});
  const vaultId='connection_vault:'+provider.key;
  if(body.action==='verify'){
    const data=await db().query('SELECT c.config,v.setting_value FROM integration_connections c LEFT JOIN app_settings v ON v.setting_key=$2 WHERE c.provider_key=$1',[provider.key,vaultId]);
    const row=data.rows[0];if(!row)return json(res,400,{error:'Salve os campos primeiro.'});
    const message=await messaging.verify(provider,row.config,row.setting_value);
    return json(res,200,{message});
  }
  if(typeof body.enabled!=='boolean')return json(res,400,{error:'Estado inválido.'});
  const config={},sealed={};
  for(const [name,value] of Object.entries(body.config||{})){
    if(!messaging.fields(provider).some(([k])=>k===name)||typeof value!=='string'||value.length>200)return json(res,400,{error:'Campo de configuração inválido.'});
    config[name]=value.trim();
  }
  if(provider.key==='telegram' && config.chat_id && !/^(?:-?\d+|@[A-Za-z0-9_]{5,32})$/.test(config.chat_id))return json(res,400,{error:'Chat inválido.'});
  for(const [name,value] of Object.entries(body.credentials||{})){
    if(!provider.env.includes(name)||typeof value!=='string'||!value.trim()||value.length>8192)return json(res,400,{error:'Credencial inválida.'});
    sealed[name]=vault.seal(provider.key,name,value.trim());
  }
  const client=await db().connect();
  try{
    await client.query('BEGIN');
    await client.query(`INSERT INTO integration_connections(provider_key,display_name,category,enabled,config,created_by,updated_by)
      VALUES($1,$2,$3,$4,$5::jsonb,$6,$6) ON CONFLICT(provider_key) DO UPDATE SET enabled=EXCLUDED.enabled,config=integration_connections.config||EXCLUDED.config,updated_by=EXCLUDED.updated_by,updated_at=now()`,[provider.key,provider.name,provider.category,body.enabled,JSON.stringify(config),user.id]);
    if(Object.keys(sealed).length)await client.query('INSERT INTO app_settings(setting_key,setting_value) VALUES($1,$2::jsonb) ON CONFLICT(setting_key) DO UPDATE SET setting_value=app_settings.setting_value||EXCLUDED.setting_value,updated_at=now()',[vaultId,JSON.stringify(sealed)]);
    await auditEvent(client,user.id,'integration.connection.updated',provider.key,null,{enabled:body.enabled});
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  return json(res,200,{message:'Configuração salva.'});
 }catch(error){return json(res,error.status||503,{error:error.status?error.message:'Serviço de integrações indisponível.'})}
};
