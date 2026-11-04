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
