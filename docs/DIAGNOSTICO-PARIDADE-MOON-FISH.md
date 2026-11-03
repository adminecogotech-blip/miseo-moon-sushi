# MISEO | Moon Fish — Diagnóstico de paridade

## Fontes de verdade
- Referência: `MISEO_MVP_com_manual_integrado.html`, aproximadamente 917 mil caracteres, contendo CSS, JavaScript embutido e manual.
- Código: repositório `adminecogotech-blip/miseo-moon-sushi`, branch base `main`.
- Dados: Neon `dawn-recipe-12545392`, database `miseo_moon_sushi`, branch informada `production`.
- Não foram executadas migrations nem alterações em registros operacionais. A única escrita produtiva foi a atualização explícita da configuração `app_settings.tenant` para `MISEO | Moon Fish` / `Moon Fish`, preservando `environment=production`.

## Diagnóstico inicial
1. A referência apresenta a marca MISEO e a operação **Moon Fish**. O site existente não apresentava a identidade Moon Fish em seu título e textos de marca.
2. A referência contém Visão geral, Planejamento, Compras, Fornecedores, Estoque e lotes, Validades e perecíveis, Receitas e fichas técnicas, Produção e pré-preparo, Vendas e canais, Auditoria de estoque, Relatórios, Integrações, Administração, Backup/dados e manual integrado.
3. O HTML usa persistência demonstrativa no navegador. Dados operacionais precisam ser lidos e gravados pelo backend no Neon.
4. O projeto já tem APIs de autenticação, usuários, registros, estoque, lotes e dashboard; a existência das APIs não comprova paridade integral.
5. A autenticação existente usa scrypt e sessões persistidas por hash de token. Antes desta branch, a tela e o cadastro exigiam e-mail, enquanto o requisito é usuário e senha.
6. `app_users.username` é obrigatório e o esquema observado não tem coluna de e-mail separada. O login deve usar username sem inventar um campo de e-mail.
7. Lotes e movimentos existem, mas a sincronização das saídas comuns com os saldos por lote é uma lacuna crítica a testar.

## Matriz inicial de paridade
Status: **Parcial/validar** significa que há código/tabelas relacionados, mas a equivalência ainda não foi comprovada.

| Módulo | Referência do MVP | Estado inicial | Serviço/dados | Lacuna e aceite |
|---|---|---|---|---|
| Login | Identificação, senha e feedback na composição aprovada | API de sessão existente; UI exigia e-mail | `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` | Comparar visual; testar usuário válido/inválido, inativo, logout, expiração e rota protegida |
| Visão geral | Indicadores, alertas e atalhos | Dashboard parcial | `/api/dashboard` | Confirmar fórmulas e dados reais |
| Navegação/tema | Menu lateral, recolhimento, busca, tema e mobile | Menu e preferências locais | Preferências não sensíveis podem ser locais | Comparar breakpoints, foco, hover e tema |
| Planejamento | Sugestões por estoque/demanda | Parcial/não comprovado | Estoque, compras e vendas | Confirmar regras e recálculo |
| Compras | Pedidos, itens, estados e recebimento | CRUD parcial | `purchase_orders`, `purchase_order_items`, `suppliers` | Recebimento parcial/total, cancelamento e atomicidade |
| Fornecedores | Cadastro e contatos | API/tabela existentes | `suppliers` | CRUD, validações e relações com pedidos |
| Estoque | Catálogo, saldo, movimentos e ajustes | API/tela existentes | `products`, `stock_movements` | Concorrência, saldo e permissões |
| Lotes | Cadastro, edição, cancelamento e disponibilidade | API/tabela existentes | `product_lots`, `stock_movements` | Sincronização de lotes em todas as saídas |
| Validades | Alertas e filtros de validade | Parte coberta por API de lotes | `product_lots` | Limites, fuso, vencidos e esgotados |
| Receitas | Ingredientes, unidades, quantidades e custos | Paridade/modelo não comprovados | Modelo a confirmar | Validar regras e decidir migration só após provar lacuna |
| Produção | Tarefas, estados, prioridade, prazo, recorrência, checklist, comentários/anexos/histórico quando existentes | `production_tasks` e CRUD parcial | `production_tasks`, auditoria | Mapear ações e testar transições/persistência |
| Vendas | Vendas, canais e reflexos operacionais | Tabela/CRUD parcial | `sales` | Confirmar cálculos e efeitos conforme o MVP |
| Auditoria | Contagem, divergência, revisão, aprovação e autoria | `audit_logs` existe; fluxo não comprovado | `audit_logs`, movimentos | Testar autoria e ajuste decorrente |
| Relatórios | Indicadores e filtros | Parcial | Consultas agregadas | Remover valores fictícios e verificar cálculos |
| Integrações | Estados reais ou simulações identificadas | Parcial/não comprovado | Serviços a confirmar | Não declarar envio/sincronização simulados como reais |
| Administração | Usuários, perfis, permissões e sessões | Tabelas e API existentes | `app_users`, `app_roles`, `role_permissions`, `app_sessions`, `/api/users` | Validar permissões granulares, redefinição e revogação |
| Backup/dados | Exportar/importar/restaurar com confirmação | Paridade não comprovada | Backend a confirmar | Prévia, autorização, proteção de sessões e dados sensíveis |
| Manual integrado | Manual e navegação associados à referência | Incorporação integral não comprovada | HTML/PDF de referência | Preservar conteúdo e atualizar somente os fluxos reais |

## Riscos e controles
- Não inferir regras de saldo/custo pelos nomes das tabelas.
- Preservar IDs e autoria histórica durante transição de autenticação.
- Preview precisa de banco isolado; não executar migrations ou operações destrutivas em produção sem aprovação e plano de recuperação verificado.
- O domínio e os nomes técnicos do projeto Vercel/repositório não foram renomeados: a identidade visível da operação é Moon Fish. Renomear infraestrutura não é necessário para a marca e exige avaliação separada.

## Alterações iniciais nesta branch
- Título e textos de marca atualizados para Moon Fish.
- Login visual/API atualizado para aceitar username e senha.
- Cadastro administrativo passa a solicitar username, mantendo compatibilidade temporária com payloads legados via `email`.
- Bootstrap aceita username/nome do administrador e bloqueia criação quando já existe um perfil mestre; o token deve ser removido após uso.
- Nenhuma migration ou alteração em registros operacionais. A configuração de tenant em produção foi atualizada para Moon Fish conforme solicitação. Nenhuma publicação de código em produção foi realizada.

## Plano
1. Inventariar todo o JavaScript do HTML, modais, estados alternativos e manual.
2. Documentar colunas, tipos, constraints, índices, FKs e triggers do Neon sem expor hashes/segredos.
3. Comparar a referência renderizada com a aplicação em preview nos mesmos viewports/temas/estados.
4. Reproduzir componentes e ligar ações a APIs reais; migrations versionadas somente após comprovar lacunas.
5. Testar CRUD, cálculos, persistência pós-reload/login, permissões e consistência entre módulos com dados isolados.
6. Validar autenticação e bootstrap seguro.
7. Abrir PR, validar preview e solicitar autorização explícita antes da publicação.

## Evidências pendentes
- Navegação autenticada e comparação visual automatizada.
- Build/testes automatizados e teste end-to-end Vercel–Neon com sessão válida.
- Inspeção completa dos relacionamentos e do plano de recuperação.
- Homologação e publicação em produção.


## Rodada de execução e testes — 03/11/2026

### Correções aplicadas nesta rodada
- Saídas de estoque agora processam saldo físico e reserva dentro de transação, bloqueiam concorrência por produto e consomem lotes ativos por FEFO/FIFO (validade mais próxima primeiro). Quando existem lotes ativos, a saída é recusada se o saldo desses lotes não cobrir a quantidade, evitando divergência silenciosa entre estoque e lote. Produtos legados sem lotes continuam permitindo saídas pelo saldo de movimentos.
- Movimentações de estoque gravam evento de auditoria na mesma transação.
- Adicionado helper de auditoria e eventos para cadastros/edições de registros, lotes e operações administrativas. Falhas de auditoria nesses fluxos são registradas no log do servidor, sem expor senhas.
- Criadas APIs de relatórios com consultas reais de estoque mínimo, validade, estados de produção/compras e vendas dos últimos 30 dias, respeitando a permissão de visualização do módulo.
- Criada API de leitura da trilha de auditoria, com autenticação e permissão específica.
- A tela de relatórios, auditoria, validade e integrações foi ligada às novas APIs. A tela de integrações informa explicitamente que provedores externos não estão homologados, em vez de simular uma conexão ativa.
- Health check alinhado à marca Moon Fish e à existência de qualquer perfil mestre, sem depender de um e-mail fixo.
- Adicionados testes unitários da alocação por lote e testes de contrato de segurança/rotas.

### Resultados comprovados
- GitHub Actions security-contract: sucesso no commit 0227074f39c6b8df92255defe258f7cdb62250a8.
- Build Vercel do branch de trabalho: estado READY no commit mais recente consultado.
- Compilação sintática dos scripts de frontend e das APIs de relatórios, auditoria, lotes e usuários: passou.
- Consultas read-only correspondentes aos agregados de relatórios executaram no Neon sem erro.
- Banco consultado: 15 tabelas públicas, 14 módulos habilitados, 2 perfis e 1 usuário. As tabelas operacionais consultadas (produtos, tarefas, pedidos, fornecedores, lotes e vendas) estão vazias; não foi possível validar operações com dados reais existentes sem inserir dados de teste.
- No HTML de referência executado localmente em Chromium, login demonstrativo e navegação por 12 módulos passaram, sem erros JavaScript. O teste de layout identificou overflow horizontal em 1024 px, 768 px e 390 px; isso precisa ser corrigido na implementação reproduzida e revalidado.

### Bloqueios ainda abertos
- A branch Neon disponível é somente production. Existe uma variável DATABASE_URL direcionada a Preview na Vercel, mas o valor é secreto e não foi possível confirmar que aponta para um branch/banco distinto. Isolamento de banco não confirmado; por isso não foram executadas mutações de teste no endpoint publicado.
- A ferramenta de acesso ao preview Vercel não conseguiu buscar o conteúdo da implantação, apesar de o build estar READY. A validação visual/e2e da aplicação publicada não foi concluída.
- A interface atual ainda não comprova paridade integral com a referência: manual integrado, backup/exportação/importação, operações de recebimento e itens de compra, vendas com itens/baixa de estoque, fluxo completo de auditoria física e integrações externas continuam pendentes.
- O fluxo de compras/vendas ainda usa CRUD genérico; não deve ser tratado como processo operacional completo.
- A comparação visual da aplicação do branch e testes end-to-end autenticados dependem de um ambiente Preview com banco comprovadamente isolado e acesso automatizado ao preview.

### Decisão de segurança
Nenhuma migration, limpeza, inserção de dados de teste, mutação de dados operacionais ou publicação de código em produção foi executada nesta rodada. O PR permanece em rascunho até que os bloqueios acima sejam resolvidos.


## Atualização de isolamento e integração de dados — 03/11/2026

### Banco de testes isolado criado
- Projeto Neon separado: `moon-fish-preview-tests` (ID `quiet-boat-47268379`), branch `preview-tests`, banco `moon_fish_preview_tests`.
- O schema foi reproduzido sem copiar registros operacionais de produção: 15 tabelas, 46 constraints e os índices não cobertos por constraints.
- Foram semeados somente os módulos/perfis/permissões de aplicação e uma conta QA sintética. Não foram copiados usuários reais, senhas, sessões nem registros operacionais da produção.
- Criada variável `DATABASE_URL` criptografada, restrita ao alvo Preview e à branch `feat/moon-fish-parity-auth`, apontando para o banco isolado. A variável de produção não foi alterada.
- Inseridos registros sintéticos identificados como QA para exercitar a camada de dados. Verificação read-only confirmou estoque físico 13, lote remanescente 3 após uma saída de 2, e presença de um pedido, item de pedido, tarefa de produção, venda e evento de auditoria.
- As consultas SQL usadas nos relatórios e as colunas usadas no backup foram executadas/verificadas no Neon sem erro.

### Testes automatizados mais recentes
- GitHub Actions no commit `a91ed11db9af148bc0bd1c546b357cd9d7bdebca`: suite de contratos concluiu com 24 testes aprovados e 1 teste E2E ignorado por ser uma execução sem o modo Preview habilitado.
- A suite Playwright E2E foi adicionada com uma trava de segurança: não envia mutações se `/api/health` não informar `environment=preview`.
- A validação de navegador contra o preview publicado ainda não pode concluir: a Vercel recusou novos deployments por ter excedido o limite diário gratuito de 100 deployments (código `api-deployments-free-per-day`, janela de 24 horas). O deployment mais recente disponível antecede a configuração da variável de banco isolado, portanto não deve ser usado para testes mutáveis.

### Estado correto agora
- **Isolamento do banco:** configurado em variável específica da branch e comprovado pela existência de um projeto Neon separado e sem dados operacionais de produção.
- **Teste real do endpoint publicado:** bloqueado até existir novo deployment Preview que consuma a variável isolada. O workflow E2E falha fechado se o ambiente não se identificar como `preview`.
- **Produção:** sem alterações de código, migrations ou dados operacionais nesta rodada. Os únicos registros de teste estão no projeto Neon isolado.
- **Paridade integral e manual original:** ainda pendentes. Foi criado um guia operacional na interface que descreve limitações, mas ele declara expressamente que não substitui o PDF original embutido no HTML de referência.
