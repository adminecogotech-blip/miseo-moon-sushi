const vault=require('./connection-vault');
const publicFields={
 saipos:[['store_id','ID da loja Saipos']],stone:[['stone_code','StoneCode do estabelecimento'],['terminal_id','Número de série do terminal'],['model','Modelo SmartPOS']],cielo:[['terminal_id','Identificação do terminal Smart/LIO']],infinitepay:[['handle','InfiniteTag da conta'],['terminal_id','Número de série'],['model','Modelo do terminal']],
 telegram:[['chat_id','ID do chat ou @canal']],whatsapp_cloud:[['business_account_id','ID da conta WhatsApp Business']],
 ifood:[['merchant_id','ID da loja (merchant ID)']],'99food':[['location_id','ID da loja']],
};
function fields(provider){return publicFields[provider.key]||[['location_id','Identificação do estabelecimento'],['terminal_id','Terminal / ponto de venda']]}
async function verify(provider,config,stored){
 const secret=name=>vault.reveal(provider.key,name,stored);
 const get=async(url,options={})=>{
   const response=await fetch(url,{...options,signal:AbortSignal.timeout(8000),redirect:'error'});
   if(!response.ok)throw Object.assign(new Error('O provedor recusou a consulta. Confira os identificadores, a credencial e as permissões.'),{status:422});
   return response.json();
 };
 if(provider.key==='saipos'){
   const auth=secret('SAIPOS_AUTHORIZATION');
   if(!auth)throw Object.assign(new Error('Informe a autorização da API de Dados.'),{status:400});
   const end=new Date(),start=new Date(end.getTime()-60000);
   const query=new URLSearchParams({p_date_column_filter:'created_at',p_filter_date_start:start.toISOString(),p_filter_date_end:end.toISOString(),p_limit:'1',p_offset:'0'});
   await get('https://data.saipos.io/v1/search_sales?'+query,{headers:{Authorization:auth,Accept:'application/json'}});
   return 'A API de Dados aceitou a consulta de pedidos.';
 }
 if(provider.key==='ifood'){
   const clientId=secret('IFOOD_CLIENT_ID'),clientSecret=secret('IFOOD_CLIENT_SECRET');
   if(!clientId||!clientSecret||!config.merchant_id)throw Object.assign(new Error('Informe a loja, o Client ID e o Client secret.'),{status:400});
   const base='https://merchant-api.ifood.com.br';
   const token=await get(base+'/authentication/v1.0/oauth/token',{method:'POST',body:new URLSearchParams({grantType:'client_credentials',clientId,clientSecret})});
   if(!token.accessToken)throw Object.assign(new Error('O iFood não confirmou a credencial.'),{status:422});
   const store=await get(base+'/merchant/v1.0/merchants/'+encodeURIComponent(config.merchant_id),{headers:{Authorization:'Bearer '+token.accessToken}});
   if(store.id!==config.merchant_id)throw Object.assign(new Error('A loja não foi confirmada.'),{status:422});
   return 'Aplicação autenticada e loja confirmada pelo iFood.';
 }
 if(provider.key==='telegram'){
   const token=secret('TELEGRAM_BOT_TOKEN');
   if(!/^\d+:[A-Za-z0-9_-]+$/.test(token||'') || !config.chat_id)throw Object.assign(new Error('Informe o token do bot e o chat de destino.'),{status:400});
   const base='https://api.telegram.org/bot'+token+'/';
   const bot=await get(base+'getMe'),chat=await get(base+'getChat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:config.chat_id})});
   if(!bot.ok||!bot.result?.is_bot||!chat.ok||!chat.result?.id)throw Object.assign(new Error('Bot ou chat indisponível.'),{status:422});
   return 'Bot autenticado e chat localizado.';
 }
 if(provider.key==='whatsapp_cloud'){
   const phone=secret('WHATSAPP_PHONE_NUMBER_ID'),token=secret('WHATSAPP_ACCESS_TOKEN');
   if(!/^\d+$/.test(phone||'')||!token)throw Object.assign(new Error('Informe o ID do número e o token da Meta.'),{status:400});
   const result=await get('https://graph.facebook.com/v23.0/'+phone+'?fields=id',{headers:{Authorization:'Bearer '+token}});
   if(result.id!==phone)throw Object.assign(new Error('O número informado não foi confirmado.'),{status:422});
   return 'Número do WhatsApp confirmado pela Meta.';
 }
 throw Object.assign(new Error('Teste automático indisponível para este produto.'),{status:400});
}
module.exports={fields,verify};
