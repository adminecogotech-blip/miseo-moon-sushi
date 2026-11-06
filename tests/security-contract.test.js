const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Moon Fish branding is applied to the application shell', () => {
  const html = read('index.html');
  assert.match(html, /<title>MISEO · Sua cozinha em equilíbrio<\/title>/);
  assert.match(html, /Moon Fish/);
});

test('login authenticates with username and password against active database users', () => {
  const source = read('api/auth/login.js');
  assert.match(source, /req\.body\?\.username/);
  assert.match(source, /lower\(u\.username\)=lower\(\$1\)/);
  assert.match(source, /!user\.is_active/);
  assert.match(source, /verifyPassword\(password,user\.password_hash\)/);
  assert.match(source, /crypto\.randomBytes\(32\)/);
  assert.match(source, /hash\(token\)/);
});

test('bootstrap is disabled unless both temporary server controls are configured', () => {
  const source = read('api/auth/bootstrap.js');
  assert.match(source, /ADMIN_BOOTSTRAP_ENABLED!=='true'/);
  assert.match(source, /!process\.env\.ADMIN_BOOTSTRAP_TOKEN/);
  assert.match(source, /password\.length<12/);
  assert.match(source, /existingMaster\.rowCount/);
});

test('password reset is restricted to master admins and requires password change', () => {
  const source = read('api/users.js');
  assert.match(source, /actor\.is_master/);
  assert.match(source, /reset_password/);
  assert.match(source, /must_change_password=true/);
  assert.match(source, /DELETE FROM app_sessions/);
  assert.match(source, /crypto\.randomBytes/);
  assert.doesNotMatch(source, /password:\s*password\s*,\s*password_hash/);
});

test('passwords are stored using scrypt and checked with constant-time comparison', () => {
  const source = read('api/_auth.js');
  assert.match(source, /crypto\.scryptSync/);
  assert.match(source, /crypto\.timingSafeEqual/);
  assert.match(source, /HttpOnly; Secure; SameSite=Lax/);
});

test('frontend enforces first-login password change when the server flags the account', () => {
  const html = read('index.html');
  assert.match(html, /mustChangePassword/);
  assert.match(html, /\/api\/auth\/change-password/);
});

test('setup documentation warns to remove temporary bootstrap configuration', () => {
  const setup = read('setup.html');
  assert.match(setup, /ADMIN_BOOTSTRAP_ENABLED/);
  assert.match(setup, /ADMIN_BOOTSTRAP_TOKEN/);
  assert.match(setup, /remov|desativ|exclu/i);
});

test('stock exits update FIFO lot balances in the same transaction', () => {
  const source = read('api/stock.js');
  assert.match(source, /planLotConsumption/);
  assert.match(source, /await client\.query\('BEGIN'\)/);
  assert.match(source, /await client\.query\('COMMIT'\)/);
  assert.match(source, /client\.query\('ROLLBACK'\)/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /quantity_remaining=quantity_remaining-\$2/);
  assert.match(source, /Saldo por lote insuficiente/);
});

test('health check reports Moon Fish and detects any master administrator', () => {
  const source = read('api/health.js');
  assert.match(source, /service:'MISEO \| Moon Fish'/);
  assert.match(source, /WHERE r\.is_master=true/);
  assert.doesNotMatch(source, /admin\.ecogotech@gmail\.com/);
});

test('reports use real database aggregates and enforce report-view permissions', () => {
  const source = read('lib/reports.js');
  for (const table of ['products','stock_movements','product_lots','production_tasks','purchase_orders','sales','suppliers']) {
    assert.match(source, new RegExp('FROM ' + table));
  }
  assert.match(source, /canViewReports/);
  assert.match(source, /can_view/);
  assert.match(source, /expiring_7_days/);
  assert.match(source, /salesLast30Days/);
});

test('audit endpoint requires an authenticated user and checks module permission', () => {
  const source = read('lib/audit.js');
  assert.match(source, /currentUser\(req\)/);
  assert.match(source, /user\.is_master/);
  assert.match(source, /inventory_audit/);
  assert.match(source, /FROM audit_logs/);
  assert.match(source, /LIMIT 300/);
});

test('mutating APIs record audit events without including passwords', () => {
  const auth = read('api/_auth.js');
  assert.match(auth, /INSERT INTO audit_logs/);
  const stock = read('api/stock.js');
  assert.match(stock, /stock_movement\.created/);
  const lots = read('api/lots.js');
  assert.match(lots, /lot\.created/);
  assert.match(lots, /lot\.cancelled/);
  const records = read('api/records.js');
  assert.match(records, /record\.created/);
  assert.match(records, /record\.updated/);
  const users = read('api/users.js');
  assert.match(users, /user\.password_reset/);
  assert.doesNotMatch(users, /auditEvent\([^\n]*password_hash/);
});

test('backup endpoint is master-only and excludes authentication secrets', () => {
  const source = read('lib/backup.js');
  assert.match(source, /user\.is_master/);
  assert.match(source, /moon-fish-operational-backup/);
  assert.match(source, /includesCredentials: false/);
  assert.match(source, /mode !== 'merge'/);
  assert.match(source, /await client\.query\('BEGIN'\)/);
  assert.match(source, /await client\.query\('COMMIT'\)/);
  assert.match(source, /await client\.query\('ROLLBACK'/);
  assert.doesNotMatch(source, /password_hash|app_sessions|SELECT \* FROM app_users/);
});

test('backup UI confirms merge and states that records are not deleted', () => {
  const html = read('index.html');
  assert.ok(html.includes("go(\\'backup\\')"), 'backup remains reachable from Administration');
  assert.match(html, /api\('\/api\/records\?resource=backup'\)/);
  assert.match(html, /Nenhum registro será excluído/);
  assert.match(html, /confirm\('Importar em modo merge/);
});

test('reports, audit and backup are routed through the existing API function', () => {
  const records = read('api/records.js');
  assert.match(records, /\['reports', 'audit', 'backup'\]/);
  assert.match(records, /require\('\.\.\/lib\/' \+ key\)/);
  const html = read('index.html');
  for (const resource of ['reports','audit','backup']) {
    assert.ok(html.includes('/api/records?resource=' + resource), 'missing route for ' + resource);
  }
});

test('integrated guide covers modules and states known limitations honestly', () => {
  const html = read('index.html');
  assert.match(html, /id="manualShortcut"/);
  assert.match(html, /Manual operacional — homologação/);
  assert.match(html, /recebimentos parciais ou totais/);
  assert.match(html, /Registre vendas com itens/i);
  assert.match(html, /não substitui o Manual de instruções/);
});

test('purchase and sales workflows use transactional item, lot and stock movement operations', () => {
  const source = read('lib/workflows.js');
  for (const token of ['purchase_order_items','sale_items','BEGIN','COMMIT','ROLLBACK','product_lots','stock_movements','reservation','release','purchase.received','sale.completed']) {
    assert.ok(source.includes(token), 'missing workflow contract: ' + token);
  }
  assert.match(source, /quantity_remaining=quantity_remaining-\$1/);
  assert.match(source, /expiry_date/);
  assert.match(source, /Saldo disponível insuficiente|Estoque disponível insuficiente/);
});
test('sales item schema migration uses restrictive foreign keys and positive quantities', () => {
  const migration = read('migrations/20261104_workflows.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS sale_items/);
  assert.match(migration, /REFERENCES sales\(id\) ON DELETE RESTRICT/);
  assert.match(migration, /REFERENCES products\(id\) ON DELETE RESTRICT/);
  assert.match(migration, /CHECK \(quantity > 0\)/);
});
test('purchase and sales UI are connected to transactional workflow API', () => {
  const html = read('index.html');
  assert.match(html, /renderWorkflowPage\('purchases'\)/);
  assert.match(html, /renderWorkflowPage\('sales'\)/);
  assert.match(html, /api\('\/api\/records\?resource=workflow&kind='/);
  assert.match(html, /Concluir e baixar estoque|Concluir venda e baixar os itens reservados/);
});
test('Tiny/Olist stays outside the MISEO integration catalog', () => {
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'lib', 'tiny.js')), false);
  const connections = read('lib/connections.js');
  assert.doesNotMatch(connections, /\b(?:tiny|olist)\b/i);
});

test('visual controls expose independent menu and theme actions with persistent state', () => {
  const html = read('index.html');
  assert.match(html, /const applyTheme=/);
  assert.match(html, /const applyMenu=/);
  assert.match(html, /miseo_theme/);
  assert.match(html, /dark-theme/);
  assert.match(html, /grid-template-columns:minmax\(0,1fr\) 36px/);
  assert.match(html, /top-brand/);
  assert.match(html, /dashboard-hero/);
});
