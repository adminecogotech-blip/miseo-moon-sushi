// Offline rendering only. API fixtures below do not certify real login or persistence.
const {chromium} = require('playwright');
const fs = require('node:fs/promises');
const {execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
(async()=>{
 const dir='artifacts/visual';await fs.mkdir(dir,{recursive:true});
 const browser=await chromium.launch();
 const results=[];
 try {
  for(const variant of (process.env.VISUAL_VARIANT?[process.env.VISUAL_VARIANT]:['reference','before','after'])) {
   const context=await browser.newContext();const page=await context.newPage();const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   const html=variant==='reference'?await fs.readFile('docs/reference/MISEO_MVP_com_manual_integrado.html','utf8'):variant==='before'?execFileSync('git',['show','c4afb87c80f2486a595e85f796724bd239821a96:index.html'],{maxBuffer:4000000}).toString():await fs.readFile('index.html','utf8');
   await page.route('https://visual.invalid/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/')return route.fulfill({contentType:'text/html',body:html});
    if(path.startsWith('/assets/'))return route.fulfill({path:'.'+path});
    const overview={products:10,low:2,pending:1,near:0,sales:180,purchases:70,stock_value:500,stock_rows:[{name:'Insumo de teste',available:8,min_stock:10,unit:'kg'}],agenda:[],channels:[{channel:'Balcão',total:180}]};
    const data=path==='/api/dashboard'?{overview,counts:{}}:path==='/api/auth/me'?{user:{name:'QA Visual',username:'qa-visual',role:'master',isMaster:true}}:path==='/api/health'?{database:'connected',environment:'preview'}:{items:[],products:[],lots:[],counts:{},summary:{},users:[]};
    return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
   });
   await page.goto('https://visual.invalid/',{waitUntil:'domcontentloaded'});
   if(variant==='reference') await page.evaluate(()=>{document.body.classList.add('authenticated');document.getElementById('loginScreen').style.setProperty('display','none','important')});
   else await page.locator('#app').waitFor({state:'visible'});
   if(variant==='after')await page.getByText('Insumo de teste').waitFor();
   for(const width of [1440,1024,768,390]) {
    await page.setViewportSize({width,height:900});
    for(const theme of ['light','dark']) for(const collapsed of [false,true]) {
     await page.evaluate(dark=>document.body.classList.toggle('dark-theme',dark),theme==='dark');
     await page.evaluate(collapsed=>document.body.classList.toggle('menu-collapsed',collapsed),collapsed);
     await page.waitForTimeout(400);
     await page.screenshot({path:`${dir}/${variant}-${width}-${theme}-${collapsed?'collapsed':'expanded'}.png`,fullPage:true});
     const state=await page.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,labels:[...document.querySelectorAll('#nav .navtext,.navbtn .navlabel-text')].map(x=>x.textContent)}));
     results.push({variant,width,theme,collapsed,...state});
     if(variant==='after')assert.ok(state.scrollWidth<=width+1,`overflow ${width}/${collapsed}`);
     if(variant==='after')assert.equal(await page.locator('#login').isVisible(),false,'Login must stay hidden after session load at every viewport');
    }
   }
   if(variant!=='before'){
    const routes={inicio:'dashboard',planejamento:'planning',compras:'purchases',fornecedores:'suppliers',estoque:'stock',validade:'expiry',receitas:'recipes',producao:'production',vendas:'sales',auditoria:'audit',relatorios:'reports',integracoes:'integrations',config:'admin'};
    for(const [key,original] of Object.entries(routes)){
      for(const width of [1440,390]){
        await page.setViewportSize({width,height:900});
        await page.evaluate(()=>document.body.classList.remove('menu-collapsed','dark-theme'));
        if(variant==='reference')await page.locator('.sidebar [data-page="'+original+'"]').evaluate(el=>el.click());
        else if(width===390){await page.locator('.mobilebottom button').last().click();await page.locator('#mobileLinks button').nth(Object.keys(routes).indexOf(key)).click()}
        else await page.locator('#nav [data-page="'+key+'"]').click();
        await page.waitForTimeout(350);
        const metrics=await page.evaluate(()=>{
          const el=document.querySelector('.pagehead h1')||document.querySelector('.dashboard-hero h1');
          const style=el&&getComputedStyle(el);return {font:style?.fontFamily,fontSize:style?.fontSize,scrollWidth:document.documentElement.scrollWidth,heading:el?.textContent};
        });
        results.push({variant,module:key,width,...metrics});
        await page.screenshot({path:dir+'/'+variant+'-'+key+'-'+width+'.png'});
        if(variant==='after'){assert.ok(metrics.scrollWidth<=width+1,'overflow '+key+' '+width);assert.equal(await page.locator('#app').getAttribute('data-active-page'),key)}
      }
    }
   }
   results.push({variant,errors});
   if(variant==='after'){
    await page.setViewportSize({width:1440,height:900});
    await page.evaluate(()=>document.body.classList.remove('menu-collapsed'));
    await page.locator('#nav [data-page="config"]').click();
    await page.getByRole('heading',{name:'Administração',exact:true}).first().waitFor();
    await page.getByRole('heading',{name:'Usuários e acessos'}).waitFor();
    await page.locator('#manualShortcut').click();
    await page.getByText('Manual operacional — homologação').waitFor();
    await page.locator('#nav [data-page="inicio"]').click();
    await page.getByText('Insumo de teste').waitFor();
    assert.deepEqual(errors,[]);
   }
   await context.close();
  }
 } finally {await browser.close();await fs.writeFile(`${dir}/results.json`,JSON.stringify(results,null,2))}
 console.log('Offline visual fixtures captured; no real authentication or database mutation performed.');
})().catch(e=>{console.error(e);process.exitCode=1});
