# MISEO — Matriz de paridade

**Data:** 04/11/2026  
**Referência:** `docs/reference/MISEO_MVP_com_manual_integrado.html`  
**Implementação inspecionada:** `index.html` da branch `feat/production-parity-readiness`

## Método e ressalva

Foi realizada comparação estática de HTML, rótulos, funções e chamadas de rede. A referência está íntegra no repositório (1.492.329 bytes; blob `be8d89db64bf5866578002b0d05dac5bcb471557`). Não foi possível executar o navegador/Playwright nesta sessão, portanto a matriz abaixo identifica divergências comprovadas por código, não certificação visual pixel a pixel. O estado “em progresso” significa correção ainda não aplicada/confirmada; não depende de aprovação rotineira do usuário.

| ID | Severidade | Área | Divergência observada | Correção definida | Status |
|---|---|---|---|---|---|
| UI-001 | Crítica | Interface de referência | A referência usa título “MISEO · Sua cozinha em equilíbrio”; a implementação usa “MISEO | Moon Fish” e outro conjunto de tokens visuais | Preservar CSS, tipografia, paleta, componentes e estrutura da referência; retirar apenas as adaptações não homologadas da implementação | Em progresso |
| UI-002 | Crítica | Navegação | Referência possui 13 módulos: Visão geral, Planejamento, Compras, Fornecedores, Estoque e lotes, Validades e perecíveis, Receitas e fichas técnicas, Produção e pré-preparo, Vendas e canais, Auditoria de estoque, Relatórios, Integrações, Administração. Implementação atual tem outra nomenclatura e módulos adicionais como Agenda, Usuários e acessos, Configurações, Backup e dados, Manual operacional | Restaurar os 13 rótulos, hierarquia e destinos da referência; mapear recursos técnicos sem expor novos módulos na navegação | Em progresso |
| UI-003 | Alta | Responsividade/menu | Implementação atual usa menu lateral horizontalizado com CSS customizado e breakpoints próprios; equivalência em todos os estados não foi demonstrada | Reproduzir estrutura, menu recolhido/expandido, controles de tema, estados hover/ativo e breakpoints da referência | Em progresso |
| UI-004 | Alta | Cabeçalhos, cards e feedback | A implementação possui componentes e layout de dashboard próprios; não foi executada comparação de screenshots de cada módulo/estado | Capturar e comparar telas e estados equivalentes; corrigir diferença por diferença | Em progresso |
| UI-005 | Média | Texto e identidade | Rótulos, título e textos descritivos diferem; a tela de receitas já existe no código atual, mas sua posição/identidade visual ainda não foi comparada com a referência | Restaurar textos da referência sem reescrita comercial | Em progresso |
| FN-001 | Crítica | Autenticação | HTML de referência usa login demonstrativo em JS/local sessionStorage; backend atual tem login real. O comportamento de demonstração não pode ser tratado como segurança de produção | Preservar aparência e mensagens, substituir somente mecanismo de autenticação por sessão server-side; testar login/logout/expiração | Em progresso |
| FN-002 | Crítica | Persistência | Referência usa `localStorage` para a base e salva alterações localmente; implementação atual usa APIs e PostgreSQL para alguns recursos, mas não cobre todas as entidades da referência | Mapear todas as entidades e migrar as operações para APIs transacionais sem alterar os fluxos visíveis | Em progresso |
| FN-003 | Crítica | Receitas/fichas técnicas | Referência implementa cadastro/edição de receitas, ingredientes, rendimento e cálculo de custo; o menu/alvo correspondente não existe na navegação atual | API persistente, migration, roteamento e tela funcional de receitas implementados na branch de trabalho; formulário com até 12 linhas, inclusão/edição/arquivamento, cálculo de custo e repetição de ingrediente; falta executar E2E autenticado e comparar visualmente a tela com a referência homologada | Em progresso |
| FN-004 | Crítica | Produção | Referência inclui recorrência, quadro, checklists, comentários, bloqueio/desbloqueio, drag-and-drop, status rápido e histórico; backend atual armazena apenas campos básicos de tarefa no recurso padrão | Persistir todos os campos e transições do fluxo, com histórico e autorização, preservando a interface | Em progresso |
| FN-005 | Alta | Compras/recebimento | Referência inclui itens, custo, mensagens, confirmação e recebimento; API de registros padrão não representa integralmente todos os campos/etapas | Completar contratos e transações do workflow, reconciliação de totais e efeitos no estoque | Em progresso |
| FN-006 | Crítica | Estoque/auditoria | Referência inclui movimentos, lotes e processo de contagem/aprovação; cobertura atual da API não comprova todos os estados e regras do fluxo homologado | Validar regras e persistir cada transição, com consistência concorrente e trilha de auditoria | Em progresso |
| FN-007 | Alta | Backup | Referência importa/exporta JSON local e restaura dados de demonstração; backend possui API de backup, mas equivalência de esquema e restauração completa ainda não foi demonstrada | Criar mapeador versionado e teste exportar→restaurar→reconciliar em Preview | Em progresso |
| FN-008 | Alta | Integrações | Referência informa que WhatsApp/ERP/PDV e canais são simulados ou planejados; integração real não deve ser presumida | Manter estados honestos e só ativar integração externa quando houver contrato, credenciais e E2E comprovado | Em progresso |
| FN-009 | Alta | Importação de vendas | Referência possui prévia e confirmação de importação CSV; não foi encontrada rota dedicada evidente no backend atual | Implementar fluxo equivalente com validação, prévia e commit idempotente | Em progresso |
| FN-010 | Alta | Administração/perfis | Referência descreve troca de perfil como demonstrativa, não autorização real; implementação possui autenticação/perfis reais, mas a cobertura de permissões por ação precisa corresponder às ações aprovadas | Manter o comportamento visível e impor permissões no servidor por ação; negar por padrão | Em progresso |
| FN-011 | Média | Preferências de interface | Referência persiste tema, menu e algumas preferências em localStorage; implementação também tem preferências locais, mas chaves/estados diferem | Preservar a experiência e definir política explícita para preferências por usuário, sem alterar layout | Em progresso |
| OPS-001 | Crítica | E2E | A documentação anterior registrou que o teste E2E precisa de segredo QA; status atual deve ser consultado no Actions e não foi verificado nesta execução | Executar suite com segredo de QA no Preview isolado e anexar logs/artefatos | Em progresso |
| OPS-002 | Alta | Segurança | A existência de endpoints não comprova rate limiting, CORS restritivo, alertas e restauração testada | Auditar cada controle, aplicar os ausentes e registrar evidências | Em progresso |
| OPS-003 | Alta | Go-live | Rollback e recuperação não foram comprovados nesta auditoria | Ensaiar release e rollback em homologação antes de promover | Em progresso |

## Avanço de implementação — 04/11/2026\n\n- Criados `api/recipes.js` com autenticação, autorização por módulo, validação, escrita transacional, cálculo de custo e auditoria; `migrations/20261104_recipes.sql`; e teste de contrato `tests/recipes-api-contract.test.js`.\n- A migration foi validada pelo CI de contrato. A execução da suíte após o endpoint e o teste foi iniciada; consultar [GitHub Actions](https://github.com/adminecogotech-blip/miseo-moon-sushi/actions).\n- A tela de receitas continua ausente do `index.html` implantável; portanto, este avanço de backend não fecha a divergência funcional nem prova paridade visual. A migration ainda não foi aplicada a nenhum banco de produção. A API usa negação por padrão: para perfis não mestres, o módulo `recipes` precisa existir e estar habilitado em `app_modules`, com permissões explícitas em `role_permissions`; a migration ainda não configura esses registros.\n\n## Diferenças verificadas por leitura estática

- O HTML homologado possui aproximadamente 1,49 MB e declara o título `MISEO · Sua cozinha em equilíbrio`; a implementação na branch auditada tem aproximadamente 180 KB e declara `MISEO | Moon Fish`.
- O HTML homologado contém 13 alvos principais de navegação; o menu da implementação contém rótulos e módulos diferentes.
- A referência implementa `recipesPage`, `saveRecipe`, `savePurchase`, `saveMovement`, `saveAudit`, importação/exportação JSON e CSV no browser.
- A referência não chama `fetch()` no fluxo principal e usa `localStorage`/ `sessionStorage`; a aplicação implantável chama APIs e tem autenticação server-side.
- A comparação acima identifica divergências de código e arquitetura, mas não afirma que todos os pixels ou todos os cliques foram visualmente testados. O último workflow consultado (`41920137348`) teve `security-contract` concluído com sucesso e `isolated-preview-e2e` ignorado (`skipped`), portanto não conta como teste E2E aprovado.

## Regra de encerramento

Cada item só muda para **Corrigido** quando houver commit identificável e teste associado passando. Não é permitido marcar paridade total com base apenas na compilação ou no sucesso dos testes contratuais.


## Bloqueadores técnicos confirmados nesta continuação — 04/11/2026

- **Referência recuperada e íntegra:** o arquivo HTML de referência não está vazio; a leitura anterior retornou conteúdo vazio por limitação do método de busca. A API de conteúdo do GitHub confirma 1.492.329 bytes e o conteúdo inicia com o documento aprovado.
- **Receitas — permissão:** o endpoint retorna 403 para perfis não mestres quando não existe registro habilitado para `recipes` em `app_modules` e permissões em `role_permissions`. É necessário incluir configuração idempotente do módulo após confirmar o esquema real dessas tabelas; não se deve presumir permissões de operador.
- **Receitas — integração visual:** a tela `renderRecipesPage()` já está conectada ao endpoint consolidado `/api/records?resource=recipes`; o formulário suporta 12 ingredientes e operações de criar/editar/arquivar. Falta E2E autenticado e comparação visual com o HTML aprovado. Não alterar o HTML de referência para acomodar o endpoint.
- **CI:** `security-contract` passou no run `41920137348`; E2E foi `skipped`, não executado. O gate E2E permanece bloqueador até configurar `QA_PASSWORD` no ambiente de Preview e executar com evidência.
- **Produção:** nenhuma migration foi aplicada ao banco de produção; nenhuma alteração de dados de produção foi realizada.


## Ajuste de implantação — limite de funções Vercel

O build inicial da branch de paridade falhou com `exceeded_serverless_functions_per_deployment`: o projeto no plano atual permite no máximo 12 Serverless Functions. Para não exigir mudança de plano nem ampliar custo, a API de receitas foi consolidada no roteador existente `api/records.js`, com lógica em `lib/recipes.js`; o arquivo `api/recipes.js` foi removido e a interface passou a usar `/api/records?resource=recipes`. O deployment do commit `62db0e7cb6279820d4558728255244c699405f15` foi reportado como `READY`. O E2E foi habilitado para esta branch e está em execução; aprovação ainda depende do resultado final.


## E2E Preview — diagnóstico de execução

A execução `41921475956` confirmou que `security-contract` passa, mas o job `isolated-preview-e2e` falhou no gate de prontidão porque a URL fixa usada pelo workflow apontava para um alias antigo e o Preview não tinha `app_settings.tenant.environment='preview'`. Corrigi a URL para o deployment atual e inicializei somente o registro `tenant.environment='preview'` no banco isolado `moon_fish_preview_tests`. A execução também mostrou `QA_PASSWORD` vazio no ambiente GitHub Actions. Para não simular autenticação nem usar credenciais alternativas, separei um smoke test público (health + tela de login + responsividade) do E2E autenticado; este último fica explicitamente skipado quando o segredo não está configurado. A aprovação de login, permissões e CRUD autenticado permanece bloqueada até que `QA_PASSWORD` seja configurado como secret do repositório. Nenhuma credencial foi criada ou alterada e nenhum dado de produção foi tocado.


## Resultado verificável do CI — 04/11/2026

- Commit testado: `afe8c77fc68b6b49a1fae2a4a670dee57257067e`.
- Workflow `41930683353`: `security-contract` passou; `isolated-preview-e2e` terminou com sucesso.
- Dentro do job E2E, o smoke test público passou: endpoint de saúde confirmou `environment=preview`, banco conectado e administrador inicializado; Chromium carregou a tela de login e não encontrou overflow horizontal em 1440, 1024, 768 e 390 px; nenhuma exceção `pageerror`.
- **Limite da evidência:** o teste autenticado foi `SKIP` porque `QA_PASSWORD` está vazio. Resultado Node TAP: 2 testes, 1 passou, 1 ignorado, 0 falhas. Portanto, o status verde do job não certifica login, CRUD, navegação autenticada, autorização, estoque, backup ou restauração.
- As capturas não foram produzidas nessa execução porque a criação do diretório e screenshots estava somente no teste autenticado. Corrigido em commit posterior para gerar imagens também no smoke público; aguarda novo workflow.
- Deployment do commit `afe8c77`: READY, deployment `dpl_CkTx6WYWPLr1EHtZxpKj4DRRGXeE`, URL `https://miseo-moon-sushi-ez8rxta8t-evoluateam.vercel.app`.
- Nenhuma alteração foi aplicada ao banco de produção.

### Estado objetivo dos gates

| Gate | Estado | Evidência / bloqueio |
|---|---|---|
| Contratos de segurança/API | Aprovado | workflow `41930683353` |
| Health + Preview isolado | Aprovado | `environment=preview`, banco conectado |
| Tela de login carrega | Aprovado | Playwright/Chromium |
| Responsividade da tela de login | Aprovado parcialmente | Sem overflow nos 4 breakpoints testados |
| Capturas visuais anexadas | Em execução | correção de captura commitada em `01eabd34`, novo CI pendente |
| Login e sessão reais | Bloqueado | Secret `QA_PASSWORD` não configurado |
| E2E autenticado / CRUD / permissões | Bloqueado | suíte skipada por ausência de credencial |
| Paridade visual com HTML homologado | Não comprovada | ainda sem comparação de screenshots de todas as telas |
| Paridade funcional completa | Não comprovada | lacunas FN-001 a FN-011 ainda abertas |
| Go-live / produção | Bloqueado | gates acima, backup/rollback e integrações não homologados |


## Receitas — verificação de integração estática — 04/11/2026

A leitura integral do `index.html` da branch confirmou que a tela `renderRecipesPage()` existe, que o menu `data-page="receitas"` aponta para ela e que o roteador `go('receitas')` chama a renderização. A tela consulta produtos e receitas, permite criar/editar/arquivar fichas e envia alterações para `/api/records?resource=recipes`. O contrato da API calcula custo total e unitário, valida insumos ativos e registra auditoria. Esta é confirmação por leitura estática do código, não execução autenticada em navegador.

Os workflows `41931336376`, `41931364264` e `41931557457` concluíram com sucesso. No mais recente (`41931557457`), `security-contract` passou e `isolated-preview-e2e` concluiu o smoke test público e enviou quatro capturas de tela como artefato. Resultado TAP: 2 testes, 1 passou, 1 ignorado, 0 falhas. O teste autenticado segue `SKIP` porque `QA_PASSWORD` está vazio; portanto, login real, CRUD, permissões, estoque, relatórios e backup ainda não foram exercitados por navegador.


## Atualização de evidências — workflow 41931557457 — 04/11/2026

- Commit da documentação/branch: `85994f7b8bca5e80cb8697a507b9956801523234`.
- Workflow: [41931557457](https://github.com/adminecogotech-blip/miseo-moon-sushi/actions/runs/41931557457). Os jobs `security-contract` e `isolated-preview-e2e` concluíram com sucesso.
- O Preview respondeu `environment=preview`, `database=connected`, `administratorInitialized=true`; nenhum dado de produção foi consultado ou alterado.
- Smoke test Chromium aprovado: página de login carregou; sem overflow horizontal em 1440, 1024, 768 e 390 px; sem `pageerror`.
- Artefato `preview-visual-screenshots` enviado com quatro arquivos (3.114.681 bytes): [artefato do workflow](https://github.com/adminecogotech-blip/miseo-moon-sushi/actions/runs/41931557457/artifacts/13371857156). As imagens cobrem somente a tela de login nos quatro breakpoints; não constituem comparação com o HTML homologado nem validação das telas internas.
- Resultado TAP: 2 testes, 1 aprovado, 1 ignorado, 0 falhas. O teste autenticado foi ignorado porque a variável `QA_PASSWORD` está vazia. Não houve login, CRUD, validação de permissões ou teste operacional autenticado.

### Estado atualizado dos gates

| Gate | Estado | Evidência / bloqueio |
|---|---|---|
| Contratos de segurança/API | Aprovado | workflow `41931557457` |
| Health + isolamento Preview | Aprovado | health confirma Preview e DB conectado |
| Tela de login + responsividade | Aprovado no escopo testado | Chromium, 1440/1024/768/390 px |
| Capturas de login | Geradas | artefato `13371857156`, quatro arquivos |
| Login/sessão autenticados | Bloqueado | `QA_PASSWORD` não configurado |
| E2E autenticado (CRUD/permissões/estoque/backup) | Bloqueado | teste explicitamente ignorado; não aprovado |
| Paridade visual de módulos | Não comprovada | sem screenshots comparativas de telas internas |
| Paridade funcional integral | Não comprovada | itens FN-001 a FN-011 ainda exigem validação/correção |
| Go-live | Bloqueado | E2E autenticado, recuperação, rollback e integrações ainda sem homologação |

**Ação externa indispensável para desbloquear a suíte autenticada:** cadastrar no GitHub Actions o secret de repositório `QA_PASSWORD` correspondente ao usuário de teste `qa-admin`. Não registrar a senha em código, documentação, issue ou chat. Até esse secret existir, a suíte não deve inventar credenciais nem declarar os fluxos autenticados aprovados.

**Segurança operacional:** manter todos os testes e migrations no banco `moon_fish_preview_tests`; não executar migrations, limpeza ou testes de escrita no banco de produção.


## Errata e avanço técnico — 04/11/2026 20:18 BRT

Esta seção prevalece sobre afirmações anteriores conflitantes neste documento. A auditoria da branch atual confirmou:

- **Tela de receitas existe e está conectada:** `index.html` contém `renderRecipesPage()`, o menu `data-page="receitas"` e chamadas para `/api/records?resource=recipes`. A tela permite criar, editar e arquivar fichas; apresenta até 12 linhas de ingredientes; permite repetir o mesmo insumo; consulta produtos para montar as opções.
- **Consulta de receita corrigida:** `lib/recipes.js` passou a retornar `unit_cost` e `ingredient_count` também no detalhe da ficha, evitando que a resposta de edição/detalhe perca os campos de custo unitário e quantidade de ingredientes.
- **Layout responsivo dos ingredientes:** `index.html` passou a usar grade adaptável nas 12 linhas de ingredientes, para evitar que as três colunas fixas provoquem estouro em telas estreitas.
- **Contrato reforçado:** `tests/recipes-api-contract.test.js` agora verifica explicitamente os aliases `unit_cost` e `ingredient_count` na consulta da receita.

Commits associados:
- `f8ff751aa4df7536675009fd30313037125d0e96` — custo unitário e contagem de ingredientes na consulta.
- `e28ab4be6c0a1c0a6e8411217f68b66691030ff2` — grade responsiva para ingredientes.
- `06cd86a14509ba09372c5f55950a185a86eaac3f` — cobertura contratual dos campos de detalhe.

### Revalidação dos workflows mais recentes

Foram consultados os logs completos do job `isolated-preview-e2e` e os metadados de artefatos do workflow `41932457043`, além dos estados dos workflows `41932443275`, `41932435626` e `41932092291`. Os quatro workflows concluíram com sucesso em ambos os jobs (`security-contract` e `isolated-preview-e2e`).

No workflow `41932457043`:
- Health do ambiente: `status=ok`, `database=connected`, `environment=preview` e `administratorInitialized=true`.
- Smoke público Chromium: **1 aprovado** — tela de login, health, responsividade em 1440/1024/768/390 px e ausência de `pageerror`.
- E2E autenticado: **1 ignorado (`SKIP`)**, porque `QA_PASSWORD` estava vazio. Resultado TAP: 2 testes, 1 passou, 1 ignorado, 0 falhas.
- Artefato `preview-visual-screenshots` enviado, ID `13372442194`, 3.113.888 bytes, quatro capturas da tela de login. Não cobre telas internas nem comparação com o HTML de referência.

Links de evidência:
- [Workflow 41932457043](https://github.com/adminecogotech-blip/miseo-moon-sushi/actions/runs/41932457043)
- [Capturas de tela do workflow 41932457043](https://github.com/adminecogotech-blip/miseo-moon-sushi/actions/runs/41932457043/artifacts/13372442194)

### Gates atualizados

| Gate | Estado em 04/11/2026 20:18 BRT | Evidência |
|---|---|---|
| Contratos de segurança/API | Aprovado | Quatro workflows recentes |
| Health e isolamento do Preview | Aprovado | Health do workflow `41932457043` |
| Login visual e responsividade pública | Aprovado no escopo do smoke | Chromium, quatro larguras |
| Tela de receitas — existência e ligação à API | Confirmado por inspeção estática | `renderRecipesPage()` e rota consolidada |
| Detalhe de receita — custo unitário/contagem | Corrigido e coberto por teste contratual | commits `f8ff751` e `06cd86a` |
| Grade de ingredientes em telas estreitas | Correção commitada | commit `e28ab4b`; ainda sem E2E autenticado em viewport móvel |
| Login e sessão reais | Bloqueado | `QA_PASSWORD` ausente |
| CRUD, permissões, estoque, relatórios e backup autenticados | Bloqueado | teste autenticado continua `SKIP` |
| Paridade visual integral com HTML homologado | Não comprovada | quatro screenshots são apenas da tela de login |
| Go-live | Bloqueado | E2E autenticado, recuperação/rollback e integrações não homologados |

**Nota de segurança:** não foi criada senha alternativa nem alterado qualquer segredo. Para executar os fluxos autenticados, o responsável pelo repositório deve cadastrar `QA_PASSWORD` como secret do GitHub Actions para o usuário `qa-admin`. Toda validação continua restrita ao Preview isolado; banco de produção permanece intocado.


## Fechamento da execução 41932836398 — 04/11/2026

- Workflow [41932836398](https://github.com/adminecogotech-blip/miseo-moon-sushi/actions/runs/41932836398) concluído com sucesso; os jobs `security-contract` e `isolated-preview-e2e` passaram.
- O job `security-contract` executou 43 testes: 41 aprovados, 0 falhas e 2 ignorados. Os dois ignorados são os testes de navegador (`isolated preview smoke` e `isolated preview E2E`) no contexto desse job, pois ele não configura `RUN_PREVIEW_E2E=true`; isso não é falha dos contratos.
- O job `isolated-preview-e2e` executou o smoke público: 1 aprovado, 0 falhas. O E2E autenticado ficou `SKIP` porque `QA_PASSWORD` estava vazio. TAP: 2 testes, 1 aprovado, 1 ignorado, 0 falhas.
- Health confirmou `environment=preview`, banco conectado e administrador inicializado. Capturas de login em quatro larguras foram anexadas no artefato [13371888183](https://github.com/adminecogotech-blip/miseo-moon-sushi/actions/runs/41932836398/artifacts/13371888183), tamanho 3.113.888 bytes.
- Deployment Vercel do commit `ab7170cbf776f384b6073bd1a352b8dab3a7d17f` está `READY`: [inspeção do deployment](https://vercel.com/evoluateam/miseo-moon-sushi/2JFfDZC1foVPf24AKQrDMx8DNKRa). A URL de Preview estável utilizada pelo workflow é `https://miseo-moon-sushi-git-feat-production-parity-r-615461-evoluateam.vercel.app`.
- PR #2 permanece aberto e não foi mesclado: [Pull Request #2](https://github.com/adminecogotech-blip/miseo-moon-sushi/pull/2). Não foi promovido para produção.

### Próximas ações técnicas

1. Obter do mantenedor do repositório a configuração segura do secret `QA_PASSWORD` para `qa-admin`; não criar senha substituta nem publicar credenciais.
2. Com o secret presente, executar a suíte autenticada integral e corrigir falhas reais até obter evidência sem `SKIP`.
3. Expandir a captura automatizada para telas internas e comparar com o HTML homologado, em especial navegação expandida/recolhida, home, planejamento, compras, estoque, produção, vendas, receitas, relatórios e administração.
4. Fechar divergências funcionais de persistência e fluxos descritas nos itens FN-001 a FN-011; testar backup/restauração e rollback somente no Preview isolado.
5. Manter PR aberto e não promover release até que todos os gates críticos estejam aprovados.

**Segurança:** nenhuma alteração em banco de produção; nenhuma migration de produção; nenhum segredo foi criado, lido ou modificado nesta execução.

---

## 2026-11-04 — Revisão das APIs de compras, vendas e recebimento de lotes

### Correções implementadas

- lib/workflows.js: corrigida a validação da data de validade informada no recebimento de compras. A validação agora exige formato ISO AAAA-MM-DD e verifica a existência real da data no calendário (incluindo ano bissexto).
- tests/workflows-date-validation.test.js: adicionados testes para datas válidas, ano bissexto, dias impossíveis, mês inválido e formatos não aceitos.
- api/records.js: mutações genéricas POST, PATCH e DELETE para compras e vendas agora retornam HTTP 409 e orientam o uso do fluxo transacional. Isso impede criar/alterar/cancelar cabeçalhos sem sincronizar itens, reservas, recebimentos e movimentos de estoque.
- tests/records-cancel.test.js: testes agora cobrem o bloqueio de mutações genéricas em compras e vendas.

### Evidência automatizada

- Commit de código: 414ffb53d8509a64395ce9a9dddfcc591267c711 (validação de validade).
- Commit da proteção transacional: cd9d4781732e49e819e1c1270960cc43d95709b4.
- Commit dos testes atualizados: 8a1c12ea9f94f8537471aec2fed1842e73adf65b.
- Workflow: https://github.com/adminecogotech-blip/miseo-moon-sushi/actions/runs/41935010127 — ambos os jobs concluídos com sucesso.
- Testes de contrato: 45 no total, 43 aprovados, 0 falhas e 2 ignorados (testes de navegador não executados nesse job).
- Preview smoke: 1 aprovado, 0 falhas; E2E autenticado ignorado porque QA_PASSWORD não está configurado.
- Capturas de tela do Preview: https://github.com/adminecogotech-blip/miseo-moon-sushi/actions/runs/41935010127/artifacts/13373078699.

### Limites e próximos gates

- O E2E autenticado de login, navegação, CRUD, estoque/lotes, relatórios, auditoria, backup e permissões permanece pendente até que o mantenedor configure o segredo QA_PASSWORD em GitHub Actions.
- O smoke test público não comprova fluxos internos autenticados nem paridade visual integral com docs/reference/MISEO_MVP_com_manual_integrado.html.
- O PR #2 permanece aberto e não mesclado. Nenhuma promoção para produção foi executada; o banco de produção permanece intocado.


## Auditoria complementar de APIs — 05/11/2026

A leitura estática dos handlers da branch identificou os seguintes pontos que precisam ser corrigidos ou comprovados antes da homologação. São achados de código; não significam que tenha ocorrido falha em produção.

| ID | Severidade | Área | Evidência observada | Ação necessária | Status |
|---|---|---|---|---|---|
| API-001 | Crítica | Backup/restauração | `lib/backup.js` exporta/importa tabelas operacionais por lista fixa, mas não inclui `recipes` nem `recipe_ingredients`; portanto um backup operacional não preserva fichas técnicas. | Estender o formato versionado e a ordem de importação para receitas e ingredientes, validar integridade referencial e testar exportação/restauração em Preview isolado. | Aberto |
| API-002 | Alta | Integração Tiny Olist | `lib/tiny.js` só verifica se a variável existe e faz uma leitura de um produto (`limit=1`). Não implementa sincronização de catálogo, estoque, preços ou serviços, nem persistência de estado de sincronização. | Implementar e testar os contratos de leitura/sincronização previstos, com paginação, limites, tratamento de erros e idempotência; manter exclusivamente Tiny Olist como ERP. | Aberto |
| API-003 | Alta | Fluxo de vendas e lotes | O código permitia concluir venda quando não havia lotes ativos, pois a validação estava condicionada a `lot.rowCount`. | Corrigido na branch: toda baixa exige saldo de lote rastreável suficiente; adicionado teste contratual `tests/workflows-lot-balance.test.js`. Aguardar CI verde. | Correção aplicada; CI pendente |
| API-004 | Alta | Fluxo de compras | O recebimento aceita linhas repetidas para o mesmo produto sem consolidá-las; cada linha calcula o saldo pendente consultando o mesmo estado antes das atualizações seguintes. | Validar duplicidade de produto por requisição ou consolidar quantidades antes da transação; cobrir concorrência e recebimentos parciais com testes. | Aberto |
| API-005 | Alta | Relatórios | `lib/reports.js` conta lotes vencidos/próximos com `quantity_remaining > 0`, mas a regra de saldo e movimentos de estoque deve ser conciliada com os lotes e baixas de venda. | Criar testes de consistência entre saldo físico, reservado, lotes e indicadores; não homologar KPIs até reconciliar as regras. | Aberto |
| API-006 | Média | Auditoria | `auditEvent` captura erro e retorna `false`, permitindo que a operação de negócio confirme mesmo sem registrar o evento de auditoria. | Classificar quais ações exigem auditoria obrigatória e, para elas, registrar evento na mesma transação da mutação; testar falha de escrita no log. | Aberto |

### Evidência e limites desta auditoria

- Foram inspecionados os handlers `api/records.js`, `api/_auth.js`, `lib/workflows.js`, `lib/tiny.js`, `lib/reports.js`, `lib/audit.js`, `lib/backup.js` e `lib/recipes.js` no branch `feat/production-parity-readiness`.
- Esta etapa foi de leitura estática; não executou mutações no banco, não acessou credenciais do Tiny e não alterou produção.
- Os itens API-001 a API-006 devem receber testes automatizados antes de correção ser considerada concluída. A integração Tiny permanece não homologada até teste com credencial de Preview autorizada.
