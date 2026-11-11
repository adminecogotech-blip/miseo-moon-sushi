function overviewMarkup(d) {
  const money = value => Number(value || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const qty = value => Number(value).toLocaleString('pt-BR');
  const dateBR = value => new Date(value).toLocaleDateString('pt-BR');
  const today = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long'});
  const totalSales=d.sales, totalPurchases=d.purchases, totalStock=d.stock_value;
  const percent=d.products>0?100*(d.products-d.low)/d.products:0;
  const moduleCards=[['estoque','⬡','Estoque'],['compras','🛒','Compras'],['producao','♨','Produção'],['vendas','▥','Vendas'],['planejamento','▦','Planejamento'],['relatorios','▤','Relatórios']];
  const stockRows=d.stock_rows||[], agenda=d.agenda||[];
  const ch=(d.channels||[]).map(row=>[row.channel,row.total]);
  const max=Math.max(1,...ch.map(row=>Number(row[1])));
  const notices=[];
  if(Number(d.low)) notices.push({title:'Estoque abaixo do mínimo',detail:d.low+' insumo(s) para conferir'});
  if(Number(d.near)) notices.push({title:'Validades próximas',detail:d.near+' lote(s) vencidos ou a vencer em até dois dias'});
  const pill=(label,color)=>'<span class="pill '+color+'">'+label+'</span>';
  const table=(headers,rows)=>'<div class="tablewrap"><table><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
  return `<div class="miseo-dashboard">
<section class="dashboard-hero"><div class="hero-copy"><span class="hero-eyebrow">BEM-VINDO DE VOLTA!</span><h1>Sua cozinha em <span>equilíbrio.</span></h1><p>Mais controle, menos desperdício, mais sabor.<br>Decisões melhores começam com uma operação conectada.</p></div><div class="hero-status"><div class="hero-stat"><span class="hero-stat-icon">⬡</span><div><small>Estoque em dia</small><div class="progress"><i style="width:${Math.max(0,Math.min(100,Math.round(percent)))}%"></i></div></div><b>${Math.round(percent)}%</b></div><div class="hero-stat"><span class="hero-stat-icon">▥</span><div><small>Vendas registradas</small><strong>${money(totalSales)}</strong></div><em>Hoje</em></div><div class="hero-stat"><span class="hero-stat-icon">✓</span><div><small>Pedidos em andamento</small><strong>${d.pending}</strong></div><span>›</span></div></div></section>
<div class="module-shortcuts">${moduleCards.map(([key,icon,label],i)=>`<button class="module-tile tile-${i+1}" onclick="go('${key}')"><span>${icon}</span><strong>${label}</strong><b>→</b></button>`).join('')}</div>
<div class="dashboard-columns"><div class="dashboard-primary">
<section class="dashboard-panel"><div class="dashboard-panel-head"><div><span class="panel-icon">▥</span><div><h2>Visão geral da operação</h2><small>Indicadores principais do restaurante</small></div></div><span class="date-chip">◷ Hoje, ${today}</span></div>
<div class="dashboard-kpis">
<div class="dashboard-kpi"><span class="kpi-glyph cyan">▥</span><div><small>Vendas recentes</small><strong>${money(totalSales)}</strong><em>Valor registrado</em></div></div>
<div class="dashboard-kpi"><span class="kpi-glyph blue">⬡</span><div><small>Valor do estoque</small><strong>${money(totalStock)}</strong><em>${d.low} item(ns) abaixo do mínimo</em></div></div>
<div class="dashboard-kpi"><span class="kpi-glyph purple">🛒</span><div><small>Compras da semana</small><strong>${money(totalPurchases)}</strong><em>${d.pending} em andamento</em></div></div>
<div class="dashboard-kpi"><span class="kpi-glyph green">↘</span><div><small>Perdas registradas</small><strong>${'—'}</strong><em>Sem classificação de perdas</em></div></div>
</div>
<div class="dashboard-analytics"><section class="analytics-card"><div class="cardtitle"><h2>Vendas por canal</h2><span class="muted">Últimos 7 dias</span></div>${ch.length?ch.slice(0,5).map(([name,val])=>`<div class="barrow"><span>${esc(name)}</span><div class="bar"><i style="width:${Math.round(val/max*100)}%"></i></div><b>${money(val)}</b></div>`).join(''):'<div class="empty">Registre vendas para visualizar este indicador.</div>'}</section>
<section class="analytics-card"><div class="cardtitle"><h2>Estoque em tempo real</h2><button class="tiny ghost" onclick="go('estoque')">Ver estoque →</button></div>${table(['Insumo','Disponível','Mínimo','Status'],stockRows.map(p=>`<tr><td>${esc(p.name)}</td><td>${qty(p.available)} ${esc(p.unit)}</td><td>${qty(p.min_stock)} ${esc(p.unit)}</td><td>${pill(Number(p.available)<Number(p.min_stock)?'Atenção':'OK',Number(p.available)<Number(p.min_stock)?'amber':'green')}</td></tr>`).join(''))}</section></div>
</section>
<section class="dashboard-panel action-panel"><div class="cardtitle"><h2>💡 Ações recomendadas</h2><span class="muted">Prioridades operacionais</span></div><div class="action-grid"><button onclick="go('planejamento')"><span>▦</span><strong>Planejar compras</strong><small>Calcular necessidades a partir do estoque e da demanda.</small><b>Ir para planejamento →</b></button><button onclick="go('validade')"><span>◷</span><strong>Conferir validades</strong><small>${d.near} lote(s) vencidos ou próximos da validade.</small><b>Ver perecíveis →</b></button><button onclick="go('compras')"><span>🛒</span><strong>Acompanhar compras</strong><small>${d.pending} pedido(s) aguardando recebimento.</small><b>Abrir compras →</b></button></div></section>
</div>
<aside class="dashboard-rail">
<section class="rail-panel"><div class="rail-head"><h2>▦ Agenda e entregas</h2><button class="tiny ghost" onclick="go('compras')">Ver todos →</button></div><strong class="rail-date">Hoje, ${today}</strong>${agenda.length?agenda.map((p,i)=>`<div class="agenda-row"><span class="agenda-dot dot-${i%4}"></span><div><strong>${esc(p.supplier || 'Fornecedor não informado')}</strong><small>${esc(p.id)} · ${esc(p.status==='sent'?'Enviado':'Recebido parcialmente')}</small></div><b>${p.expected_at?dateBR(p.expected_at):'Pendente'}</b></div>`).join(''):'<p class="muted">Nenhuma entrega pendente.</p>'}</section>
<section class="rail-panel"><div class="rail-head"><h2>♧ Notificações</h2><button class="tiny ghost" onclick="go('validade')">Ver validades →</button></div>${notices.length?notices.map((a,i)=>`<div class="notice-row"><span class="notice-mark mark-${i%4}">${i===0?'!':i===1?'✓':'i'}</span><div><strong>${esc(a.title)}</strong><small>${esc(a.detail)}</small></div></div>`).join(''):'<p class="muted">Nenhum alerta de estoque ou validade.</p>'}</section>
<section class="rail-help"><span class="help-icon">♧</span><div><strong>Precisa de ajuda?</strong><p>Acesse integrações, orientações e suporte à operação.</p><button class="tiny" onclick="go('integracoes')">Acessar suporte →</button></div></section>
<div class="system-status"><span></span> Sistema online <small>· Dados operacionais</small></div>
</aside></div></div>`;
}
