
const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const base = (process.env.BASE_URL || '').replace(/\/$/, '');
const user = process.env.QA_USER || 'qa-admin';
const pass = process.env.QA_PASSWORD || '';
const { validateTarget } = require('./preview-safety.cjs');
const enabled = process.env.RUN_PREVIEW_E2E === 'true';
async function isolatedHealth() {
 validateTarget(base);
 const response = await fetch(base+'/api/health', {redirect:'error'});
 assert.equal(response.status,200);
 const health = await response.json();
 validateTarget(base,health,process.env.EXPECTED_REVISION);
 assert.equal(health.administratorInitialized,true);
 return health;
}

test('authenticated E2E prerequisites must be configured when requested', {skip:!enabled}, () => {
 assert.ok(base, 'BASE_URL is required');
 assert.ok(pass, 'QA_PASSWORD is unavailable: configure the GitHub Actions secret; never paste it in logs or chat');
 assert.ok(process.env.EXPECTED_REVISION, 'EXPECTED_REVISION is required');
 validateTarget(base);
});

test('isolated preview smoke: health, login screen and responsive layout', {skip:!base||process.env.RUN_PREVIEW_E2E!=='true',timeout:60000}, async()=>{
 await isolatedHealth();
 await fs.mkdir('artifacts/screenshots',{recursive:true}); const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1440,height:900}}); const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
 try {
  await page.goto(base,{waitUntil:'domcontentloaded'}); await page.locator('#username').waitFor({state:'visible',timeout:15000});
  for(const width of [1440,1024,768,390]) { await page.setViewportSize({width,height:900}); const d=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth})); assert.ok(d.s<=d.w+1,'login horizontal overflow at '+width+': '+JSON.stringify(d)); await page.screenshot({path:'artifacts/screenshots/login-'+width+'.png',fullPage:true}); }
  assert.deepEqual(errors,[]);
 } finally { await browser.close(); }
});
async function api(page, path, method='GET', body) {
 return page.evaluate(async ({path,method,body}) => { const r=await fetch(path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}); let d={}; try{d=await r.json()}catch{} return {status:r.status,body:d}; },{path,method,body});
}
test('isolated preview E2E: login, navigation, CRUD, stock-lot consistency, reports, audit, backup and permissions',{skip:!enabled,timeout:180000},async()=>{
 assert.ok(pass,'QA_PASSWORD is required for authenticated E2E');
 await isolatedHealth();
 const browser=await chromium.launch({headless:true}); const context=await browser.newContext({viewport:{width:1440,height:1000}}); const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
 try {
  await fs.mkdir('artifacts/screenshots',{recursive:true});
  await page.addInitScript(()=>localStorage.setItem('miseo_menu_collapsed','1')); await page.goto(base,{waitUntil:'domcontentloaded'}); await page.locator('#username').waitFor({state:'visible',timeout:15000});
  for(const width of [1440,1024,768,390]) { await page.setViewportSize({width,height:900}); await page.waitForTimeout(100); const d=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth})); assert.ok(d.s<=d.w+1,'login horizontal overflow at '+width+': '+JSON.stringify(d)); await page.screenshot({path:'artifacts/screenshots/login-'+width+'.png',fullPage:true}); }
  assert.ok(pass,'Set QA_PASSWORD as a GitHub Actions secret; refusing to use a fallback credential');
  await page.locator('#username').fill(user); await page.locator('#password').fill(pass); await page.locator('#loginButton').click(); await page.locator('#app').waitFor({state:'visible',timeout:15000});
   await page.locator('.dashboard-columns .dashboard-rail').waitFor();
   assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('menu-collapsed')),false,'legacy collapsed-menu preference must not hide the approved sidebar on first load');
   await page.setViewportSize({width:1440,height:900}); const side=await page.locator('.sidebar').boundingBox(); assert.ok(side&&Math.abs(side.width-238)<=2,'desktop sidebar should match the approved 238px width: '+JSON.stringify(side));
   for(const width of [1440,1024,768,390]) { await page.setViewportSize({width,height:900}); await page.waitForTimeout(100); const d=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth})); assert.ok(d.s<=d.w+1,'dashboard horizontal overflow at '+width+': '+JSON.stringify(d)); await page.screenshot({path:'artifacts/screenshots/dashboard-'+width+'.png',fullPage:true}); }
   await page.setViewportSize({width:1440,height:900});
  assert.equal((await api(page,'/api/auth/me')).body.user.username,user);
  for(const m of ['inicio','planejamento','compras','fornecedores','estoque','validade','receitas','producao','vendas','auditoria','relatorios','integracoes','config']) { const b=page.locator('#nav [data-page="'+m+'"]').first(); await b.click(); await page.waitForTimeout(60); assert.equal(await b.count(),1,'missing navigation '+m); }
  await page.locator('#menuToggle').click(); await page.locator('#themeToggle').click(); await page.locator('#manualShortcut').click(); await page.getByText('Manual operacional — homologação').waitFor({state:'visible'});
  for(const width of [1440,1024,768,390]) { await page.setViewportSize({width,height:900}); await page.waitForTimeout(80); const d=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth})); assert.ok(d.s<=d.w+1,'horizontal overflow at '+width+': '+JSON.stringify(d)); }
  const n=Date.now().toString();
  const p=await api(page,'/api/records?resource=products','POST',{sku:'QA-'+n,name:'QA Produto '+n,category:'QA',unit:'un',cost_price:1.5,sale_price:3,min_stock:2}); assert.equal(p.status,201,JSON.stringify(p.body)); const pid=p.body.id;
  const recipe=await api(page,'/api/records?resource=recipes','POST',{name:'QA Receita '+n,description:'E2E',yield_quantity:2,yield_unit:'porções',ingredients:[{product_id:pid,quantity:3,unit:'un'},{product_id:pid,quantity:1,unit:'un'}]}); assert.equal(recipe.status,201,JSON.stringify(recipe.body)); assert.equal(Number(recipe.body.item.total_cost),6); assert.equal(recipe.body.item.ingredients.length,2);
  const recipeUpdate=await api(page,'/api/records?resource=recipes','PATCH',{id:recipe.body.id,name:'QA Receita atualizada '+n,yield_quantity:3,yield_unit:'porções',ingredients:[{product_id:pid,quantity:2,unit:'un'}]}); assert.equal(recipeUpdate.status,200,JSON.stringify(recipeUpdate.body)); assert.equal(Number(recipeUpdate.body.item.total_cost),3);
  assert.equal((await api(page,'/api/records?resource=recipes&id='+recipe.body.id,'DELETE')).status,200); assert.equal((await api(page,'/api/records?resource=recipes&id='+recipe.body.id)).status,404);
  const sup=await api(page,'/api/records?resource=suppliers','POST',{name:'QA Fornecedor '+n,contact_name:'QA',phone:'000',whatsapp:'000',email:'qa-'+n+'@example.test',category:'QA',notes:'E2E'}); assert.equal(sup.status,201,JSON.stringify(sup.body));
  const po=await api(page,'/api/records?resource=purchases','POST',{supplier_id:sup.body.id,order_number:'QA-P-'+n,status:'draft',total:12,notes:'E2E'}); assert.equal(po.status,409,'Purchases must use transactional workflow');
  const task=await api(page,'/api/records?resource=tasks','POST',{title:'QA Produção '+n,task_type:'avulsa',category:'QA',status:'todo',priority:'normal',due_at:new Date(Date.now()+86400000).toISOString()}); assert.equal(task.status,201,JSON.stringify(task.body));
  const sale=await api(page,'/api/records?resource=sales','POST',{sale_number:'QA-S-'+n,channel:'qa',status:'completed',subtotal:10,total:10,sold_at:new Date().toISOString(),notes:'E2E'}); assert.equal(sale.status,409,'Sales must use transactional workflow');
  assert.equal((await api(page,'/api/stock','POST',{product_id:pid,movement_type:'in',quantity:10,notes:'QA'})).status,201);
  const lot=await api(page,'/api/lots','POST',{product_id:pid,lot_code:'QA-LOT-'+n,expiry_date:'2027-12-31',quantity_received:5,notes:'QA'}); assert.equal(lot.status,201,JSON.stringify(lot.body));
  assert.equal((await api(page,'/api/stock','POST',{product_id:pid,movement_type:'out',quantity:2,notes:'QA FEFO'})).status,201);
  const lots=await api(page,'/api/lots'); assert.equal(Number(lots.body.items.find(x=>x.lot_code==='QA-LOT-'+n).quantity_remaining),3);
  const stock=await api(page,'/api/stock'); assert.equal(Number(stock.body.products.find(x=>Number(x.id)===Number(pid)).available_stock),13);
  const purchase=await api(page,'/api/records?resource=workflow&kind=purchases','POST',{supplier_id:sup.body.id,order_number:'QA-WP-'+n,expected_at:new Date(Date.now()+3*86400000).toISOString(),items:[{product_id:pid,quantity:4,unit_cost:1.5}]}); assert.equal(purchase.status,201,JSON.stringify(purchase.body));
  let receipt=await api(page,'/api/records?resource=workflow&kind=purchases','PATCH',{id:purchase.body.id,items:[{product_id:pid,quantity:2,lot_code:'QA-R1-'+n,expiry_date:'2027-01-01'}]}); assert.equal(receipt.status,200,JSON.stringify(receipt.body)); assert.equal(receipt.body.status,'partially_received');
  const planningProduct=async()=>{const r=await api(page,'/api/stock?view=planning');assert.equal(r.status,200);assert.equal(r.body.forecast,true);return r.body.products.find(p=>Number(p.id)===Number(pid))};
  assert.equal((await planningProduct()).incoming,2);
  const shortPlan=await api(page,'/api/stock?view=planning&days=1');
  assert.equal(shortPlan.status,200);
  assert.equal(shortPlan.body.products.find(p=>Number(p.id)===Number(pid)).incoming,0);
  assert.equal((await api(page,'/api/stock?view=planning&days=2')).status,400);
  receipt=await api(page,'/api/records?resource=workflow&kind=purchases','PATCH',{id:purchase.body.id,items:[{product_id:pid,quantity:2,lot_code:'QA-R2-'+n,expiry_date:'2027-02-01'}]}); assert.equal(receipt.status,200,JSON.stringify(receipt.body)); assert.equal(receipt.body.status,'received');
  const saleFlow=await api(page,'/api/records?resource=workflow&kind=sales','POST',{sale_number:'QA-WS-'+n,channel:'qa',items:[{product_id:pid,quantity:3,unit_price:3}]}); assert.equal(saleFlow.status,201,JSON.stringify(saleFlow.body));
  let afterReserve=await api(page,'/api/stock'); const reserved=afterReserve.body.products.find(x=>Number(x.id)===Number(pid)); assert.equal(Number(reserved.reserved_stock),3);
  const completed=await api(page,'/api/records?resource=workflow&kind=sales','PATCH',{id:saleFlow.body.id}); assert.equal(completed.status,200,JSON.stringify(completed.body)); assert.equal(completed.body.status,'completed');
  const finalStock=await api(page,'/api/stock'); const finalProduct=finalStock.body.products.find(x=>Number(x.id)===Number(pid)); assert.equal(Number(finalProduct.reserved_stock),0); assert.equal(Number(finalProduct.available_stock),14);
  const plan=await planningProduct();assert.equal(plan.incoming,0);assert.equal(plan.sold14,3);
  await page.locator('#nav [data-page="planejamento"]').click();
  await page.locator('#planCategory').selectOption('QA');
  await page.locator('#forecastDays').selectOption('14');
  await page.waitForFunction(()=>document.querySelector('#forecastDays')?.value==='14' && document.querySelector('#planCategory')?.value==='QA');
  const planningRow=page.locator('.planning-table tbody tr').filter({has:page.getByText('QA Produto '+n,{exact:true})});
  await planningRow.waitFor();
  assert.equal(await planningRow.locator('td').nth(3).innerText(),'3');
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:'artifacts/screenshots/planning-'+width+'.png'});
  }
  await page.setViewportSize({width:1440,height:900});
  const reports=await api(page,'/api/records?resource=reports'); assert.equal(reports.status,200); assert.ok(Number(reports.body.counts.products)>=1);
  const audit=await api(page,'/api/records?resource=audit'); assert.equal(audit.status,200); assert.ok(audit.body.items.some(x=>x.action==='stock_movement.created'));
  const backup=await api(page,'/api/records?resource=backup'); assert.equal(backup.status,200); assert.equal(backup.body.format,'moon-fish-operational-backup'); assert.ok(backup.body.tables.products.some(x=>Number(x.id)===Number(pid)));
  // Restore/merge is deliberately excluded: it rewrites existing records and needs separate authorization.
  const opName='qa-op-'+n; const opPassword=require('node:crypto').randomBytes(24).toString('base64url'); const op=await api(page,'/api/users','POST',{name:'QA Operator',username:opName,password:opPassword,role:'operator'}); assert.equal(op.status,201,JSON.stringify(op.body));
  const c2=await browser.newContext(); const p2=await c2.newPage(); try { await p2.goto(base,{waitUntil:'domcontentloaded'}); await p2.locator('#username').fill(opName); await p2.locator('#password').fill(opPassword); await p2.locator('#loginButton').click(); await p2.locator('#app').waitFor({state:'visible',timeout:15000}); assert.equal((await api(p2,'/api/records?resource=reports')).status,403); assert.equal((await api(p2,'/api/users')).status,403); } finally { await c2.close(); }
  assert.deepEqual(errors,[],'browser errors: '+errors.join(' | '));
 } finally { await context.close(); await browser.close(); }
});
