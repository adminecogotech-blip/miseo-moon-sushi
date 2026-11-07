// WebKit smoke checks on the authorized isolated Preview; read-only application flows.
// Does not certify physical-device Safari compatibility or complete pixel parity.
const { webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { validateTarget } = require('../tests/preview-safety.cjs');

const base = (process.env.BASE_URL || '').replace(/\/$/, '');
const revision = process.env.EXPECTED_REVISION;
const username = process.env.QA_USER || 'qa-admin';
const password = process.env.QA_PASSWORD || '';
const pages = ['inicio','planejamento','compras','fornecedores','estoque','validade','receitas','producao','vendas','auditoria','relatorios','integracoes','config'];
const widths = [375,390,430];

async function main(){
  assert.ok(password,'QA_PASSWORD must be configured as an Actions secret');
  validateTarget(base);
  const healthResponse = await fetch(base+'/api/health',{redirect:'error'});
  assert.equal(healthResponse.status,200,'Preview health unavailable');
  validateTarget(base,await healthResponse.json(),revision);

  const browser = await webkit.launch({headless:true});
  const report = [];
  const out='artifacts/screenshots/mobile-webkit';
  await fs.mkdir(out,{recursive:true});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e.message).slice(0,220)));
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.locator('#username').waitFor({state:'visible'});
    await page.locator('#username').fill(username);
    await page.locator('#password').fill(password);
    await page.locator('#loginButton').click();
    await page.locator('#app').waitFor({state:'visible',timeout:20000});
    for (const width of widths){
      await page.setViewportSize({width,height:844});
      assert.equal(await page.locator('#mobilebottom button').count(),5,'Mobile footer missing');
      await page.locator('#mobileMoreButton').click();
      assert.equal(await page.locator('#mobileMorePanel button').count(),13,'Missing approved module in mobile More menu');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#mobileMorePanel').isVisible(),false);
      for(const name of pages){
        // JS click intentionally avoids relying on horizontal scroll position to select a module.
        await page.locator('#nav [data-page="'+name+'"]').first().evaluate(el=>el.click());
        await page.waitForTimeout(175);
        if(name==='integracoes'){
          await page.getByText('Saipos (PDV e dados)',{exact:true}).waitFor({timeout:20000});
          await page.getByText('Telegram Bot',{exact:true}).waitFor({timeout:20000});
          assert.equal(await page.locator('#connectionsCatalog [data-config-field="store_id"]').count(),1);
          assert.equal(await page.locator('#connectionsCatalog [data-config-field="chat_id"]').count(),1);
        }
        const audit=await page.evaluate(()=>{
          const width=document.documentElement.clientWidth;
          const groups=[
            [...document.querySelectorAll('#app .top > button,#app .top > .user button')],
            [...document.querySelectorAll('#app .sidebar .brandtools button')],
            [...document.querySelectorAll('#app #mainContent button,#app #mainContent input,#app #mainContent select,#app #mainContent textarea,#app #mainContent a[href]')],
            [...document.querySelectorAll('#app .mobilebottom button')]
          ];
          const overlaps=[];
          for(const controls of groups){
            const rects=controls.filter(e=>{
              const r=e.getBoundingClientRect(),s=getComputedStyle(e);
              return r.width>15&&r.height>15&&s.display!=='none'&&s.visibility!=='hidden'&&!e.closest('[hidden]');
            }).map(e=>({e,r:e.getBoundingClientRect()}));
            for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
              const a=rects[i],b=rects[j];
              const iw=Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left);
              const ih=Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top);
              if(iw<=8||ih<=8)continue;
              const ratio=iw*ih/Math.min(a.r.width*a.r.height,b.r.width*b.r.height);
              if(ratio>0.18) overlaps.push({
                left:(a.e.getAttribute('aria-label')||a.e.textContent||a.e.tagName).trim().slice(0,50),
                right:(b.e.getAttribute('aria-label')||b.e.textContent||b.e.tagName).trim().slice(0,50),
                ratio:Number(ratio.toFixed(2))
              });
            }
          }
          return {width,scrollWidth:document.documentElement.scrollWidth,overlaps};
        });
        report.push({name,width,...audit});
        if(width===390) await page.screenshot({path:out+'/'+name+'-390.png',fullPage:true});
        assert.ok(audit.scrollWidth<=width+1,'WebKit horizontal overflow '+name+'/'+width+': '+JSON.stringify(audit));
        assert.equal(audit.overlaps.length,0,'WebKit overlapping controls '+name+'/'+width+': '+JSON.stringify(audit.overlaps));
      }
    }
    assert.deepEqual(errors,[],'WebKit page errors: '+errors.join(' | '));
    await context.close();
  } finally {
    await fs.writeFile(out+'/metrics.json',JSON.stringify({engine:'webkit',widths,report},null,2));
    await browser.close();
  }
  console.log('WebKit mobile QA passed: '+report.length+' screens, all required providers visible, no overlapping interactive controls.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
