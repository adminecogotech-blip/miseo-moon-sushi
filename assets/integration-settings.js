const credentialLabels={
 SAIPOS_AUTHORIZATION:'Autorização da API de Dados (cabeçalho Authorization)',CIELO_LIO_CLIENT_ID:'Client ID do Order Manager',CIELO_LIO_MERCHANT_ID:'Merchant ID do Order Manager',CIELO_LIO_ACCESS_TOKEN:'Access token do Order Manager',NINETY_NINE_FOOD_CLIENT_ID:'App ID da plataforma parceira',NINETY_NINE_FOOD_CLIENT_SECRET:'App secret da plataforma parceira',
 TELEGRAM_BOT_TOKEN:'Token do bot (BotFather)',WHATSAPP_PHONE_NUMBER_ID:'ID do número de telefone',WHATSAPP_APP_SECRET:'Segredo do aplicativo Meta',WHATSAPP_ACCESS_TOKEN:'Token de acesso da Meta',WHATSAPP_VERIFY_TOKEN:'Token de verificação do webhook',
 CIELO_MERCHANT_ID:'Merchant ID',CIELO_MERCHANT_KEY:'Merchant Key',REDE_PV:'Número do estabelecimento (PV)',REDE_TOKEN:'Token de integração'
};
async function renderIntegrationSettings(){
 const root=document.getElementById('mainContent');root.innerHTML='<div class="card">Carregando integrações…</div>';
 let data;try{data=await api('/api/records?resource=connections')}catch(e){if($('#app').dataset.activePage==='integracoes')root.textContent=e.message;return}
 if($('#app').dataset.activePage!=='integracoes')return;
 const groups=[['delivery','Gestão de pedidos e canais'],['payments','Terminais e adquirentes'],['messaging','Mensagens']];
 const preferred=['saipos','ifood','99food','stone','cielo','infinitepay','telegram','whatsapp_cloud'];
 data.items.sort((a,b)=>(preferred.includes(a.key)?preferred.indexOf(a.key):99)-(preferred.includes(b.key)?preferred.indexOf(b.key):99));
 root.innerHTML=groups.map(([category,title])=>'<section><div class="subhead">'+title+'</div><div class="connection-grid">'+data.items.filter(x=>x.category===category).map(x=>
   '<article class="card connection-card"><div class="cardtitle"><h2>'+esc(x.name)+'</h2><span class="pill">'+(x.enabled?'Habilitada':'Desativada')+'</span></div><p>'+esc(x.description)+'</p><p class="muted">'+esc(x.mode)+'</p><button class="soft" data-provider="'+esc(x.key)+'">Configurar</button></article>'
 ).join('')+'</div></section>').join('');
 const backup=document.createElement('button');backup.textContent='Backup e dados';backup.className='soft';backup.onclick=()=>go('backup');$('#moduleActions').replaceChildren(backup);
 for(const b of root.querySelectorAll('[data-provider]')) b.onclick=()=>openConnection(data.items.find(p=>p.key===b.dataset.provider),data.vaultReady,b);
}
function openConnection(provider,vaultReady,opener){
 const dialog=document.createElement('dialog');dialog.className='miseo-dialog';dialog.setAttribute('aria-label',provider.name);
 const credentialLabel=k=>credentialLabels[k]||(k.endsWith('CLIENT_ID')?'Client ID':k.endsWith('CLIENT_SECRET')?'Client secret':k.endsWith('ACCESS_TOKEN')?'Token de acesso':k);
 dialog.innerHTML='<div class="cardtitle"><h2>'+esc(provider.name)+'</h2><button type="button" class="ghost">Fechar</button></div><form class="connection-fields">'+
   provider.fields.map(([key,label])=>'<label>'+esc(label)+'<input data-config="'+esc(key)+'" maxlength="200" value="'+esc(provider.config[key]||'')+'"></label>').join('')+
   provider.env.map(key=>'<label>'+esc(credentialLabel(key))+'<input type="password" autocomplete="new-password" data-credential="'+esc(key)+'" '+(vaultReady?'':'disabled')+' placeholder="'+(provider.configured.includes(key)?'Configurada · preencha para substituir':'Aguardando credencial')+'"></label>').join('')+
   (vaultReady?'':'<p class="notice">O administrador precisa habilitar a chave de criptografia neste ambiente.</p>')+
   '<label><span><input type="checkbox" name="enabled" '+(provider.enabled?'checked':'')+'> Habilitar configuração</span></label><div class="actions"><button class="primary">Salvar configuração</button>'+
   (provider.canVerify?'<button type="button" class="soft" data-verify>Verificar acesso salvo</button>':'')+'</div><p role="status"></p></form>';
 $('#mainContent').append(dialog);
 dialog.querySelector('.ghost').onclick=()=>dialog.close();
 dialog.onclose=()=>{dialog.remove();opener.focus()};
 const form=dialog.querySelector('form'),status=form.querySelector('[role="status"]');
 async function submit(verify){
   const payload={provider_key:provider.key};
   if(verify)payload.action='verify';
   else{
     payload.enabled=form.elements.enabled.checked;payload.config={};payload.credentials={};
     form.querySelectorAll('[data-config]').forEach(i=>payload.config[i.dataset.config]=i.value);
     form.querySelectorAll('[data-credential]').forEach(i=>{if(i.value)payload.credentials[i.dataset.credential]=i.value});
   }
   const buttons=form.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);
   try{
     const res=await api('/api/records?resource=connections',{method:'POST',body:JSON.stringify(payload)});
     status.textContent=res.message;
     if(!verify){Object.assign(provider.config,payload.config);provider.enabled=payload.enabled;opener.closest('article').querySelector('.pill').textContent=provider.enabled?'Habilitada':'Desativada';
       for(const input of form.querySelectorAll('[data-credential]'))if(input.value){provider.configured.push(input.dataset.credential);input.value='';input.placeholder='Configurada · preencha para substituir'}}
   }catch(e){status.textContent=e.message}finally{buttons.forEach(b=>b.disabled=false)}
 }
 form.onsubmit=e=>{e.preventDefault();submit(false)};const verify=form.querySelector('[data-verify]');if(verify)verify.onclick=()=>submit(true);dialog.showModal();
}
