const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('purchase receipts use the existing schema status and stop after full receipt',async()=>{
 const state={status:'draft',received:0,lots:0,movements:0};let snapshot;
 const result=rows=>({rows,rowCount:rows.length});
 const client={release(){},async query(sql,args=[]){
  if(sql==='BEGIN'){snapshot={...state};return result([])}
  if(sql==='ROLLBACK'){Object.assign(state,snapshot);return result([])}
  if(sql==='COMMIT')return result([]);
  if(sql.startsWith('SELECT id,status'))return result([{id:1,status:state.status}]);
  if(sql.startsWith('SELECT i.id'))return result([{id:1,product_id:2,quantity:4,received_quantity:state.received}]);
  if(sql.startsWith('UPDATE purchase_order_items')){state.received+=args[0];return result([])}
  if(sql.startsWith('INSERT INTO product_lots')){state.lots++;return result([{id:state.lots}])}
  if(sql.startsWith('INSERT INTO stock_movements')){state.movements++;return result([])}
  if(sql.startsWith('SELECT COALESCE(SUM(quantity-received_quantity)'))return result([{pending:4-state.received}]);
  if(sql.startsWith('UPDATE purchase_orders')){
   assert.ok(['draft','sent','partially_received','received','cancelled'].includes(args[0]),'must satisfy purchase_orders_status_check');
   state.status=args[0];return result([]);
  }
  throw new Error('Unexpected query: '+sql);
 }};
 const context={module:{exports:{}},console,require:()=>({db:()=>({connect:async()=>client}),currentUser:async()=>({id:1,is_master:true}),auditEvent:async()=>true,json:(res,status,body)=>({status,body})})};
 vm.runInNewContext(fs.readFileSync('lib/workflows.js','utf8'),context);
 const receive=quantity=>context.module.exports({method:'PATCH',query:{kind:'purchases'},body:{id:1,items:[{product_id:2,quantity,expiry_date:'2027-01-01'}]}},{});
 const partial=await receive(2);assert.equal(partial.status,200);assert.equal(partial.body.status,'partially_received');
 const rejected=await receive(3);assert.equal(rejected.status,409);assert.equal(state.received,2);assert.equal(state.lots,1);
 const full=await receive(2);assert.equal(full.status,200);assert.equal(full.body.status,'received');
 assert.equal((await receive(1)).status,409);assert.equal(state.received,4);assert.equal(state.lots,2);assert.equal(state.movements,2);
});
