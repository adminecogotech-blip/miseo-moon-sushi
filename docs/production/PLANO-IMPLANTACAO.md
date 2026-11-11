# MISEO — Plano de implantação para produção

**Data de auditoria:** 04/11/2026  
**Fonte de verdade de produto:** `docs/reference/MISEO_MVP_com_manual_integrado.html`  
**Repositório:** `adminecogotech-blip/miseo-moon-sushi`  
**Branch de trabalho:** `feat/production-parity-readiness`

## 1. Decisão arquitetural

Preservar a interface, rótulos, ordem dos menus, fluxos, regras de negócio e estados do HTML homologado. Separar somente a camada de dados e os serviços para que as operações aprovadas deixem de depender do armazenamento local demonstrativo.

Arquitetura-alvo:
- Frontend servido pela Vercel via HTTPS; a interface deve permanecer visualmente idêntica à referência.
- APIs Node.js serverless na Vercel, com validação de entrada e autorização no servidor.
- PostgreSQL no Neon, com migrations versionadas e conexão por segredo de ambiente.
- Adaptadores de integração separados por provedor; não chamar sistemas externos diretamente do navegador com credenciais.
- CI via GitHub Actions; testes unitários/contratuais e Playwright antes de promover artefatos.
- Logs estruturados, métricas, alertas e health checks com dados sensíveis redigidos.

## 2. Ambientes

| Ambiente | Finalidade | Dados e segredos |
|---|---|---|
| Desenvolvimento | Implementação e testes rápidos | Dados sintéticos; credenciais locais fora do Git |
| Homologação/Preview | Regressão, comparação visual e E2E | Banco Neon isolado, contas QA, integrações sandbox |
| Produção | Operação real Moon Fish | Banco/segredos próprios, acesso mínimo e backup independente |

É proibido apontar testes destrutivos ou restaurações de backup para produção. Usar nomes e credenciais diferentes em cada ambiente. Verificar em runtime o ambiente e a conexão antes de executar testes de escrita.

## 3. Migração do armazenamento local

O HTML homologado usa `localStorage` para estado de demonstração e `sessionStorage` para sessão demonstrativa; login e integrações no HTML são explicitamente simulados. A versão de produção deve manter a mesma experiência, mas substituir a camada de dados por APIs autorizadas.

Plano:
1. Catalogar cada entidade, chave, relação, cálculo e transição de estado do HTML.
2. Mapear entidades para PostgreSQL: produtos/insumos, fornecedores, compras e itens, lotes, movimentações, receitas/ingredientes, tarefas e checklists de produção, vendas, auditorias, preferências de UI e trilha de auditoria.
3. Criar migrations aditivas, índices e constraints; não excluir nem sobrescrever dados reais automaticamente.
4. Definir contratos API versionados e mapeadores de entrada/saída para preservar rótulos e formatos visíveis.
5. Criar importador explícito para dados demonstrativos/backup local, com prévia, validação de schema, relatório de erros e confirmação administrativa.
6. Executar migração de ensaio em banco isolado, reconciliar contagens/totais e testar restauração.
7. Ativar persistência real por ambiente; não permitir fallback silencioso para dados fictícios quando a API falhar.

## 4. Autenticação, autorização e dados

- Login validado exclusivamente no servidor; hash de senha moderno com salt e comparação segura.
- Sessão opaca aleatória, cookie HttpOnly, Secure em HTTPS, SameSite adequado, expiração e revogação no logout.
- Alteração obrigatória de senha inicial quando aplicável; criação de contas somente por administrador, sem cadastro público se não previsto no HTML.
- Autorização por ação e módulo no backend (consultar, criar, editar, excluir, aprovar, exportar/restaurar), não apenas por esconder botões.
- Negar por padrão quando uma permissão estiver ausente; auditar ações administrativas e operações críticas de estoque.
- Minimizar dados pessoais; restringir acesso por função; nunca registrar senhas, tokens ou conteúdo sensível em logs.
- Aplicar validação de esquema, limites de tamanho, queries parametrizadas, proteção contra XSS, CSRF conforme o mecanismo de sessão, rate limiting de login e endpoints sensíveis.
- CORS restritivo à origem real da aplicação; CSP e cabeçalhos de segurança após verificar compatibilidade com o HTML.
- Secrets somente no gestor de variáveis da plataforma; nunca em arquivos versionados, screenshots ou respostas de erro.

## 5. Backup, restauração e desastre

- Backup automatizado do PostgreSQL de acordo com as capacidades/plano do serviço e política de retenção aprovada.
- Exportação funcional do aplicativo deve preservar entidades, relações e metadados necessários à restauração.
- Restringir exportação/importação/restauração a administradores autorizados; registrar usuário, horário, ambiente, resultado e identificador do arquivo, sem gravar segredos.
- Criptografar backups em trânsito e em repouso; limitar acesso e definir retenção operacional/legal.
- Definir RPO/RTO com o responsável operacional antes do go-live; não inventar metas sem requisito de negócio.
- Fazer ensaio de restauração em banco isolado e reconciliação de registros/totais. Manter procedimento de recuperação documentado.
- Toda restauração deve ter prévia e salvaguarda; nunca executar contra produção durante testes.

## 6. Integrações e confiabilidade

O HTML de referência declara explicitamente que WhatsApp, iFood/99Food e ERP/PDV são simulados ou planejados; a importação CSV demonstrativa está disponível. Não considerar uma integração pronta sem provedor, credenciais de ambiente, contrato, teste de ponta a ponta e tratamento de falhas.

Para cada integração aprovada:
- definir contrato, autenticação, timeout, limites, escopos e proprietário;
- usar fila/outbox durável para tarefas assíncronas e webhooks quando necessários;
- validar assinatura e timestamp de webhooks, deduplicar eventos e aplicar idempotência;
- retries exponenciais com jitter somente para erros transitórios, limites de tentativas e dead-letter/quarentena;
- respeitar rate limits, observar correlação e oferecer estados de erro sem alterar a experiência aprovada;
- nunca mostrar sucesso antes da confirmação do provedor; manter simulação somente onde ela já existir na referência.

## 7. Observabilidade

- Logs estruturados com request/correlation ID, ambiente, endpoint, duração, status e ator interno quando autorizado.
- Métricas de latência, erros 4xx/5xx, falhas de autenticação, disponibilidade de banco, fila/retries e falhas de integração.
- Alertas para indisponibilidade, aumento de erros, falhas de backup e integração degradada.
- `/api/health` deve diferenciar serviço ativo, banco conectado e inicialização concluída sem expor detalhes internos.
- Tracing distribuído onde suportado, com propagação de correlation ID entre API e integrações.
- Redação de dados pessoais e segredos nos logs.

## 8. CI/CD, release e rollback

1. Branch de trabalho + Pull Request; não desenvolver diretamente em produção.
2. CI: lint/sintaxe, testes unitários, contratos de segurança/UI, migrations em banco descartável, testes API e Playwright.
3. Testes visuais por screenshots em viewport e estados definidos; comparar com referência e manter tolerâncias documentadas.
4. Deploy automático para Preview; E2E com credenciais de QA e banco isolado.
5. Release de produção por promoção de artefato aprovado, migrations compatíveis (expand/contract), verificação de saúde e monitoramento.
6. Rollback de aplicação para o deployment anterior; migrações devem ser compatíveis com a versão anterior ou ter plano reversível testado. Restaurar banco somente conforme plano de recuperação, nunca como rollback automático sem avaliação.
7. Registrar commit, artefato, migration, checks, operador e resultado.

## 9. Critérios de aceite por módulo

- **Visão geral:** mesmos cards, indicadores, alertas, navegação e cálculos da referência; dados derivados da API.
- **Planejamento:** mesmos filtros e sugestões, dias/categorias/fornecedor e totais reconciliados.
- **Compras:** ciclo de rascunho, envio simulado quando previsto, confirmação, recebimento e itens/totais persistidos.
- **Fornecedores:** CRUD, validações, contatos e relações com compras.
- **Estoque e lotes:** entradas/saídas/ajustes/reservas, saldo físico/reservado, lote e vínculo com produto; concorrência sem saldo inconsistente.
- **Validades e perecíveis:** classificação de vencido/crítico/alerta/normal e filtros idênticos à regra aprovada.
- **Receitas e fichas técnicas:** ingredientes válidos, rendimento, custo calculado e alterações persistidas.
- **Produção e pré-preparo:** calendário/quadro, recorrência, checklist, comentários, bloqueio, status e histórico conforme referência.
- **Vendas e canais:** cadastro/importação, validação de CSV, totais e canais conforme o HTML; integrações externas não simuladas sem contrato.
- **Auditoria de estoque:** congelamento do saldo de referência, contagem, justificativa, aprovação e trilha auditável.
- **Relatórios:** filtros, exportação e cálculos comparados com casos de referência.
- **Integrações:** estados honestos, configuração segura, timeouts, retries, idempotência e logs.
- **Administração:** usuários/perfis, backup e preferências conforme a referência; autorização verificada no servidor.

## 10. Critério para liberar produção

Não declarar go-live enquanto houver divergência visual/funcional de severidade crítica/alta, teste essencial sem execução, restauração não ensaiada, permissão sem cobertura, integração marcada como ativa sem prova ou alerta/rollback não verificado. Nenhum item será rotulado como “aguardando validação do usuário”; dependências técnicas devem ser descritas com evidência e ação objetiva.
