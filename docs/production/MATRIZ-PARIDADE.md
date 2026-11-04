# MISEO — Matriz de paridade

**Data:** 04/11/2026  
**Referência:** `docs/reference/MISEO_MVP_com_manual_integrado.html`  
**Implementação inspecionada:** `index.html` da branch `feat/moon-fish-parity-auth`

## Método e ressalva

Foi realizada comparação estática de HTML, rótulos, funções e chamadas de rede. A referência está íntegra no repositório (1.492.329 bytes; blob `be8d89db64bf5866578002b0d05dac5bcb471557`). Não foi possível executar o navegador/Playwright nesta sessão, portanto a matriz abaixo identifica divergências comprovadas por código, não certificação visual pixel a pixel. O estado “em progresso” significa correção ainda não aplicada/confirmada; não depende de aprovação rotineira do usuário.

| ID | Severidade | Área | Divergência observada | Correção definida | Status |
|---|---|---|---|---|---|
| UI-001 | Crítica | Interface de referência | A referência usa título “MISEO · Sua cozinha em equilíbrio”; a implementação usa “MISEO | Moon Fish” e outro conjunto de tokens visuais | Preservar CSS, tipografia, paleta, componentes e estrutura da referência; retirar apenas as adaptações não homologadas da implementação | Em progresso |
| UI-002 | Crítica | Navegação | Referência possui 13 módulos: Visão geral, Planejamento, Compras, Fornecedores, Estoque e lotes, Validades e perecíveis, Receitas e fichas técnicas, Produção e pré-preparo, Vendas e canais, Auditoria de estoque, Relatórios, Integrações, Administração. Implementação atual tem outra nomenclatura e módulos adicionais como Agenda, Usuários e acessos, Configurações, Backup e dados, Manual operacional | Restaurar os 13 rótulos, hierarquia e destinos da referência; mapear recursos técnicos sem expor novos módulos na navegação | Em progresso |
| UI-003 | Alta | Responsividade/menu | Implementação atual usa menu lateral horizontalizado com CSS customizado e breakpoints próprios; equivalência em todos os estados não foi demonstrada | Reproduzir estrutura, menu recolhido/expandido, controles de tema, estados hover/ativo e breakpoints da referência | Em progresso |
| UI-004 | Alta | Cabeçalhos, cards e feedback | A implementação possui componentes e layout de dashboard próprios; não foi executada comparação de screenshots de cada módulo/estado | Capturar e comparar telas e estados equivalentes; corrigir diferença por diferença | Em progresso |
| UI-005 | Média | Texto e identidade | Rótulos, título e textos descritivos diferem; exemplo: “Receitas e fichas técnicas” ausente como alvo de navegação atual | Restaurar textos da referência sem reescrita comercial | Em progresso |
| FN-001 | Crítica | Autenticação | HTML de referência usa login demonstrativo em JS/local sessionStorage; backend atual tem login real. O comportamento de demonstração não pode ser tratado como segurança de produção | Preservar aparência e mensagens, substituir somente mecanismo de autenticação por sessão server-side; testar login/logout/expiração | Em progresso |
| FN-002 | Crítica | Persistência | Referência usa `localStorage` para a base e salva alterações localmente; implementação atual usa APIs e PostgreSQL para alguns recursos, mas não cobre todas as entidades da referência | Mapear todas as entidades e migrar as operações para APIs transacionais sem alterar os fluxos visíveis | Em progresso |
| FN-003 | Crítica | Receitas/fichas técnicas | Referência implementa cadastro/edição de receitas, ingredientes, rendimento e cálculo de custo; o menu/alvo correspondente não existe na navegação atual | API persistente e migration de receitas/ingredientes criadas na branch de trabalho; falta ligar a tela homologada ao endpoint e executar E2E | Em progresso |
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
- **Receitas — integração visual:** endpoint e migration ainda não estão conectados à tela aprovada; não alterar o HTML de referência para acomodar o endpoint.
- **CI:** `security-contract` passou no run `41920137348`; E2E foi `skipped`, não executado. O gate E2E permanece bloqueador até configurar `QA_PASSWORD` no ambiente de Preview e executar com evidência.
- **Produção:** nenhuma migration foi aplicada ao banco de produção; nenhuma alteração de dados de produção foi realizada.
