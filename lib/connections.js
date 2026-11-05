const { currentUser, json, db, auditEvent } = require('../api/_auth');

const CATALOG = [
 { key:'ifood', name:'iFood', category:'delivery', description:'Pedidos e atualização de status via API oficial.', env:['IFOOD_CLIENT_ID','IFOOD_CLIENT_SECRET'], mode:'API oficial + credenciais de parceiro' },
 { key:'99food', name:'99Food', category:'delivery', description:'Pedidos e status, conforme acesso oficial disponível para a conta.', env:['NINETY_NINE_FOOD_CLIENT_ID','NINETY_NINE_FOOD_CLIENT_SECRET'], mode:'API oficial + credenciais autorizadas' },
 { key:'stone', name:'Stone', category:'payments', description:'Pagamento e fechamento de comanda, conforme produto contratado.', env:['STONE_CLIENT_ID','STONE_CLIENT_SECRET'], mode:'API/SDK/TEF conforme solução contratada' },
 { key:'cielo', name:'Cielo', category:'payments', description:'Pagamento e conciliação conforme produto Cielo habilitado.', env:['CIELO_MERCHANT_ID','CIELO_MERCHANT_KEY'], mode:'API/SDK/TEF conforme solução contratada' },
 { key:'rede', name:'Rede', category:'payments', description:'Pagamento integrado conforme produto e credenciamento.', env:['REDE_PV','REDE_TOKEN'], mode:'API/TEF conforme solução contratada' },
 { key:'getnet', name:'Getnet', category:'payments', description:'Pagamento e conciliação conforme credenciamento.', env:['GETNET_CLIENT_ID','GETNET_CLIENT_SECRET'], mode:'API/SDK conforme solução contratada' },
 { key:'pagbank', name:'PagBank', category:'payments', description:'Cobranças e consulta de pagamento pela API compatível com a conta.', env:['PAGBANK_ACCESS_TOKEN'], mode:'API oficial' },
 { key:'mercadopago', name:'Mercado Pago', category:'payments', description:'Pagamentos e consulta de status por API.', env:['MERCADOPAGO_ACCESS_TOKEN'], mode:'API oficial' },
 { key:'safrapay', name:'SafraPay', category:'payments', description:'Integração depende do produto, credenciamento e protocolo fornecido.', env:['SAFRAPAY_CLIENT_ID','SAFRAPAY_CLIENT_SECRET'], mode:'Validar API/TEF com o adquirente' },
 { key:'sumup', name:'SumUp', category:'payments', description:'Pagamentos conforme recursos e país/conta habilitados.', env:['SUMUP_ACCESS_TOKEN'], mode:'API oficial quando habilitada' },
 { key:'infinitepay', name:'InfinitePay', category:'payments', description:'Integração depende dos recursos oficiais disponibilizados à conta.', env:['INFINITEPAY_API_KEY'], mode:'Confirmar API/protocolo com fornecedor' },
 { key:'whatsapp_cloud', name:'WhatsApp Business Platform (Cloud API)', category:'messaging', description:'Mensagens por API oficial da Meta, com número e templates aprovados quando exigidos.', env:['WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_VERIFY_TOKEN','WHATSAPP_APP_SECRET'], mode:'API oficial da Meta + webhook HTTPS' }
];

module.exports = async function handler(req,res) {
 try {
  const user=await currentUser(req);
  if(!user) return json(res,401,{error:'Faça login para continuar.'});
  if(!user.is_master) return json(res,403,{error:'Somente o administrador da plataforma pode configurar conexões.'});
  if(req.method==='GET') {
   const rows=await db().query('SELECT provider_key,enabled,config,updated_at FROM integration_connections');
   const byKey=new Map(rows.rows.map(r=>[r.provider_key,r]));
   const items=CATALOG.map(p=>{const row=byKey.get(p.key);const missing=p.env.filter(k=>!process.env[k]);return {...p,enabled:!!row?.enabled,config:row?.config||{},credentialsReady:missing.length===0,missingEnvironment:missing,connected:false,status:row?.enabled?(missing.length?'Ativada; credenciais pendentes':'Configurada; teste de conexão pendente'):'Desativada'};});
   return json(res,200,{items,notice:'Ativar salva a preferência. Não confirma conexão nem executa transações. Credenciais são configuradas como secrets no servidor.'});
  }
  if(req.method!=='POST') return json(res,405,{error:'Método não permitido.'});
  const body=req.body||{}, key=String(body.provider_key||''), enabled=body.enabled;
  const provider=CATALOG.find(p=>p.key===key);
  if(!provider || typeof enabled!=='boolean') return json(res,400,{error:'Provedor ou estado inválido.'});
  const config=body.config&&typeof body.config==='object'&&!Array.isArray(body.config)?body.config:{};
  // Explicit allowlist for non-secret settings; secrets must never be submitted by the browser.
  const safeConfig={};
  for(const field of ['environment','location_id','terminal_id','webhook_url','notes']) if(typeof config[field]==='string') safeConfig[field]=config[field].slice(0,300);
  const result=await db().query(
   'INSERT INTO integration_connections(provider_key,display_name,category,enabled,config,created_by,updated_by) VALUES($1,$2,$3,$4,$5::jsonb,$6,$6) ON CONFLICT(provider_key) DO UPDATE SET enabled=EXCLUDED.enabled,config=EXCLUDED.config,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING provider_key,enabled,config,updated_at',
   [provider.key,provider.name,provider.category,enabled,JSON.stringify(safeConfig),user.id]
  );
  await auditEvent(db(),user.id,'integration.connection.updated',provider.key,result.rows[0].provider_key,{enabled,category:provider.category});
  return json(res,200,{ok:true,item:result.rows[0],message:enabled?'Conexão habilitada para configuração; ainda não está homologada.':'Conexão desativada.'});
 } catch(error) {
  console.error('connections API error:',error.message);
  return json(res,503,{error:'Não foi possível carregar/salvar conexões. Confirme se a migration de integrações foi aplicada no ambiente Preview.'});
 }
};
