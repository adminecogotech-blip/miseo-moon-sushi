const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Moon Fish branding is applied to the application shell', () => {
  const html = read('index.html');
  assert.match(html, /MISEO\s*\|\s*Moon Fish/);
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
