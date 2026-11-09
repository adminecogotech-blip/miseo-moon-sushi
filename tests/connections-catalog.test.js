const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const vault=require('../lib/connection-vault');
test('provider credentials stay encrypted, bound to provider and field',()=>{
 const prev=process.env.MISEO_CONNECTIONS_KEY;
 try{
  process.env.MISEO_CONNECTIONS_KEY=require('node:crypto').randomBytes(32).toString('base64');
  const value=vault.seal('telegram','TELEGRAM_BOT_TOKEN','fixture-only');
  assert.ok(!value.includes('fixture-only'));assert.equal(vault.reveal('telegram','TELEGRAM_BOT_TOKEN',{TELEGRAM_BOT_TOKEN:value}),'fixture-only');
  assert.throws(()=>vault.reveal('other','TELEGRAM_BOT_TOKEN',{TELEGRAM_BOT_TOKEN:value}));
 }finally{if(prev===undefined)delete process.env.MISEO_CONNECTIONS_KEY;else process.env.MISEO_CONNECTIONS_KEY=prev}
});
test('credential store stays outside backup and provider config',()=>{
 const backup=fs.readFileSync(path.join(__dirname,'../lib/backup.js'),'utf8');
 assert.ok(!backup.includes('app_settings'));assert.ok(!backup.includes('integration_connections'));
 const src=fs.readFileSync(path.join(__dirname,'../lib/connections.js'),'utf8');
 for(const key of ['telegram','whatsapp_cloud','ifood','99food','stone','cielo','rede','getnet','pagbank','mercadopago','safrapay','sumup','infinitepay'])assert.ok(src.includes("key:'"+key+"'"));
 assert.match(src,/if\(!user\.is_master\) return json\(res,403/);
});

test('Telegram verifica bot e chat sem enviar mensagens',async t=>{
 const requests=[];
 t.mock.method(global,'fetch',async (url,options)=>{
   requests.push([url,options]);
   return {ok:true,json:async()=>({ok:true,result:url.endsWith('getMe')?{is_bot:true}:{id:-123}})};
 });
 const previous=process.env.TELEGRAM_BOT_TOKEN;
 try{
   process.env.TELEGRAM_BOT_TOKEN='123:synthetic';
   await require('../lib/message-connections').verify({key:'telegram'},{chat_id:'-123'},{});
   assert.deepEqual(requests.map(([u])=>new URL(u).pathname.split('/').pop()),['getMe','getChat']);
   assert.equal(JSON.parse(requests[1][1].body).chat_id,'-123');
 }finally{if(previous===undefined)delete process.env.TELEGRAM_BOT_TOKEN;else process.env.TELEGRAM_BOT_TOKEN=previous}
});
test('vault refuses writes without an environment key',()=>{
 const old=process.env.MISEO_CONNECTIONS_KEY;
 try{delete process.env.MISEO_CONNECTIONS_KEY;assert.throws(()=>vault.seal('telegram','test','fixture'),/indisponível/)}
 finally{if(old!==undefined)process.env.MISEO_CONNECTIONS_KEY=old}
});
test('WhatsApp reads a fixed Graph endpoint without sending a message',async t=>{
 const env={WHATSAPP_PHONE_NUMBER_ID:process.env.WHATSAPP_PHONE_NUMBER_ID,WHATSAPP_ACCESS_TOKEN:process.env.WHATSAPP_ACCESS_TOKEN};
 try{
   process.env.WHATSAPP_PHONE_NUMBER_ID='123';process.env.WHATSAPP_ACCESS_TOKEN='fixture';
   t.mock.method(global,'fetch',async(url,options)=>{
     assert.equal(new URL(url).hostname,'graph.facebook.com');assert.equal(options.headers.Authorization,'Bearer fixture');
     return {ok:true,json:async()=>({id:'123'})}
   });
   await require('../lib/message-connections').verify({key:'whatsapp_cloud'},{},{});
 }finally{for(const [k,v] of Object.entries(env)){if(v===undefined)delete process.env[k];else process.env[k]=v}}
});
