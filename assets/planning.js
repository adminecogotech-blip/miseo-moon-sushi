let planningRequest = 0;

async function openPlanning(days = 7, category = '') {
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
      content.querySelector('button').onclick = () => openPlanning(days, category);
    }
    return;
  }
  if (!current()) return;
  const products = plan.products;
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'));
  const quantity = n => Number(n).toLocaleString('pt-BR',{maximumFractionDigits:3});
  const money = n => n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  function render() {
    const rows = products.filter(p => !category || p.category === category).map(p => {
      const demand = Number(p.sold14 || 0) * days / 14;
      const available = Math.max(0,Number(p.available_stock));
      const shortage = Math.max(0,Math.max(Number(p.min_stock), demand) - available - Number(p.incoming || 0));
      // O múltiplo padrão da referência é uma unidade.
      const suggested = Math.ceil(Math.round(shortage * 1e9) / 1e9);
      return {p, demand, available, suggested, cost:suggested * Number(p.cost_price || 0)};
    });
    const need = rows.filter(r => r.suggested > 0);
    const kpi = (label,value) => '<div class="card"><div class="statlabel">'+label+'</div><strong class="statvalue">'+value+'</strong></div>';
    const forecast = plan.forecast;
    const columns = ['Insumo','Categoria','Saldo disponível',...(forecast?['Demanda prevista','Entradas confirmadas']:[]),'Mínimo','Necessidade sugerida',...(forecast?['Custo estimado']:[]),'Ação'];
    content.innerHTML = `<div class="planning-view">
      <div class="sectionhead"><h2>Planejamento de compras</h2><button class="logout" id="planningRefresh">↻ Atualizar cálculo</button></div>
      <div class="stats">${kpi('Itens com necessidade',need.length)}${forecast ? kpi('Investimento estimado',money(need.reduce((n,r)=>n+r.cost,0))) + kpi('Horizonte de compra',days+' dias') + kpi('Pedidos analisados',plan.orders) : ''}</div>
      <div class="card"><div class="planning-controls">
      ${forecast ? '<label>Atender próximos <select id="forecastDays">'+[1,3,7,14,30].map(n=>'<option value="'+n+'" '+(days===n?'selected':'')+'>'+n+(n===1?' dia':' dias')+'</option>').join('')+'</select></label>' : ''}
      <label>Categoria <select id="planCategory"><option value="">Todas as categorias</option>${categories.map(c=>'<option value="'+esc(c)+'" '+(category===c?'selected':'')+'>'+esc(c)+'</option>').join('')}</select></label></div>
      <p class="notice">${forecast?'A demanda projeta as vendas diretas dos últimos 14 dias. As entradas incluem o saldo de pedidos confirmados com entrega até o fim do horizonte.':'Cálculo pelo saldo disponível e pelo mínimo cadastrado.'} A sugestão arredonda para o múltiplo padrão de uma unidade.</p>
      <div class="planning-table"><table><thead><tr>${columns.map(c=>'<th>'+c+'</th>').join('')}</tr></thead><tbody>
      ${rows.map(({p,demand,available,suggested,cost})=>`<tr><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${quantity(available)} ${esc(p.unit)}</td>
      ${forecast?'<td>'+quantity(demand)+'</td><td>'+quantity(p.incoming)+'</td>':''}<td>${quantity(p.min_stock)}</td><td>${quantity(suggested)}</td>
      ${forecast?'<td>'+money(cost)+'</td>':''}<td>${suggested?'<button class="logout" data-buy-product="'+esc(p.id)+'" data-buy-qty="'+suggested+'">Criar compra</button>':'—'}</td></tr>`).join('') || '<tr><td colspan="'+columns.length+'">Nenhum produto nesta categoria.</td></tr>'}
      </tbody></table></div></div></div>`;
    $('#planningRefresh').onclick = () => openPlanning(days,category);
    $('#planCategory').onchange = e => {category=e.target.value;render()};
    if (forecast) $('#forecastDays').onchange = e => openPlanning(Number(e.target.value),category);
    content.querySelectorAll('[data-buy-product]').forEach(button => {
      button.onclick = () => {
        window.miseoSuggestedPurchase = {product_id:Number(button.dataset.buyProduct),quantity:Number(button.dataset.buyQty)};
        go('compras');
      };
    });
  }
  render();
}
