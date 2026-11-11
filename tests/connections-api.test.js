const test=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path');
const target=path.resolve(__dirname,'../lib/connections.js');
function load(user,queries){
 const query=async(sql,params)=>{queries.push({sql,params});return {rows:sql.startsWith('SELECT')?[{provider_key:'telegram',enabled:true,config:{chat_id:'-123'},credential_names:['TELEGRAM_BOT_TOKEN']}]:[]}};
 const mock={currentUser:async()=>user,json:(res,status,body)=>Object.assign(res,{status,body}),db:()=>({query,connect:async()=>({query,release(){}})}),auditEvent:async(...args)=>queries.push({audit:args.slice(1)})};
 const original=Module._load;Module._load=function(name,parent,...rest){return parent?.filename===target&&name==='../api/_auth'?mock:original.call(this,name,parent,...rest)};
 try{delete require.cache[target];return require(target)}finally{Module._load=original}
}
test('connection API denies non-admins before accessing stored configuration',async()=>{
 for(const user of [null,{id:1,is_master:false}]){const queries=[],res={};await load(user,queries)({method:'GET'},res);assert.equal(res.status,user?403:401);assert.equal(queries.length,0)}
});
test('connection API encrypts secrets transactionally and never echoes them',async()=>{
 const prior=process.env.MISEO_CONNECTIONS_KEY;process.env.MISEO_CONNECTIONS_KEY=require('node:crypto').randomBytes(32).toString('base64');
 try{const queries=[],handler=load({id:1,is_master:true},queries),res={};
 await handler({method:'POST',headers:{'content-type':'application/json'},body:{provider_key:'telegram',enabled:false,config:{chat_id:'-123'},credentials:{TELEGRAM_BOT_TOKEN:'123:synthetic-test-value'}}},res);
 assert.equal(res.status,200);assert.ok(!JSON.stringify(queries).includes('123:synthetic-test-value'));assert.ok(!JSON.stringify(res).includes('synthetic-test-value'));
 const write=queries.find(x=>x.sql?.startsWith('INSERT INTO app_settings'));assert.equal(require('../lib/connection-vault').reveal('telegram','TELEGRAM_BOT_TOKEN',JSON.parse(write.params[1])),'123:synthetic-test-value');
 assert.ok(queries.some(x=>x.sql==='COMMIT'));assert.match(queries.find(x=>x.sql?.startsWith('INSERT INTO integration')).sql,/config=integration_connections.config\|\|EXCLUDED.config/);
 const read={};await handler({method:'GET'},read);assert.equal(read.status,200);const bot=read.body.items.find(p=>p.key==='telegram');assert.deepEqual(bot.configured,['TELEGRAM_BOT_TOKEN']);assert.equal(bot.credentials,undefined);
 }finally{if(prior===undefined)delete process.env.MISEO_CONNECTIONS_KEY;else process.env.MISEO_CONNECTIONS_KEY=prior}
});
