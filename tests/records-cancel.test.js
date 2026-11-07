const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const apiPath = path.join(__dirname, '..', 'api', 'records.js');
function response() {
  return { statusCode: 200, headers: {}, body: null,
    setHeader(k,v){this.headers[k]=v;}, status(n){this.statusCode=n;return this;},
    json(body){this.body=body;return this;} };
}
function loadApi({ user={id:7,is_master:true,role_key:'master'}, allowed=true, updateRows=1 }={}) {
  const log=[];
  const pool={ async query(sql,params=[]) {
    log.push({sql,params});
    if(sql.includes('SELECT m.is_enabled')) return {rows:[{is_enabled:true,allowed}],rowCount:1};
    if(sql.startsWith('UPDATE ')) return {rows:updateRows?[{id:params[0]}]:[],rowCount:updateRows};
    return {rows:[],rowCount:1};
  }};
  const auth={db:()=>pool,currentUser:async()=>user,
    json:(res,status,body)=>res.status(status).json(body),
    auditEvent:async(...args)=>{log.push({sql:'AUDIT_EVENT',params:args.slice(1)});}};
  const original=Module._load;
  Module._load=function(request,parent,isMain){
    if(parent&&parent.filename===apiPath&&request==='./_auth')return auth;
    return original.call(this,request,parent,isMain);
  };
  delete require.cache[apiPath];
  let handler;
  try { handler=require(apiPath); } finally { Module._load=original; }
  return {handler,log};
}

test('generic sales mutations are blocked so stock reservations cannot be bypassed', async()=>{
  for (const method of ['POST','PATCH','DELETE']) {
    const {handler,log}=loadApi();
    const res=response();
    await handler({method,query:{resource:'sales',id:'42'},body:{id:42,sale_number:'S-42'}},res);
    assert.equal(res.statusCode,409,method);
    assert.equal(log.some(x=>x.sql.startsWith('UPDATE sales') || x.sql.startsWith('INSERT INTO sales')),false,method);
    assert.equal(log.some(x=>x.sql==='AUDIT_EVENT'),false,method);
  }
});
test('generic purchase mutations are blocked so receipts always create lots and movements', async()=>{
  for (const method of ['POST','PATCH','DELETE']) {
    const {handler,log}=loadApi();
    const res=response();
    await handler({method,query:{resource:'purchases',id:'42'},body:{id:42}},res);
    assert.equal(res.statusCode,409,method);
    assert.equal(log.some(x=>x.sql.startsWith('UPDATE purchase_orders') || x.sql.startsWith('INSERT INTO purchase_orders')),false,method);
  }
});
test('DELETE rejects operators without can_delete permission',async()=>{
  const {handler,log}=loadApi({user:{id:9,is_master:false,role_key:'operator'},allowed:false});
  const res=response();
  await handler({method:'DELETE',query:{resource:'products',id:'1'},body:{}},res);
  assert.equal(res.statusCode,403);
  assert.equal(log.some(x=>x.sql.startsWith('UPDATE ')),false);
});
test('DELETE reports conflict when the record is missing or not in a cancellable state',async()=>{
  const {handler}=loadApi({updateRows:0});
  const res=response();
  await handler({method:'DELETE',query:{resource:'purchases',id:'9'},body:{}},res);
  assert.equal(res.statusCode,409);
});
test('DELETE rejects invalid IDs without touching records',async()=>{
  const {handler,log}=loadApi();
  const res=response();
  await handler({method:'DELETE',query:{resource:'tasks',id:'-2'},body:{}},res);
  assert.equal(res.statusCode,400);
  assert.equal(log.some(x=>x.sql.startsWith('UPDATE ')),false);
});
