const { db, currentUser, json, auditEvent } = require('./_auth');

async function allowed(user, action) {
  if (user.is_master) return true;
  const result = await db().query(
    'SELECT m.is_enabled, rp.' + action + ' AS allowed FROM app_modules m LEFT JOIN role_permissions rp ON rp.module_key=m.module_key AND rp.role_key=$1 WHERE m.module_key=$2 LIMIT 1',
    [user.role_key, 'recipes']
  );
  if (!result.rows.length || !result.rows[0].is_enabled) return false;
  if (result.rows[0].allowed !== null && result.rows[0].allowed !== undefined) return !!result.rows[0].allowed;
  return false;
}

function validRecipe(body) {
  if (!String(body.name || '').trim()) return 'Informe o nome da receita.';
  const yieldQuantity = Number(body.yield_quantity ?? 1);
  if (!Number.isFinite(yieldQuantity) || yieldQuantity <= 0) return 'O rendimento deve ser maior que zero.';
  if (body.ingredients !== undefined && !Array.isArray(body.ingredients)) return 'A lista de ingredientes é inválida.';
  for (const ingredient of (body.ingredients || [])) {
    if (!Number.isInteger(Number(ingredient.product_id)) || Number(ingredient.product_id) < 1) return 'Selecione um insumo válido para cada ingrediente.';
    if (!Number.isFinite(Number(ingredient.quantity)) || Number(ingredient.quantity) <= 0) return 'A quantidade de cada ingrediente deve ser maior que zero.';
  }
  return null;
}

async function fetchRecipe(id) {
  const result = await db().query(`
    SELECT r.id, r.name, r.description, r.yield_quantity, r.yield_unit, r.instructions,
      r.created_at, r.updated_at,
      COALESCE(SUM(ri.quantity * COALESCE(p.cost_price, 0)), 0) AS total_cost,
      COALESCE(json_agg(json_build_object(
        'id', ri.id, 'product_id', p.id, 'sku', p.sku, 'name', p.name,
        'quantity', ri.quantity, 'unit', ri.unit, 'notes', ri.notes,
        'unit_cost', COALESCE(p.cost_price, 0),
        'ingredient_cost', ri.quantity * COALESCE(p.cost_price, 0)
      )) FILTER (WHERE ri.id IS NOT NULL), '[]'::json) AS ingredients
    FROM recipes r
    LEFT JOIN recipe_ingredients ri ON ri.recipe_id=r.id
    LEFT JOIN products p ON p.id=ri.product_id
    WHERE r.id=$1 AND r.is_active=true
    GROUP BY r.id
  `, [id]);
  return result.rows[0] || null;
}

module.exports = async function handler(req, res) {
  try {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'Faça login para continuar.' });

    if (req.method === 'GET') {
      if (!(await allowed(user, 'can_view'))) return json(res, 403, { error: 'Seu perfil não tem permissão para consultar receitas.' });
      const id = Number(req.query?.id);
      if (req.query?.id) {
        if (!Number.isInteger(id) || id < 1) return json(res, 400, { error: 'Receita inválida.' });
        const recipe = await fetchRecipe(id);
        return recipe ? json(res, 200, { item: recipe }) : json(res, 404, { error: 'Receita não encontrada.' });
      }
      const result = await db().query(`
        SELECT r.id, r.name, r.description, r.yield_quantity, r.yield_unit, r.instructions,
          r.created_at, r.updated_at,
          COALESCE(SUM(ri.quantity * COALESCE(p.cost_price, 0)), 0) AS total_cost,
          COALESCE(SUM(ri.quantity * COALESCE(p.cost_price, 0)) / NULLIF(r.yield_quantity, 0), 0) AS unit_cost,
          COUNT(ri.id)::int AS ingredient_count
        FROM recipes r
        LEFT JOIN recipe_ingredients ri ON ri.recipe_id=r.id
        LEFT JOIN products p ON p.id=ri.product_id
        WHERE r.is_active=true
        GROUP BY r.id
        ORDER BY r.name
        LIMIT 500
      `);
      return json(res, 200, { items: result.rows });
    }

    if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) return json(res, 405, { error: 'Método não permitido.' });
    const action = req.method === 'POST' ? 'can_create' : req.method === 'PATCH' ? 'can_edit' : 'can_delete';
    if (!(await allowed(user, action))) return json(res, 403, { error: 'Seu perfil não tem permissão para executar esta ação em receitas.' });

    if (req.method === 'DELETE') {
      const id = Number(req.query?.id || req.body?.id);
      if (!Number.isInteger(id) || id < 1) return json(res, 400, { error: 'Receita inválida.' });
      const result = await db().query('UPDATE recipes SET is_active=false,updated_at=now() WHERE id=$1 AND is_active=true RETURNING id', [id]);
      if (!result.rowCount) return json(res, 404, { error: 'Receita não encontrada.' });
      await auditEvent(db(), user.id, 'recipe.archived', 'recipes', id, {});
      return json(res, 200, { ok: true, id, message: 'Receita arquivada.' });
    }

    const body = req.body || {};
    const error = validRecipe(body);
    if (error) return json(res, 400, { error });
    const ingredients = body.ingredients || [];
    if (ingredients.length) {
      const ids = [...new Set(ingredients.map(item => Number(item.product_id)))];
      const products = await db().query('SELECT id FROM products WHERE is_active=true AND id=ANY($1::bigint[])', [ids]);
      if (products.rowCount !== ids.length) return json(res, 400, { error: 'Um ou mais insumos não existem ou estão inativos.' });
    }

    const client = await db().connect();
    let id;
    try {
      await client.query('BEGIN');
      if (req.method === 'POST') {
        const created = await client.query(
          'INSERT INTO recipes (name,description,yield_quantity,yield_unit,instructions,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
          [String(body.name).trim(), body.description || null, Number(body.yield_quantity ?? 1), String(body.yield_unit || 'porção').trim(), body.instructions || null, user.id]
        );
        id = created.rows[0].id;
      } else {
        id = Number(body.id);
        if (!Number.isInteger(id) || id < 1) throw Object.assign(new Error('Receita inválida.'), { statusCode: 400 });
        const updated = await client.query(
          'UPDATE recipes SET name=$1,description=$2,yield_quantity=$3,yield_unit=$4,instructions=$5,updated_at=now() WHERE id=$6 AND is_active=true RETURNING id',
          [String(body.name).trim(), body.description || null, Number(body.yield_quantity ?? 1), String(body.yield_unit || 'porção').trim(), body.instructions || null, id]
        );
        if (!updated.rowCount) throw Object.assign(new Error('Receita não encontrada.'), { statusCode: 404 });
        await client.query('DELETE FROM recipe_ingredients WHERE recipe_id=$1', [id]);
      }
      for (const item of ingredients) {
        await client.query(
          'INSERT INTO recipe_ingredients (recipe_id,product_id,quantity,unit,notes) VALUES ($1,$2,$3,$4,$5)',
          [id, Number(item.product_id), Number(item.quantity), String(item.unit || '').trim(), item.notes || null]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.statusCode) return json(res, error.statusCode, { error: error.message });
      throw error;
    } finally {
      client.release();
    }
    await auditEvent(db(), user.id, req.method === 'POST' ? 'recipe.created' : 'recipe.updated', 'recipes', id, { ingredient_count: ingredients.length });
    const item = await fetchRecipe(id);
    return json(res, req.method === 'POST' ? 201 : 200, { ok: true, id, item });
  } catch (error) {
    console.error('recipes API error:', error.message);
    return json(res, 503, { error: 'Não foi possível concluir a operação de receitas.' });
  }
};
