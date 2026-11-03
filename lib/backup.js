const { db, currentUser, json, method, auditEvent } = require('../api/_auth');

const TABLES = {
  suppliers: ['id','name','contact_name','phone','whatsapp','email','category','notes','is_active','created_at','updated_at'],
  products: ['id','sku','name','category','unit','cost_price','sale_price','min_stock','is_active','created_at','updated_at'],
  purchase_orders: ['id','supplier_id','order_number','status','expected_at','total','notes','created_at','updated_at'],
  purchase_order_items: ['id','purchase_order_id','product_id','quantity','unit_cost','received_quantity'],
  production_tasks: ['id','title','description','task_type','category','status','priority','starts_at','due_at','recurrence','checklist','comments','blocked_reason','created_at','updated_at'],
  sales: ['id','sale_number','channel','status','subtotal','total','sold_at','notes'],
  product_lots: ['id','product_id','lot_code','expiry_date','quantity_received','quantity_remaining','notes','is_active','created_at','updated_at'],
  stock_movements: ['id','product_id','movement_type','quantity','reference_type','reference_id','notes','created_at'],
  audit_logs: ['id','action','entity_type','entity_id','details','created_at']
};
const IMPORT_ORDER = ['suppliers','products','purchase_orders','purchase_order_items','production_tasks','sales','product_lots','stock_movements','audit_logs'];

module.exports = async function handler(req, res) {
  try {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'Faça login para continuar.' });
    if (!user.is_master) return json(res, 403, { error: 'Somente o administrador mestre pode exportar ou importar dados.' });

    if (req.method === 'GET') {
      const tables = {};
      for (const table of IMPORT_ORDER) {
        const result = await db().query('SELECT ' + TABLES[table].join(',') + ' FROM ' + table + (table === 'audit_logs' ? ' ORDER BY id' : ' ORDER BY id'));
        tables[table] = result.rows;
      }
      await auditEvent(db(), user.id, 'backup.exported', 'operational_data', null, { tables: IMPORT_ORDER });
      return json(res, 200, { format: 'moon-fish-operational-backup', version: 1, exportedAt: new Date().toISOString(), tenant: 'Moon Fish', includesCredentials: false, tables });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.mode !== 'merge') return json(res, 400, { error: 'Importação aceita somente o modo merge, sem exclusão de registros.' });
      const backup = body.backup;
      if (!backup || backup.format !== 'moon-fish-operational-backup' || backup.version !== 1 || !backup.tables || typeof backup.tables !== 'object') return json(res, 400, { error: 'Arquivo de backup incompatível.' });
      const jsonSize = Buffer.byteLength(JSON.stringify(backup), 'utf8');
      if (jsonSize > 8 * 1024 * 1024) return json(res, 413, { error: 'O backup excede o limite de 8 MB.' });
      let total = 0;
      for (const table of IMPORT_ORDER) {
        const rows = backup.tables[table] ?? [];
        if (!Array.isArray(rows) || rows.length > 5000) return json(res, 400, { error: 'Estrutura inválida na tabela ' + table + '.' });
        total += rows.length;
        for (const row of rows) {
          if (!row || typeof row !== 'object' || Array.isArray(row) || !Number.isSafeInteger(Number(row.id)) || Number(row.id) < 1) return json(res, 400, { error: 'Registro inválido na tabela ' + table + '.' });
        }
      }
      if (total > 10000) return json(res, 413, { error: 'O backup excede o limite de 10.000 registros.' });

      const client = await db().connect();
      try {
        await client.query('BEGIN');
        for (const table of IMPORT_ORDER) {
          const columns = TABLES[table];
          for (const row of (backup.tables[table] || [])) {
            const fields = columns.filter(c => Object.prototype.hasOwnProperty.call(row, c));
            if (!fields.includes('id')) throw new Error('Registro sem ID na tabela ' + table + '.');
            const values = fields.map(c => row[c] === undefined ? null : row[c]);
            const placeholders = fields.map((_, i) => '$' + (i + 1));
            const updateFields = fields.filter(c => c !== 'id');
            const conflict = updateFields.length ? ' DO UPDATE SET ' + updateFields.map(c => c + '=EXCLUDED.' + c).join(',') : ' DO NOTHING';
            await client.query('INSERT INTO ' + table + ' (' + fields.join(',') + ') VALUES (' + placeholders.join(',') + ') ON CONFLICT (id)' + conflict, values);
          }
          await client.query("SELECT setval(pg_get_serial_sequence('public." + table + "','id'), COALESCE((SELECT MAX(id) FROM public." + table + "),1), EXISTS(SELECT 1 FROM public." + table + '))');
        }
        await client.query('INSERT INTO audit_logs(user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5::jsonb)', [user.id, 'backup.imported', 'operational_data', null, JSON.stringify({ mode: 'merge', records: total })]);
        await client.query('COMMIT');
        return json(res, 200, { ok: true, mode: 'merge', recordsProcessed: total, message: 'Importação concluída. Nenhum registro foi excluído; IDs existentes foram atualizados.' });
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        if (e.code === '23503') return json(res, 409, { error: 'O backup contém referências a produtos, fornecedores ou pedidos ausentes. Nenhuma alteração foi aplicada.' });
        if (e.code === '23505') return json(res, 409, { error: 'O backup conflita com um código ou identificador único existente. Nenhuma alteração foi aplicada.' });
        throw e;
      } finally { client.release(); }
    }
    return json(res, 405, { error: 'Método não permitido.' });
  } catch (e) {
    console.error('backup API error:', e.message);
    return json(res, 503, { error: 'Não foi possível processar o backup.' });
  }
};
