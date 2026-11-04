const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const base = (process.env.BASE_URL || '').replace(/\/$/, '');
const user = process.env.QA_USER || 'qa-admin';
const pass = process.env.QA_PASSWORD || '';
async function api(page, path, method='GET', body) {
 return page.evaluate(async ({path,method,body}) => { const r=await fetch(path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}); let d={}; try{d=await r.json()}catch{} return {status:r.status,body:d}; },{path,method,body});
}
test('isolated preview E2E: login, navigation, CRUD, stock-lot consistency, reports, audit, backup and permissions',{skip:!base||process.env.RUN_PREVIEW_E2E!=='true',timeout:180000},async()=>{
 const hr=await fetch(base+'/api/health'); assert.equal(hr.status,200); const health=await hr.json(); assert.equal(health.environment,'preview','Safety gate: refusing to mutate a non-preview database'); assert.equal(health.database,'connected'); assert.equal(health.administratorInitialized,true);
 const browser=await chromium.launch({headless:true}); const context=await browser.newContext({viewport:{width:1440,height:1000}}); const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
 try {
  await fs.mkdir('artifacts/screenshots',{recursive:true});
  await page.addInitScript(()=>localStorage.setItem('miseo_menu_collapsed','1')); await page.goto(base,{waitUntil:'domcontentloaded'}); await page.locator('#username').waitFor({state:'visible',timeout:15000});
  for(const width of [1440,1024,768,390]) { await page.setViewportSize({width,height:900}); await page.waitForTimeout(100); const d=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth})); assert.ok(d.s<=d.w+1,'login horizontal overflow at '+width+': '+JSON.stringify(d)); await page.screenshot({path:'artifacts/screenshots/login-'+width+'.png',fullPage:true}); }
  assert.ok(pass,'Set QA_PASSWORD as a GitHub Actions secret; refusing to use a fallback credential');
  await page.locator('#username').fill(user); await page.locator('#password').fill(pass); await page.locator('#loginButton').click(); await page.locator('#app').waitFor({state:'visible',timeout:15000});
   assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('menu-collapsed')),false,'legacy collapsed-menu preference must not hide the approved sidebar on first load');
   await page.setViewportSize({width:1440,height:900}); const side=await page.locator('.sidebar').boundingBox(); assert.ok(side&&Math.abs(side.width-238)<=2,'desktop sidebar should match the approved 238px width: '+JSON.stringify(side));
   for(const width of [1440,1024,768,390]) { await page.setViewportSize({width,height:900}); await page.waitForTimeout(100); const d=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth})); assert.ok(d.s<=d.w+1,'dashboard horizontal overflow at '+width+': '+JSON.stringify(d)); await page.screenshot({path:'artifacts/screenshots/dashboard-'+width+'.png',fullPage:true}); }
   await page.setViewportSize({width:1440,height:900});
  assert.equal((await api(page,'/api/auth/me')).body.user.username,user);
  for(const m of ['inicio','estoque','compras','producao','vendas','planejamento','agenda','relatorios','fornecedores','validade','auditoria','integracoes','usuarios','config','backup','manual']) { const b=page.locator('[data-page="'+m+'"]').first(); await b.click(); await page.waitForTimeout(60); assert.equal(await b.count(),1,'missing navigation '+m); }
  await page.locator('#menuToggle').click(); await page.locator('#themeToggle').click(); await page.locator('[data-page="manual"]').click(); await page.getByText('Manual operacional — homologação').waitFor({state:'visible'});
  for(const width of [1440,1024,768,390]) { await page.setViewportSize({width,height:900}); await page.waitForTimeout(80); const d=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth})); assert.ok(d.s<=d.w+1,'horizontal overflow at '+width+': '+JSON.stringify(d)); }
  const n=Date.now().toString();
  const p=await api(page,'/api/records?resource=products','POST',{sku:'QA-'+n,name:'QA Produto '+n,category:'QA',unit:'un',cost_price:1.5,sale_price:3,min_stock:2}); assert.equal(p.status,201,JSON.stringify(p.body)); const pid=p.body.id;
  const sup=await api(page,'/api/records?resource=suppliers','POST',{name:'QA Fornecedor '+n,contact_name:'QA',phone:'000',whatsapp:'000',email:'qa-'+n+'@example.test',category:'QA',notes:'E2E'}); assert.equal(sup.status,201,JSON.stringify(sup.body));
  const po=await api(page,'/api/records?resource=purchases','POST',{supplier_id:sup.body.id,order_number:'QA-P-'+n,status:'draft',total:12,notes:'E2E'}); assert.equal(po.status,201,JSON.stringify(po.body));
  const task=await api(page,'/api/records?resource=tasks','POST',{title:'QA Produção '+n,task_type:'avulsa',category:'QA',status:'todo',priority:'normal',due_at:new Date(Date.now()+86400000).toISOString()}); assert.equal(task.status,201,JSON.stringify(task.body));
  const sale=await api(page,'/api/records?resource=sales','POST',{sale_number:'QA-S-'+n,channel:'qa',status:'completed',subtotal:10,total:10,sold_at:new Date().toISOString(),notes:'E2E'}); assert.equal(sale.status,201,JSON.stringify(sale.body));
  assert.equal((await api(page,'/api/stock','POST',{product_id:pid,movement_type:'in',quantity:10,notes:'QA'})).status,201);
  const lot=await api(page,'/api/lots','POST',{product_id:pid,lot_code:'QA-LOT-'+n,expiry_date:'2027-12-31',quantity_received:5,notes:'QA'}); assert.equal(lot.status,201,JSON.stringify(lot.body));
  assert.equal((await api(page,'/api/stock','POST',{product_id:pid,movement_type:'out',quantity:2,notes:'QA FEFO'})).status,201);
  const lots=await api(page,'/api/lots'); assert.equal(Number(lots.body.items.find(x=>x.lot_code==='QA-LOT-'+n).quantity_remaining),3);
  const stock=await api(page,'/api/stock'); assert.equal(Number(stock.body.products.find(x=>Number(x.id)===Number(pid)).available_stock),13);
  const reports=await api(page,'/api/records?resource=reports'); assert.equal(reports.status,200); assert.ok(Number(reports.body.counts.products)>=1);
  const audit=await api(page,'/api/records?resource=audit'); assert.equal(audit.status,200); assert.ok(audit.body.items.some(x=>x.action==='stock_movement.created'));
  const backup=await api(page,'/api/records?resource=backup'); assert.equal(backup.status,200); assert.equal(backup.body.format,'moon-fish-operational-backup'); assert.ok(backup.body.tables.products.some(x=>Number(x.id)===Number(pid)));
  const merge=await api(page,'/api/records?resource=backup','POST',{mode:'merge',backup:backup.body}); assert.equal(merge.status,200,JSON.stringify(merge.body));
  const opName='qa-op-'+n; const opPassword='QA-'+n+'-Operator!'; const op=await api(page,'/api/users','POST',{name:'QA Operator',username:opName,password:opPassword,role:'operator'}); assert.equal(op.status,201,JSON.stringify(op.body));
  const c2=await browser.newContext(); const p2=await c2.newPage(); try { await p2.goto(base,{waitUntil:'domcontentloaded'}); await p2.locator('#username').fill(opName); await p2.locator('#password').fill(opPassword); await p2.locator('#loginButton').click(); await p2.locator('#app').waitFor({state:'visible',timeout:15000}); assert.equal((await api(p2,'/api/records?resource=reports')).status,403); assert.equal((await api(p2,'/api/users')).status,403); } finally { await c2.close(); }
  assert.deepEqual(errors,[],'browser errors: '+errors.join(' | '));
 } finally { await context.close(); await browser.close(); }
});
