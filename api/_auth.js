const { Pool } = require('pg');
const crypto = require('crypto');
let pool;
function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada');
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true }, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 7000 });
  return pool;
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function passwordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  const key = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, value: 'scrypt$' + salt + '$' + key };
}
function verifyPassword(password, encoded) {
  if (!encoded || !encoded.startsWith('scrypt$')) return false;
  const [, salt, stored] = encoded.split('$');
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(stored, 'hex');
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}
function cookie(req, name) {
  const raw = req.headers.cookie || '';
  const found = raw.split(';').map(v => v.trim()).find(v => v.startsWith(name + '='));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : '';
}
function setCookie(res, value, maxAge = 60 * 60 * 12) {
  res.setHeader('Set-Cookie', 'miseo_session=' + encodeURIComponent(value) + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + maxAge);
}
function clearCookie(res) { setCookie(res, '', 0); }
async function ensureSchema() {
  const p = db();
  await p.query(`CREATE TABLE IF NOT EXISTS app_sessions (
    id bigserial PRIMARY KEY, user_id bigint NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    token_hash char(64) NOT NULL UNIQUE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await p.query('CREATE INDEX IF NOT EXISTS app_sessions_expiry_idx ON app_sessions(expires_at)');
}
async function currentUser(req) {
  await ensureSchema();
  const token = cookie(req, 'miseo_session');
  if (!token) return null;
  const r = await db().query(`SELECT u.id, u.username AS username, u.username AS email, u.display_name AS name, u.role_key, u.is_active, u.must_change_password, r.is_master
    FROM app_sessions s JOIN app_users u ON u.id=s.user_id JOIN app_roles r ON r.role_key=u.role_key
    WHERE s.token_hash=$1 AND s.expires_at>now() AND u.is_active=true LIMIT 1`, [hash(token)]);
  return r.rows[0] || null;
}
function json(res, status, body) { res.setHeader('Cache-Control','no-store'); res.setHeader('Content-Type','application/json; charset=utf-8'); return res.status(status).json(body); }
function method(req, res, expected) { if (req.method !== expected) { json(res,405,{error:'Método não permitido'}); return false; } return true; }

async function auditEvent(executor, userId, action, entityType, entityId, details = {}) {
  try {
    await executor.query('INSERT INTO audit_logs(user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5::jsonb)', [userId || null, action, entityType || null, entityId == null ? null : String(entityId), JSON.stringify(details || {})]);
    return true;
  } catch (error) {
    console.error('audit event could not be recorded:', error.message);
    return false;
  }
}
module.exports = { db, hash, passwordHash, verifyPassword, cookie, setCookie, clearCookie, ensureSchema, currentUser, json, method, auditEvent };
