const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('mobile approval: five navigation actions and a non-overlapping responsive shell',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../assets/mobile-parity.css'),'utf8');
 assert.match(html,/id="mobilebottom"/);
 assert.match(html,/id="mobileMorePanel"/);
 assert.match(html,/data-mobile-page="planejamento"/);
 assert.match(html,/mobile-parity\.css/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/overflow-x:auto!important/);
});
test('connections UI offers Saipos and Telegram safe config fields',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const fields=fs.readFileSync(path.join(__dirname,'../lib/message-connections.js'),'utf8');
 assert.match(fields,/chat_id/);
 assert.match(fields,/store_id/);
});

test('stale asynchronous page responses are discarded after navigation',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(html,/let navigationEpoch=0/);
 assert.match(html,/if\(epoch!==navigationEpoch\|\|\$\('#app'\)\.dataset\.activePage/);
});
