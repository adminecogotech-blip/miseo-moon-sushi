# MISEO | Moon Fish — Diagnóstico de paridade

## Fontes de verdade
- Referência: `MISEO_MVP_com_manual_integrado.html`, aproximadamente 917 mil caracteres, contendo CSS, JavaScript embutido e manual.
- Código: repositório `adminecogotech-blip/miseo-moon-sushi`, branch base `main`.
- Dados: Neon `dawn-recipe-12545392`, database `miseo_moon_sushi`, branch informada `production`.
- Nenhuma escrita foi feita no banco produtivo; alterações iniciais estão nesta branch de trabalho.

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
- Nenhuma alteração no Neon de produção e nenhuma publicação em produção.

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
