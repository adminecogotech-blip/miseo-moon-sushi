const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const backupPath = path.join(__dirname, '..', 'lib', 'backup.js');

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
}

function loadBackup({ user = { id: 7, is_master: true }, queryLog = [] } = {}) {
  const pool = {
    async query(sql, params) {
      queryLog.push({ sql, params });
      if (/^SELECT id,/.test(sql)) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 1 };
    },
    async connect() {
      const client = {
        async query(sql, params) {
          queryLog.push({ sql, params });
          return { rows: [{ id: 1 }], rowCount: 1 };
        },
        release() { queryLog.push({ sql: 'RELEASE' }); }
      };
      return client;
    }
  };
  const auth = {
    db: () => pool,
    currentUser: async () => user,
    json: (res, status, body) => res.status(status).json(body),
    method: (req, res, expected) => {
      if (req.method !== expected) { res.status(405).json({ error: 'Método não permitido.' }); return false; }
      return true;
    },
    auditEvent: async (...args) => { queryLog.push({ sql: 'AUDIT_EVENT', params: args.slice(1) }); return true; }
  };
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (parent && parent.filename === backupPath && request === '../api/_auth') return auth;
    return originalLoad.call(this, request, parent, isMain);
  };
  delete require.cache[backupPath];
  try { return require(backupPath); }
  finally { Module._load = originalLoad; }
}

test('backup export returns operational tables without authentication tables', async () => {
  const log = [];
  const handler = loadBackup({ queryLog: log });
  const res = response();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.format, 'moon-fish-operational-backup');
  assert.equal(res.body.includesCredentials, false);
  assert.ok(Array.isArray(res.body.tables.products));
  assert.ok(Array.isArray(res.body.tables.product_lots));
  assert.equal('app_users' in res.body.tables, false);
  assert.equal('app_sessions' in res.body.tables, false);
  assert.ok(log.some(x => x.sql === 'AUDIT_EVENT'));
});

test('backup import requires explicit merge mode and does not open a transaction for invalid mode', async () => {
  const log = [];
  const handler = loadBackup({ queryLog: log });
  const res = response();
  await handler({ method: 'POST', body: { mode: 'replace', backup: {} } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(log.some(x => x.sql === 'BEGIN'), false);
});

test('backup import commits a valid merge and records an audit event', async () => {
  const log = [];
  const handler = loadBackup({ queryLog: log });
  const tables = {
    suppliers: [], products: [{ id: 1, name: 'Produto de teste', unit: 'un' }],
    purchase_orders: [], purchase_order_items: [], production_tasks: [], sales: [],
    product_lots: [], stock_movements: [], audit_logs: []
  };
  const res = response();
  await handler({ method: 'POST', body: { mode: 'merge', backup: { format: 'moon-fish-operational-backup', version: 1, tables } } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.recordsProcessed, 1);
  assert.ok(log.some(x => x.sql === 'BEGIN'));
  assert.ok(log.some(x => x.sql === 'COMMIT'));
  assert.ok(log.some(x => x.sql.includes('ON CONFLICT (id)')));
  assert.ok(log.some(x => x.sql === 'RELEASE'));
});

test('backup import rejects non-master users', async () => {
  const handler = loadBackup({ user: { id: 9, is_master: false } });
  const res = response();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 403);
});
