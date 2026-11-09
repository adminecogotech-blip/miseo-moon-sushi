
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

test('successful login cannot be undone by a stale startup session check', {skip:!enabled,timeout:60000}, async()=>{
  await isolatedHealth();
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  let releaseStartup, signalStartup;
  const holdStartup=new Promise(resolve=>{releaseStartup=resolve});
  const startupRequest=new Promise(resolve=>{signalStartup=resolve});
  await page.route('**/api/auth/me',async route=>{
    signalStartup();
    await holdStartup;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:null})});
  });
  try {
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await startupRequest;
    await page.locator('#username').fill(user);
    await page.locator('#password').fill(pass);
    const loginResponse=page.waitForResponse(r=>r.url().endsWith('/api/auth/login') && r.request().method()==='POST');
    await page.locator('#loginButton').click();
    assert.equal((await loginResponse).status(),200,'QA login failed during startup-race regression');
    await page.locator('#app').waitFor({state:'visible',timeout:15000});
    const staleResponse=page.waitForResponse(r=>r.url().endsWith('/api/auth/me'));
    releaseStartup();
    await staleResponse;
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#app').isVisible(),true,'stale session response hid the authenticated app');
    assert.equal(await page.locator('#login').isVisible(),false,'login form was incorrectly restored');
  } finally {
    releaseStartup();
    await context.close();
    await browser.close();
  }
});


test('mobile responsive all modules: no overlapping controls, working footer and More', {skip:!enabled,timeout:240000}, async()=>{
 await isolatedHealth();
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();
 const metrics=[];
 try{
  await fs.mkdir('artifacts/screenshots/mobile-modules',{recursive:true});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#username').fill(user);
  await page.locator('#password').fill(pass);
  await page.locator('#loginButton').click();
  await page.locator('#app').waitFor({state:'visible',timeout:20000});
  for(const width of [360,390,430,768]){
   await page.setViewportSize({width,height:844});
   if(width<=700){
    assert.equal(await page.locator('#mobilebottom button').count(),5,'approved 5-button footer missing');
    await page.locator('#mobileMoreButton').click();
    assert.equal(await page.locator('#mobileMorePanel [data-mobile-more-page]').count(),13,'More must expose 13 modules');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#mobileMorePanel').isVisible(),false,'More panel should close with Escape');
   }
   for(const module of ['inicio','planejamento','compras','fornecedores','estoque','validade','receitas','producao','vendas','auditoria','relatorios','integracoes','config']){
    await page.locator('#nav [data-page="'+module+'"]').first().evaluate(el=>el.click());
    await page.waitForTimeout(180);
    const result=await page.evaluate(()=>{
     const width=document.documentElement.clientWidth,issues=[];
     const groups=[
       [...document.querySelectorAll('#app .top > button,#app .top > .user button')],
       [...document.querySelectorAll('#app .sidebar .brandtools button')],
       [...document.querySelectorAll('#app #mainContent button,#app #mainContent input,#app #mainContent select,#app #mainContent textarea,#app #mainContent a[href]')],
       [...document.querySelectorAll('#app .mobilebottom button')]
     ];
     const name=el=>String(el.getAttribute('aria-label')||el.id||el.textContent||el.tagName).trim().replace(/\s+/g,' ').slice(0,50);
     for(const group of groups){
      const visible=group.filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>15&&r.height>15&&s.display!=='none'&&s.visibility!=='hidden'&&!el.closest('[hidden]')}).map(el=>({el,r:el.getBoundingClientRect()}));
      for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
       const a=visible[i],b=visible[j],w=Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left),h=Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top);
       if(w<=8||h<=8)continue;
       const coverage=w*h/Math.min(a.r.width*a.r.height,b.r.width*b.r.height);
       if(coverage>0.18)issues.push({first:name(a.el),second:name(b.el),coverage:Number(coverage.toFixed(2))});
      }
     }
     return {width,scrollWidth:document.documentElement.scrollWidth,issues};
    });
    metrics.push({module,width,...result});
    if([390,768].includes(width)) await page.screenshot({path:'artifacts/screenshots/mobile-modules/'+module+'-'+width+'.png',fullPage:true});
    assert.ok(result.scrollWidth<=width+1,'document scrolls sideways in '+module+'/'+width+': '+JSON.stringify(result));
    assert.equal(result.issues.length,0,'overlapping controls in '+module+'/'+width+': '+JSON.stringify(result.issues));
   }
  }
 }finally{
  await fs.writeFile('artifacts/screenshots/mobile-modules/metrics.json',JSON.stringify(metrics,null,2));
  await context.close();
  await browser.close();
 }
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
   await page.setViewportSize({width:1440,height:900}); const side=await page.locator('.sidebar').boundingBox(); assert.ok(side&&Math.abs(side.width-250)<=2,'desktop sidebar should match the approved 250px width: '+JSON.stringify(side));
   for(const width of [1440,1024,768,390]) { await page.setViewportSize({width,height:900}); await page.waitForTimeout(100); const d=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth})); assert.ok(d.s<=d.w+1,'dashboard horizontal overflow at '+width+': '+JSON.stringify(d)); await page.screenshot({path:'artifacts/screenshots/dashboard-'+width+'.png',fullPage:true}); }
   await page.setViewportSize({width:1440,height:900});
  assert.equal((await api(page,'/api/auth/me')).body.user.username,user);
  const screens={inicio:'.dashboard-hero',planejamento:'#planCategory',compras:'.kanban',fornecedores:'#recordForm',estoque:'#lotForm',validade:'#validityRefresh',receitas:'#recipeForm',producao:'.pt-board',vendas:'#workflowForm',auditoria:'#auditRefresh',relatorios:'#reportRefresh',integracoes:'[data-provider="saipos"]',config:'[onclick*="usuarios"]'};
  for(const [m,ready] of Object.entries(screens)){
    await page.locator('#nav [data-page="'+m+'"]').click();
    await page.locator('#mainContent '+ready).first().waitFor({state:'attached'});
    await page.screenshot({path:'artifacts/screenshots/menu-'+m+'.png'});
    if(m==='compras'){
      await page.locator('#moduleActions [data-dialog-for="workflowForm"]').click();
      await page.locator('dialog[open] #workflowForm').waitFor();await page.keyboard.press('Escape');
    }
    if(m==='integracoes'){
      const catalog=(await api(page,'/api/records?resource=connections')).body;
      assert.equal(catalog.vaultReady,true,'Preview branch encryption key required');
      for(const key of ['saipos','stone','cielo','infinitepay','ifood','99food','whatsapp_cloud','telegram'])assert.ok(catalog.items.some(p=>p.key===key));
      await page.locator('[data-provider="telegram"]').click();
      const dialog=page.locator('dialog[open]');await dialog.locator('[data-config="chat_id"]').waitFor();
      assert.equal(await dialog.locator('[data-credential="TELEGRAM_BOT_TOKEN"]').inputValue(),'');
      assert.equal(await dialog.locator('[data-credential="TELEGRAM_BOT_TOKEN"]').getAttribute('type'),'password');await page.keyboard.press('Escape');
    }
  }
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
  const ingredient=await api(page,'/api/records?resource=products','POST',{sku:'QA-I-'+n,name:'Insumo QA '+n,category:'QA',unit:'kg',min_stock:0,cost_price:10});
  assert.equal(ingredient.status,201);
  const ingredientId=Number(ingredient.body.id);
  const recipeData={name:'Ficha QA '+n,yield_quantity:4,yield_unit:'un',ingredients:[{product_id:ingredientId,quantity:600,unit:'ml'}]};
  const sheet=await api(page,'/api/records?resource=recipes','POST',recipeData);
  assert.equal(sheet.status,201);
  const rid=sheet.body.id;
  const linked=await api(page,'/api/records?resource=workflow&kind=sales','POST',{items:[{product_id:pid,recipe_id:rid,quantity:2}]});
  assert.equal(linked.status,201);
  const complete=()=>api(page,'/api/records?resource=workflow&kind=sales','PATCH',{id:linked.body.id});
  assert.equal((await complete()).status,409,'incompatible units must roll back');
  assert.equal((await planningProduct()).sold14,3);
  const revise=quantity=>api(page,'/api/records?resource=recipes','PATCH',{...recipeData,id:rid,ingredients:[{product_id:ingredientId,quantity,unit:'g'},{product_id:ingredientId,quantity:100,unit:'g'}]});
  assert.equal((await revise(500)).status,200);
  assert.equal((await complete()).status,200);
  assert.equal((await complete()).status,409);
  assert.equal((await revise(900)).status,200);
  const policy={product_id:ingredientId,preferred_supplier_id:Number(sup.body.id),safety_stock:2,purchase_multiple:4};
  assert.equal((await api(page,'/api/stock?view=planning','PATCH',policy)).status,200);
  const updated=await api(page,'/api/stock?view=planning&days=14');
  assert.equal(updated.body.products.find(p=>Number(p.id)===ingredientId).sold14,0.3);
  assert.equal((await planningProduct()).sold14,3,'linked sale must not add direct demand');
  await page.locator('#planningRefresh').click();
  await page.locator('#planSupplier').selectOption(String(policy.preferred_supplier_id));
  const ingredientRow=page.locator('.planning-table tbody tr').filter({has:page.getByText('Insumo QA '+n,{exact:true})});
    assert.equal(await ingredientRow.locator('.draft-quantity').inputValue(),'4');
  await ingredientRow.locator('.draft-quantity').fill('8');
  const batchResponse=page.waitForResponse(r=>r.url().includes('kind=purchases&view=planning') && r.request().method()==='POST');
  await page.locator('#createPlanningDrafts').click();
  const batch=await batchResponse;
  assert.equal(batch.status(),200);
  const batchPayload=batch.request().postDataJSON(), orderIds=(await batch.json()).orders;
  assert.equal(orderIds.length,1);
  const batchPath='/api/records?resource=workflow&kind=purchases&view=planning';
  assert.deepEqual((await api(page,batchPath,'POST',batchPayload)).body.orders,orderIds);
  const drafted=(await api(page,'/api/records?resource=workflow&kind=purchases')).body.items.find(o=>String(o.id)===String(orderIds[0]));
  assert.equal(drafted.status,'draft');assert.equal(Number(drafted.supplier_id),policy.preferred_supplier_id);
  assert.equal(Number(drafted.items[0].quantity),8);assert.equal(Number(drafted.total),80);
  const otherSupplier=await api(page,'/api/records?resource=suppliers','POST',{name:'Segundo fornecedor QA '+n});
  assert.equal(otherSupplier.status,201);
  assert.equal((await api(page,'/api/stock?view=planning','PATCH',{...policy,product_id:Number(pid),preferred_supplier_id:Number(otherSupplier.body.id)})).status,200);
  const split={request_id:require('node:crypto').randomUUID(),items:[{product_id:ingredientId,quantity:1},{product_id:Number(pid),quantity:2}]};
  const pair=await Promise.all([api(page,batchPath,'POST',split),api(page,batchPath,'POST',split)]);
  assert.equal(pair[0].status,200);assert.equal(pair[1].status,200);
  assert.equal(pair[0].body.orders.length,2);assert.deepEqual(pair[0].body.orders,pair[1].body.orders);
  assert.equal((await api(page,batchPath,'POST',{...split,items:[split.items[0]]})).status,409);
  const reports=await api(page,'/api/records?resource=reports'); assert.equal(reports.status,200); assert.ok(Number(reports.body.counts.products)>=1);
  const audit=await api(page,'/api/records?resource=audit'); assert.equal(audit.status,200); assert.ok(audit.body.items.some(x=>x.action==='stock_movement.created'));
  const backup=await api(page,'/api/records?resource=backup'); assert.equal(backup.status,200); assert.equal(backup.body.format,'moon-fish-operational-backup'); assert.ok(backup.body.tables.products.some(x=>Number(x.id)===Number(pid)));
  assert.equal(backup.body.version,3);
  const captured=backup.body.tables.sale_item_recipe.find(x=>Number(x.recipe_id)===Number(rid));
  assert.ok(captured.captured_at);
  assert.equal(Number(captured.yield_quantity),4);
  assert.equal(backup.body.tables.sale_item_recipe_consumption.filter(x=>x.sale_item_id===captured.sale_item_id).length,1);
  assert.equal(Number(backup.body.tables.sale_item_recipe_consumption.find(x=>x.sale_item_id===captured.sale_item_id).quantity),0.3);
  await isolatedHealth();
  const restoreEvidence=await require('./preview-restore.cjs').verifyRestore(
    (path,method,body)=>api(page,path,method,body),backup.body,ingredientId,captured.sale_item_id,policy
  );
  await fs.writeFile('artifacts/screenshots/restore-result.json',JSON.stringify({revision:process.env.EXPECTED_REVISION,...restoreEvidence},null,2));
  const opName='qa-op-'+n; const opPassword=require('node:crypto').randomBytes(24).toString('base64url'); const op=await api(page,'/api/users','POST',{name:'QA Operator',username:opName,password:opPassword,role:'operator'}); assert.equal(op.status,201,JSON.stringify(op.body));
  const c2=await browser.newContext(); const p2=await c2.newPage(); try { await p2.goto(base,{waitUntil:'domcontentloaded'}); await p2.locator('#username').fill(opName); await p2.locator('#password').fill(opPassword); const operatorLoginResponse=p2.waitForResponse(r=>r.url().endsWith('/api/auth/login') && r.request().method()==='POST',{timeout:20000}); await p2.locator('#loginButton').click(); const operatorLogin=await operatorLoginResponse; const operatorLoginBody=await operatorLogin.json().catch(()=>({})); assert.equal(operatorLogin.status(),200,'Synthetic operator login rejected ('+operatorLogin.status()+'): '+String(operatorLoginBody.error||'no public error message')); await p2.locator('#app').waitFor({state:'visible',timeout:15000}); assert.equal((await api(p2,'/api/records?resource=reports')).status,403); assert.equal((await api(p2,'/api/users')).status,403);assert.equal((await api(p2,'/api/records?resource=backup','POST',{mode:'merge',backup:{format:backup.body.format,version:3,tables:{}}})).status,403);assert.equal((await api(p2,'/api/stock?view=planning','PATCH',policy)).status,403); } finally { await c2.close(); }
  assert.deepEqual(errors,[],'browser errors: '+errors.join(' | '));
 } finally { await context.close(); await browser.close(); }
});
