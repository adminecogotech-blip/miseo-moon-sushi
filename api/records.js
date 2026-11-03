const { db, currentUser, json } = require('./_auth');
const moduleByResource = { products: 'stock', suppliers: 'suppliers', tasks: 'production', purchases: 'purchases', sales: 'sales' };
async function canAccess(user, resource, action) {
 if (user.is_master) return true;
 const moduleKey = moduleByResource[resource];
 if (!moduleKey) return false;
 const result = await db().query(
  'SELECT m.is_enabled, rp.' + action + ' AS allowed FROM app_modules m LEFT JOIN role_permissions rp ON rp.module_key=m.module_key AND rp.role_key=$1 WHERE m.module_key=$2 LIMIT 1',
  [user.role_key, moduleKey]
 );
 if (!result.rows.length || !result.rows[0].is_enabled) return false;
 if (result.rows[0].allowed !== null && result.rows[0].allowed !== undefined) return !!result.rows[0].allowed;
 return user.role_key==='operator' && ['stock','suppliers','production','purchases','sales'].includes(moduleKey) && action!=='can_delete';
}
const resources = {
 products:{table:'products',fields:['sku','name','category','unit','cost_price','sale_price','min_stock'],required:['name'],select:'id,sku,name,category,unit,cost_price,sale_price,min_stock,created_at',order:'name'},
 suppliers:{table:'suppliers',fields:['name','contact_name','phone','whatsapp','email','category','notes'],required:['name'],select:'id,name,contact_name,phone,whatsapp,email,category,notes,created_at',order:'name'},
 tasks:{table:'production_tasks',fields:['title','description','task_type','category','status','priority','starts_at','due_at'],required:['title'],select:'id,title,description,task_type,category,status,priority,starts_at,due_at,created_at',order:'due_at NULLS LAST,created_at DESC'},
 purchases:{table:'purchase_orders',fields:['supplier_id','order_number','status','expected_at','total','notes'],required:[],select:'po.id,po.supplier_id,po.order_number,po.status,po.expected_at,po.total,po.notes,s.name AS supplier_name,po.created_at',order:'po.created_at DESC'},
 sales:{table:'sales',fields:['sale_number','channel','status','subtotal','total','sold_at','notes'],required:[],select:'id,sale_number,channel,status,subtotal,total,sold_at,notes',order:'sold_at DESC'}
};
module.exports=async function handler(req,res){
 try {
  const user=await currentUser(req);
  if(!user) return json(res,401,{error:'Faça login para continuar.'});
  const key=String(req.query?.resource||'');
  const cfg=resources[key];
  if(!cfg) return json(res,400,{error:'Módulo inválido.'});
  if(req.method==='GET'){
   if(!(await canAccess(user,key,'can_view'))) return json(res,403,{error:'Seu perfil não tem permissão para consultar este módulo.'});
   const sql=key==='purchases'
    ? `SELECT ${cfg.select} FROM purchase_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id ORDER BY ${cfg.order} LIMIT 200`
    : `SELECT ${cfg.select} FROM ${cfg.table} ORDER BY ${cfg.order} LIMIT 200`;
   const result=await db().query(sql);
   return json(res,200,{items:result.rows});
  }
  if(req.method==='POST'){
   if(!(await canAccess(user,key,'can_create'))) return json(res,403,{error:'Seu perfil não tem permissão para cadastrar neste módulo.'});
   const body=req.body||{};
   for(const f of cfg.required) if(!String(body[f]??'').trim()) return json(res,400,{error:'Preencha os campos obrigatórios.'});
   const fields=cfg.fields.filter(f=>body[f]!==undefined && body[f]!==null && body[f]!=='');
   if(key==='purchases' && body.supplier_id && !(await db().query('SELECT id FROM suppliers WHERE id=$1',[body.supplier_id])).rowCount) return json(res,400,{error:'Fornecedor não encontrado.'});
   if(key==='tasks') fields.push('created_by');
   if(key==='purchases'||key==='sales') fields.push('created_by');
   const values=fields.map(f=>f==='created_by'?user.id:body[f]);
   const placeholders=fields.map((f,i)=>'
  return json(res,405,{error:'Método não permitido.'});
 } catch(e){console.error('records API error:',e.message);return json(res,503,{error:'Não foi possível concluir a operação.'});}
};+(i+1));
   const result=await db().query(`INSERT INTO ${cfg.table} (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING id`,values);
   return json(res,201,{ok:true,id:result.rows[0].id});
  }
  if(req.method==='PATCH'){
   if(!(await canAccess(user,key,'can_edit'))) return json(res,403,{error:'Seu perfil não tem permissão para editar neste módulo.'});
   const body=req.body||{}, id=Number(body.id);
   if(!Number.isInteger(id)||id<1) return json(res,400,{error:'Registro inválido para edição.'});
   for(const f of cfg.required) if(body[f]!==undefined&&!String(body[f]??'').trim()) return json(res,400,{error:'Preencha os campos obrigatórios.'});
   if(key==='purchases' && body.supplier_id && !(await db().query('SELECT id FROM suppliers WHERE id=$1',[body.supplier_id])).rowCount) return json(res,400,{error:'Fornecedor não encontrado.'});
   const fields=cfg.fields.filter(f=>Object.prototype.hasOwnProperty.call(body,f));
   if(!fields.length) return json(res,400,{error:'Nenhum campo válido para atualizar.'});
   const values=fields.map(f=>body[f]===''?null:body[f]);
   values.push(id);
   const sets=fields.map((f,i)=>f+'=
  return json(res,405,{error:'Método não permitido.'});
 } catch(e){console.error('records API error:',e.message);return json(res,503,{error:'Não foi possível concluir a operação.'});}
};+(i+1)).join(',');
   const result=await db().query(`UPDATE ${cfg.table} SET ${sets} WHERE id=${values.length} RETURNING id`,values);
   if(!result.rowCount) return json(res,404,{error:'Registro não encontrado.'});
   return json(res,200,{ok:true,id:result.rows[0].id});
  }
  return json(res,405,{error:'Método não permitido.'});
 } catch(e){console.error('records API error:',e.message);return json(res,503,{error:'Não foi possível concluir a operação.'});}
};