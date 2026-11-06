let planningRequest = 0;

async function openPlanning(days = 7, category = '', supplier = '') {
  const request = ++planningRequest;
  const current = () => request === planningRequest && $('#app').dataset.activePage === 'planejamento';
  const content = $('#mainContent');
  content.textContent = 'Carregando planejamento…';
  let plan;
  try {
    plan = await api('/api/stock?view=planning&days=' + days);
  } catch (error) {
    if (current()) {
      content.innerHTML = '<div class="card"><p class="error"></p><button class="logout">Tentar novamente</button></div>';
      content.querySelector('p').textContent = error.message;
      content.querySelector('button').onclick = () => openPlanning(days, category, supplier);
    }
    return;
  }
  if (!current()) return;
  const products = plan.products;
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'));
  const quantity = n => Number(n).toLocaleString('pt-BR',{maximumFractionDigits:3});
  const money = n => n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  function render() {
    const rows = products.filter(p => (!category || p.category === category) && (!supplier || String(p.preferred_supplier_id)===supplier)).map(p => {
      const demand = Number(p.sold14 || 0) * days / 14;
      const available = Math.max(0,Number(p.available_stock));
      const shortage = Math.max(0,Math.max(Number(p.min_stock), demand + Number(p.safety_stock || 0)) - available - Number(p.incoming || 0));
      const multiple = Number(p.purchase_multiple || 1);
      const suggested = Number((Math.ceil(Math.round(shortage / multiple * 1e9) / 1e9)*multiple).toFixed(3));
      return {p, demand, available, suggested, cost:suggested * Number(p.cost_price || 0)};
    });
    const need = rows.filter(r => r.suggested > 0);
    const kpi = (label,value) => '<div class="card"><div class="statlabel">'+label+'</div><strong class="statvalue">'+value+'</strong></div>';
    const forecast = plan.forecast;
    const supplierOptions = (plan.suppliers||[]).map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>').join('');
    const names=new Map((plan.suppliers||[]).map(s=>[String(s.id),s.name]));
    const fallback=[...(plan.suppliers||[])].sort((a,b)=>a.id-b.id)[0]?.name || 'Sem fornecedor';
    const columns = ['Insumo','Categoria','Saldo disponível',...(forecast?['Demanda prevista','Entradas confirmadas']:[]),'Mínimo','Necessidade sugerida',...(forecast?['Custo estimado','Fornecedor sugerido']:[]),'Ação'];
    content.innerHTML = `<div class="planning-view">
      <div class="sectionhead"><h2>Planejamento de compras</h2>${forecast?'<button class="logout" id="createPlanningDrafts">Criar pedidos selecionados</button>':''}<button class="logout" id="planningRefresh">↻ Atualizar cálculo</button></div>
      <div class="stats">${kpi('Itens com necessidade',need.length)}${forecast ? kpi('Investimento estimado',money(need.reduce((n,r)=>n+r.cost,0))) + kpi('Horizonte de compra',days+' dias') + kpi('Pedidos analisados',plan.orders) : ''}</div>
      <div class="card"><div class="planning-controls">
      ${forecast ? '<label>Atender próximos <select id="forecastDays">'+[1,3,7,14,30].map(n=>'<option value="'+n+'" '+(days===n?'selected':'')+'>'+n+(n===1?' dia':' dias')+'</option>').join('')+'</select></label>' : ''}
      <label>Categoria <select id="planCategory"><option value="">Todas as categorias</option>${categories.map(c=>'<option value="'+esc(c)+'" '+(category===c?'selected':'')+'>'+esc(c)+'</option>').join('')}</select></label>
      ${forecast?'<label>Fornecedor<select id="planSupplier"><option value="">Todos os fornecedores</option>'+supplierOptions+'</select></label>':''}</div>
      <p class="notice">${forecast?'A demanda considera vendas diretas e ingredientes das fichas registradas nos últimos 14 dias. As entradas incluem o saldo de pedidos confirmados com entrega até o fim do horizonte.':'Cálculo pelo saldo disponível e pelo mínimo cadastrado.'} O cálculo considera o mínimo e arredonda a compra ao múltiplo do produto.</p>
      <p role="status" id="draftMessage"></p><div class="planning-table"><table><thead><tr>${columns.map(c=>'<th>'+c+'</th>').join('')}</tr></thead><tbody>
      ${rows.map(({p,demand,available,suggested,cost})=>`<tr><td>${forecast?'<input type="checkbox" class="suggestcheck" aria-label="Selecionar '+esc(p.name)+'" '+(suggested?'checked':'')+'> ':''}<span>${esc(p.name)}</span></td><td>${esc(p.category)}</td><td>${quantity(available)} ${esc(p.unit)}</td>
      ${forecast?'<td>'+quantity(demand)+'</td><td>'+quantity(p.incoming)+'</td>':''}<td>${quantity(p.min_stock)}</td><td>${forecast?'<input type="number" class="draft-quantity" aria-label="Quantidade de '+esc(p.name)+'" min="0" step="0.001" style="width:7em" value="'+suggested+'">':quantity(suggested)}</td>
      ${forecast?'<td class="draft-cost">'+money(cost)+'</td><td>'+esc(names.get(String(p.preferred_supplier_id))||fallback)+'</td>':''}<td>${suggested?'<button class="logout" data-buy-product="'+esc(p.id)+'" data-buy-qty="'+suggested+'">Criar compra</button>':'—'}</td></tr>`).join('') || '<tr><td colspan="'+columns.length+'">Nenhum produto nesta categoria.</td></tr>'}
      </tbody></table></div>
      ${forecast && products.length ? policyForm(products,supplierOptions) : ''}</div></div>`;
    if(forecast){
      bindDraftSelection(content,rows,money);
      $('#planSupplier').value=supplier;
      $('#planSupplier').onchange=e=>{supplier=e.target.value;render()};
      if(products.length) bindPolicyForm(products,()=>openPlanning(days,category,supplier));
    }
    $('#planningRefresh').onclick = () => openPlanning(days,category,supplier);
    $('#planCategory').onchange = e => {category=e.target.value;render()};
    if (forecast) $('#forecastDays').onchange = e => openPlanning(Number(e.target.value),category,supplier);
    content.querySelectorAll('[data-buy-product]').forEach(button => {
      button.onclick = () => {
        const product=products.find(p=>String(p.id)===button.dataset.buyProduct);
        window.miseoSuggestedPurchase = {supplier_id:product?.preferred_supplier_id,product_id:Number(button.dataset.buyProduct),quantity:Number(button.dataset.buyQty)};
        go('compras');
      };
    });
  }
  render();
}
function policyForm(products,suppliers) {
  return `<details><summary>Parâmetros de compra por produto</summary><form class="planning-controls" id="planPolicy">
    <label>Produto<select name="product_id">${products.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')}</select></label>
    <label>Fornecedor preferencial<select name="supplier"><option value="">Sem fornecedor preferencial</option>${suppliers}</select></label>
    <label>Estoque de segurança<input type="number" min="0" step="0.001" name="safety" required></label>
    <label>Múltiplo de compra<input type="number" min="0.001" step="0.001" name="multiple" required></label>
    <button class="logout">Salvar parâmetros</button><span role="alert"></span></form></details>`;
}
function bindPolicyForm(products,refresh) {
  const form=$('#planPolicy'), fields=form.elements;
  const populate=()=>{
    const p=products.find(p=>String(p.id)===fields.product_id.value);
    fields.supplier.value=p.preferred_supplier_id||'';
    fields.safety.value=p.safety_stock||0;fields.multiple.value=p.purchase_multiple||1;
  };
  fields.product_id.onchange=populate;
  populate();
  form.onsubmit=async e=>{
    e.preventDefault();
    const button=form.querySelector('button');button.disabled=true;
    try{
      await api('/api/stock?view=planning',{method:'PATCH',body:JSON.stringify({
        product_id:Number(fields.product_id.value),preferred_supplier_id:Number(fields.supplier.value)||null,
        safety_stock:fields.safety.value,purchase_multiple:fields.multiple.value
      })});
      await refresh();
    }catch(err){form.querySelector('[role="alert"]').textContent=err.message;button.disabled=false}
  };
}
function bindDraftSelection(content,rows,money) {
  const formRows=[...content.querySelectorAll('.suggestcheck')].map((box,i)=>({
    box, input:box.closest('tr').querySelector('.draft-quantity'),
    cost:box.closest('tr').querySelector('.draft-cost'),product:rows[i].p
  }));
  const button=content.querySelector('#createPlanningDrafts'), message=content.querySelector('#draftMessage');
  const total=content.querySelectorAll('.statvalue')[1];
  let busy=false;
  function update(){
    let sum=0, chosen=0;
    for(const {box,input,cost,product} of formRows){
      const value=Number(input.value)*Number(product.cost_price);
      cost.textContent=money(value);
      if(box.checked && input.validity.valid && Number(input.value)>0){sum+=value;chosen++}
    }
    total.textContent=money(sum);
    button.disabled=busy || !chosen;
  }
  for(const {box,input} of formRows){box.onchange=update;input.oninput=update}
  update();
  let pending=null;
  button.onclick=async()=>{
    if(busy)return;
    const selected=formRows.filter(r=>r.box.checked && Number(r.input.value)!==0);
    if(selected.some(r=>!r.input.reportValidity()))return;
    const items=selected.map(r=>({product_id:Number(r.product.id),quantity:Number(r.input.value)}));
    if(!items.length)return;
    const signature=JSON.stringify(items);
    if(pending?.signature!==signature)pending={signature,id:crypto.randomUUID()};
    busy=true;update();
    try{
      const result=await api('/api/records?resource=workflow&kind=purchases&view=planning',{method:'POST',body:JSON.stringify({request_id:pending.id,items})});
      if(!content.contains(button))return;
      go('compras');
      const notice=document.createElement('p');notice.setAttribute('role','status');notice.textContent=result.orders.length+' rascunho(s) de compra criado(s).';
      document.querySelector('.heading').after(notice);
      setTimeout(()=>notice.remove(),7000);
    }catch(err){message.textContent=err.message;busy=false;update()}
  };
}
