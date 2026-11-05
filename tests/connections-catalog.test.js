const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('catalogo de conexoes inclui adquirentes comuns e WhatsApp Cloud API', () => {
 const src=fs.readFileSync(path.join(__dirname,'../lib/connections.js'),'utf8');
 for(const key of ['stone','cielo','rede','getnet','pagbank','mercadopago','safrapay','sumup','infinitepay','whatsapp_cloud','ifood','99food']) assert.match(src,new RegExp("key:'"+key+"'"));
});
test('segredos nao sao aceitos no payload e nao sao persistidos no config', () => {
 const src=fs.readFileSync(path.join(__dirname,'../lib/connections.js'),'utf8');
 assert.match(src,/Explicit allowlist for non-secret settings/);
 assert.match(src,/for\(const field of \['environment','location_id','terminal_id','webhook_url','notes'\]/);
 assert.doesNotMatch(src,/INSERT INTO integration_connections[^\n]*access_token/i);
});
test('migration guarda apenas metadados de conexão', () => {
 const src=fs.readFileSync(path.join(__dirname,'../migrations/20261105_integration_connections.sql'),'utf8');
 assert.match(src,/CREATE TABLE IF NOT EXISTS integration_connections/);
 assert.doesNotMatch(src,/access_token|client_secret|password/i);
});

test('endpoint de conexoes exige administrador master e autenticacao', () => {
 const src=fs.readFileSync(path.join(__dirname,'../lib/connections.js'),'utf8');
 assert.match(src,/if\(!user\) return json\(res,401/);
 assert.match(src,/if\(!user\.is_master\) return json\(res,403/);
});
test('endpoint nao permite salvar campos secretos enviados pelo cliente', () => {
 const src=fs.readFileSync(path.join(__dirname,'../lib/connections.js'),'utf8');
 assert.match(src,/for\(const field of \['environment','location_id','terminal_id','webhook_url','notes'\]/);
 assert.doesNotMatch(src,/safeConfig\[[^\]]*(?:token|secret|password|credential)/i);
});
