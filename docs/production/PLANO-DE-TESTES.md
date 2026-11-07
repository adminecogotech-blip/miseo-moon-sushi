# MISEO — Plano de testes e critérios de go-live

## 1. Testes por módulo

Para cada módulo, testar consulta, criação, edição, exclusão/cancelamento quando previsto, filtros, validação de campos, cálculos, mensagens de sucesso/erro, persistência após recarregar, permissões por perfil e auditoria. Usar casos e dados sintéticos isolados.

| Módulo | Casos mínimos |
|---|---|
| Visão geral | KPIs, alertas, links de navegação, estado vazio, falha de API |
| Planejamento | dias, categoria, fornecedor, saldo versus demanda, totais e sugestão |
| Compras | fornecedor, itens, custo, status, mensagem, confirmação, recebimento e atualização de estoque |
| Fornecedores | validação, contatos, edição, relação com compras |
| Estoque e lotes | entrada, saída, reserva, liberação, ajuste aprovado, lote, validade, concorrência e saldo negativo |
| Validades e perecíveis | vencido, crítico (até 7 dias), alerta (até 30 dias), normal e filtros |
| Receitas e fichas técnicas | ingredientes, quantidades, rendimento, custo por ficha/unidade e alteração de insumo |
| Produção e pré-preparo | recorrência, ocorrência, prioridade, datas, checklist, comentários, bloqueio, desbloqueio, arraste, status e histórico |
| Vendas e canais | cadastro, CSV inválido/válido, prévia, duplicidade, canais e totais |
| Auditoria de estoque | snapshot, contagem zero, divergência, justificativa, aprovação e log |
| Relatórios | filtros, totais, exportação e consistência com registros base |
| Integrações | configuração, timeout, credencial inválida, rate limit, retry, duplicata e estado offline |
| Administração | login/logout, senha, perfil, permissões, backup/restauração e auditoria |

## 2. Regressão visual

- Capturar screenshots do HTML homologado e da implementação na mesma versão de navegador, sistema de fontes e viewport.
- Viewports mínimos: 1440×900, 1280×800, 1024×768, 768×1024, 390×844 e 360×800.
- Estados: login, menu expandido/recolhido, tema claro/escuro se presente na referência, cada módulo, modal principal, formulário com erro, toast, tabela vazia/com dados, loading, erro de API e menu mobile.
- Comparar dimensões, posição, fontes, peso, cor, densidade, scroll, clipping, alinhamento e estados hover/focus.
- Usar diff de screenshot com tolerância pequena documentada; toda diferença visível deve ser classificada e corrigida. A comparação automatizada deve manter baseline de imagens versionada.
- Acessibilidade: teclado, foco visível, labels associados, contraste, landmarks, nomes acessíveis, mensagens anunciadas e zoom de 200%.

## 3. Segurança e autorização

- Credencial incorreta, usuário inativo, sessão expirada, logout, rotação/alteração de senha.
- Acesso anônimo a toda API protegida deve retornar 401; usuário sem permissão deve retornar 403.
- Testar cada ação (view/create/update/delete/export/restore/approve) em cada perfil.
- Validar payloads inválidos, SQL injection, XSS armazenado/refletido, CSRF conforme mecanismo, CORS, rate limiting, cookies e mensagens de erro.
- Confirmar que tokens, senhas e dados sensíveis não aparecem em logs, bundles, HTML público ou repositório.

## 4. Integração, falha e consistência

- Testar timeouts, indisponibilidade do provedor, resposta malformada, 429, 5xx, duplicação de webhook, retries e idempotência.
- Testar transações de compras/recebimento/estoque e auditoria em falha intermediária.
- Validar reconciliação dos totais e que o UI não informa sucesso antes da persistência.
- Verificar importação/exportação e restauração em banco isolado, com contagem de linhas antes/depois.

## 5. Performance e recuperação

- Definir carga esperada com dados reais de operação antes de escolher metas numéricas.
- Medir latência p50/p95/p99, erros, saturação do banco, tamanho de payload e resposta dos módulos.
- Testar volume representativo de produtos, lotes, movimentos, compras e tarefas.
- Fazer backup e restauração de ensaio; registrar duração e consistência.
- Ensaiar rollback da aplicação e compatibilidade da migration com a versão anterior.
- Confirmar alertas, runbook, health check e procedimento de incidente.

## 6. Checklist go-live

- [ ] HTML homologado preservado e versionado.
- [ ] Matriz de paridade sem itens críticos/altos em aberto.
- [ ] Todos os 13 módulos presentes com rótulos e ordem iguais à referência.
- [ ] Regressão visual em seis viewports e estados de interface.
- [ ] Regressão funcional por módulo aprovada.
- [ ] E2E autenticado executado no Preview com artefatos e logs.
- [ ] Testes de permissão por ação aprovados.
- [ ] Persistência PostgreSQL e migrations reconciliadas.
- [ ] Importação/exportação e restauração testadas em banco isolado.
- [ ] Backups automáticos, retenção e acesso testados.
- [ ] Integrações reais testadas ou mantidas explicitamente como simuladas/planejadas.
- [ ] Logs, métricas, alertas e health checks operacionais.
- [ ] Secrets e CORS revisados; HTTPS e cookies seguros confirmados.
- [ ] Domínio/SSL e variáveis de ambiente específicos de produção verificados.
- [ ] Rollback da aplicação e estratégia de banco ensaiados.
- [ ] Responsável operacional, runbook, RPO/RTO e canal de incidente definidos.
- [ ] Nenhum dado de Preview copiado para produção sem migração explícita e reconciliação.
