const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const styleEnd = html.lastIndexOf('</style>');
const htmlEnd = html.lastIndexOf('</html>');
const cssStart = html.lastIndexOf('<style', styleEnd);
const css = html.slice(cssStart, styleEnd);
const requiredMenus = ['inicio','planejamento','compras','fornecedores','estoque','validade','receitas','producao','vendas','auditoria','relatorios','integracoes','config'];

test('UX/UI contract: CSS stays inside document and matches approved typography baseline', () => {
  assert.ok(styleEnd > 0 && htmlEnd > styleEnd, 'stylesheet and HTML document must be correctly closed');
  assert.equal(html.slice(htmlEnd + 7).trim(), '', 'no CSS or markup may be appended outside the HTML document');
  assert.match(css, /body\s*\{[^}]*font:\s*14px\/1\.45\s+system-ui,-apple-system,"Segoe UI",sans-serif/s, 'body typography should match the approved MVP baseline');
  assert.match(css, /button,input,select,textarea\s*\{\s*font:\s*inherit\s*\}/, 'form controls should inherit the same typography');
});

test('UX/UI contract: every navigation menu has a stable navigation target', () => {
  const nav = html.match(/<aside class="sidebar" id="nav"[^>]*>([\s\S]*?)<\/aside>/)[1];
  assert.deepEqual([...nav.matchAll(/data-page="([^"]+)"/g)].map(m=>m[1]),requiredMenus);
  const reference = fs.readFileSync(path.join(__dirname,'..','docs/reference/MISEO_MVP_com_manual_integrado.html'),'utf8');
  const expected = [...reference.matchAll(/<button class="navbtn[^"\n]*" data-page="[^"]+">([\s\S]*?)<\/button>/g)].slice(0,13).map(m=>m[1].replace(/<svg[\s\S]*?<\/svg>/g,'').trim().replace(/^[^\p{L}]+/u,''));
  assert.deepEqual([...nav.matchAll(/class="navlabel-text">([^<]+)/g)].map(m=>m[1]),expected);
  for (const menu of requiredMenus) {
    assert.match(html, new RegExp('data-page="' + menu + '"'), 'missing navigation target: ' + menu);
  }
  assert.match(css, /\.sidebar[^{}]*\.brandcopy\s*\{\s*display:\s*none!important\s*\}/s, 'sidebar wordmark must not duplicate the top wordmark');
  assert.match(css, /\.loginbox>\.brand\s*\{\s*display:\s*none!important\s*\}/, 'split login must not show the MISEO wordmark twice');
  assert.match(css, /\.top-brand\s+strong/, 'single top wordmark must remain present');
});

test('UX/UI contract: menu controls remain separated and typography is restrained', () => {
  assert.match(css, /\.brandtools\s*\{[^}]*display:\s*grid!important;[^}]*grid-template-columns:\s*minmax\(0,1fr\) 38px!important/s, 'collapse and contrast controls must occupy separate columns');
  assert.match(css, /\.nav button\s*\{[^}]*font-size:\s*12px!important;[^}]*font-weight:\s*600!important/s, 'navigation labels must use consistent sizing and medium emphasis');
  assert.match(css, /#app \.content label,#app \.content table th\s*\{[^}]*font-weight:\s*500!important/s, 'labels and table headings must not be unnecessarily bold');
  assert.match(css, /@media\s*\(min-width:\s*701px\)\s*and\s*\(max-width:\s*1050px\)/, 'tablet layout needs an explicit responsive breakpoint');
});

test('UX/UI contract: dark mode and collapsed navigation controls have real state handlers', () => {
  assert.match(html, /const applyTheme\s*=\s*mode\s*=>/);
  assert.match(html, /const applyMenu\s*=\s*collapsed\s*=>/);
  assert.match(html, /themeToggle\?\.addEventListener\('click'/);
  assert.match(html, /menuToggle\?\.addEventListener\('click'/);
  assert.match(html, /localStorage\.setItem\('miseo_theme'/);
  assert.match(html, /localStorage\.setItem\('miseo_menu_collapsed'/);
});
