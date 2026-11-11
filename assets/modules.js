function openMobileModules(){
 const panel=document.getElementById('mobileMorePanel'),links=panel.querySelector('#mobileLinks');
 links.replaceChildren();
 for(const item of document.querySelectorAll('#nav [data-page]')){
   const b=document.createElement('button');b.dataset.mobileMorePage=item.dataset.page;b.className='ghost';b.textContent=item.textContent.trim();b.onclick=()=>go(item.dataset.page);links.append(b);
 }
 panel.onclose=()=>document.getElementById('mobileMoreButton').setAttribute('aria-expanded','false');document.getElementById('mobileMoreButton').setAttribute('aria-expanded','true');panel.showModal();
}
(function(){
 const root=document.getElementById('mainContent'),actions=document.getElementById('moduleActions');
 const forms={
   compras:[['workflowForm','Nova compra']],vendas:[['workflowForm','Registrar venda']],
   estoque:[['stockMovementForm','Registrar movimento','stockMessage'],['lotForm','Cadastrar lote','lotMessage']],
   receitas:[['recipeForm','Nova receita','recipeMessage']],fornecedores:[['recordForm','Novo fornecedor','recordMessage']],
   producao:[['recordForm','Nova tarefa','recordMessage']]
 };
 const editSelectors={'[data-edit-id]':'recordForm','[data-recipe-edit]':'recipeForm','.lot-edit':'lotForm'};
 root.addEventListener('click',e=>{
   for(const [selector,id] of Object.entries(editSelectors)){
     if(e.target.closest(selector)){const dialog=document.getElementById(id)?.closest('dialog');if(dialog && !dialog.open) dialog.showModal()}
   }
 },true);
 function enhance(){
   const page=document.getElementById('app').dataset.activePage;
   for(const button of actions.querySelectorAll('[data-dialog-for]')){
     if(!root.querySelector('#'+button.dataset.dialogFor)?.closest('dialog'))button.remove();
   }
   for(const [id,label,message] of forms[page]||[]){
     const form=root.querySelector('#'+id);if(!form || form.closest('dialog')) continue;
     const dialog=document.createElement('dialog');dialog.className='miseo-dialog';dialog.setAttribute('aria-label',label);
     const head=document.createElement('div');head.className='cardtitle';
     const title=document.createElement('h2');title.textContent=label;
     const close=document.createElement('button');close.className='ghost';close.textContent='Fechar';close.onclick=()=>dialog.close();
     head.append(title,close);
     const prev=form.previousElementSibling;if(prev?.matches('.sectionhead') && !prev.querySelector('button') && /^(Novo cadastro|Nova atividade|Cadastrar lote e validade|Registrar movimentação)$/.test(prev.textContent.trim()))prev.hidden=true;
     form.before(dialog);dialog.append(head,form);
     const msg=message&&document.getElementById(message);if(msg)dialog.append(msg);
     const open=document.createElement('button');open.className=actions.childElementCount?'soft':'primary';open.textContent='＋ '+label;open.dataset.dialogFor=id;
     open.onclick=()=>{if(form.elements.id?.value){form.querySelector('#recipeReset')?.click();document.getElementById('cancelRecordEdit')?.click();if(id==='lotForm')document.getElementById('lotReset')?.click()}dialog.showModal()};
     actions.append(open);
     if(form.dataset.openRequested){delete form.dataset.openRequested;dialog.showModal()}
   }
   if(root.querySelector('table') && !actions.querySelector('[data-export]') && ['estoque','compras','vendas','fornecedores','validade','receitas','relatorios','producao'].includes(page)){
     const button=document.createElement('button');button.dataset.export='';button.className='soft';button.textContent='Exportar CSV';button.onclick=()=>{const table=[...root.querySelectorAll('table')].find(t=>!t.closest('dialog'));if(table)downloadTableCsv(table,page)};actions.append(button);
   }
   root.querySelectorAll('table').forEach(table=>{const parent=table.parentElement;if(!parent.classList.contains('tablewrap')&&parent.children.length===1)parent.classList.add('tablewrap')});
 }
 new MutationObserver(enhance).observe(root,{childList:true,subtree:true});
 enhance();
})();
function workflowPresentation(purchase,items){
 const root=$('#mainContent'),card=root.querySelector('section.card'),table=card.querySelector('table'),list=table.parentElement;
 const originalRows=[...table.tBodies[0].rows],byId=new Map(originalRows.map((row,i)=>[String(items[i]?.id),row]));
 card.className='module-list-shell';
 for(const el of card.querySelectorAll(':scope > h2,:scope > p,:scope > .sectionhead'))el.hidden=true;
 const filter=document.createElement('div');filter.className='toolbar';
 const labels={draft:'Rascunho',sent:'Aguardando recebimento',partially_received:'Recebimento parcial',received:'Concluído',cancelled:'Cancelado'};
 filter.innerHTML=(purchase?'<div class="tabs"><button class="tab active">Kanban</button><button class="tab">Lista</button></div>':'')+
   '<input type="search" aria-label="Filtrar registros" placeholder="'+(purchase?'Buscar pedido ou fornecedor':'Buscar venda, produto ou canal')+'">'+
   (purchase?'<select aria-label="Filtrar status"><option value="">Todos os status</option>'+Object.entries(labels).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select>':'');
 list.before(filter);
 let boardMode=purchase;
 const board=document.createElement('div');board.className='kanban';list.before(board);
 if(!purchase){
   const completed=items.filter(x=>x.status==='completed'),grid=document.createElement('div');grid.className='grid kpis';
   const metrics=[['Vendas concluídas',completed.length],['Valor bruto registrado',completed.reduce((t,x)=>t+Number(x.total||0),0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})],['Vendas abertas',items.filter(x=>x.status==='open').length],['Canais ativos',new Set(items.map(x=>x.channel).filter(Boolean)).size]];
   grid.innerHTML=metrics.map(([key,v])=>'<div class="card kpi"><div class="kpihead">'+esc(key)+'</div><strong>'+esc(v)+'</strong></div>').join('');filter.before(grid);
 }
 function draw(){
   const query=filter.querySelector('input').value.trim().toLowerCase(),status=filter.querySelector('select')?.value;
   const visible=items.filter(x=>(!status||x.status===status)&&[x.order_number,x.sale_number,x.id,x.supplier_name,x.channel,...(x.items||[]).map(i=>i.product_name)].join(' ').toLowerCase().includes(query));
   const ids=new Set(visible.map(x=>String(x.id)));
   items.forEach(x=>byId.get(String(x.id)).hidden=!ids.has(String(x.id)));
   list.hidden=boardMode;board.hidden=!boardMode;
   if(!boardMode)return;
   board.innerHTML=Object.entries(labels).filter(([k])=>!status||k===status).map(([k,label])=>{
     const rows=visible.filter(x=>x.status===k);return '<section class="kancol"><div class="kanhead"><span>'+esc(label)+'</span><span class="pill">'+rows.length+'</span></div>'+ (rows.map(x=>'<article class="kancard"><strong>'+esc(x.order_number||'#'+x.id)+' · '+esc(x.supplier_name||'Sem fornecedor')+'</strong><p>'+Number(x.items?.length||0)+' item(ns) · '+Number(x.total||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+'<br>Entrega: '+esc(x.expected_at?new Date(x.expected_at).toLocaleDateString('pt-BR'):'A definir')+'</p><button class="tiny ghost" data-detail="'+esc(x.id)+'">Detalhes</button></article>').join('')||'<div class="hint">Sem pedidos</div>')+'</section>';
   }).join('');
 }
 filter.querySelector('input').oninput=draw;if(purchase){
   filter.querySelector('select').onchange=draw;
   const tabs=filter.querySelectorAll('.tab');tabs.forEach((b,i)=>b.onclick=()=>{boardMode=!i;tabs.forEach(t=>t.classList.toggle('active',t===b));draw()});
   board.onclick=e=>{const b=e.target.closest('[data-detail]');if(b){tabs[1].click();byId.get(b.dataset.detail)?.scrollIntoView({block:'center'})}};
 }draw();
}
function downloadTableCsv(table,name){
 const rows=[...table.rows].filter(row=>!row.hidden);
 const cells=rows.map(row=>[...row.cells].filter((cell,i)=>!['Ação','Ações'].includes(table.rows[0]?.cells[i]?.textContent.trim())).map(cell=>{
   let value=(cell.querySelector('input[type="number"]')?.value??cell.innerText).trim();
   if(/^[=+@-]/.test(value))value="'"+value;
   return '"'+value.replaceAll('"','""')+'"';
 }).join(';'));
 const url=URL.createObjectURL(new Blob(['\uFEFF'+cells.join('\r\n')],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='MISEO-'+name+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
