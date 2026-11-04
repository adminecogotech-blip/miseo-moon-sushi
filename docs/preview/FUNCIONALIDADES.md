# Manual funcional dos módulos e APIs

## 1. Acesso e sessão

O fluxo de autenticação recebe usuário/e-mail e senha em `POST /api/auth/login`. O código usa hash de senha com scrypt e comparação segura. A sessão utiliza token aleatório; o banco armazena o hash do token e o cookie `miseo_session` é configurado como HttpOnly, Secure e SameSite=Lax, com duração de 12 horas.

Rotas associadas:
- `GET /api/auth/me`: verifica sessão.
- `POST /api/auth/logout`: encerra sessão.
- `POST /api/auth/change-password`: troca a senha.
- `POST /api/auth/bootstrap`: inicialização protegida do primeiro administrador.

A interface de login deve ser testada com credenciais válidas e inválidas. Não documentamos nem publicamos credenciais.

## 2. Perfis e permissões

Há referências aos papéis `master` e `operator`, permissões por módulo em `app_modules` e `role_permissions`, e restrição de gerenciamento de usuários ao papel master. A autorização efetiva deve ser confirmada endpoint a endpoint; ocultar um botão na interface não substitui validação no servidor.

## 3. Dashboard

`/api/dashboard` fornece contagens resumidas, incluindo produtos ativos, tarefas de produção, pedidos de compra e fornecedores. Validar se os números refletem os dados persistidos no Preview.

## 4. Cadastros e registros

O endpoint `/api/records` contempla operações GET/POST/PATCH para entidades operacionais, de acordo com os handlers implementados.

### Produtos
Campos documentados no modelo: SKU, nome/descrição, categoria, unidade, custo, preço de venda e estoque mínimo. Verificar também a consistência de SKU e valores numéricos.

### Fornecedores
Campos: nome, contato, telefone, WhatsApp, e-mail, categoria e observações. A existência de um campo WhatsApp não prova que envio de mensagens esteja conectado a um provedor.

### Tarefas de produção
Campos: título, descrição, tipo, categoria, status, prioridade, início, vencimento, recorrência, checklist e comentários.

### Compras
Campos: fornecedor, pedido, status, data prevista, total e observações. Testar criação, atualização, filtros e persistência.

### Vendas
Campos: número, canal, status, subtotal, total, data e observações. Não presumir emissão fiscal ou integração financeira sem implementação comprovada.

## 5. Estoque

`/api/stock` expõe consulta de produtos/movimentações e movimentações dos tipos:
- `in`: entrada;
- `out`: saída;
- `adjustment`: ajuste;
- `reservation`: reserva;
- `release`: liberação de reserva.

Testar saldo físico e reservado separadamente, validação de quantidades, histórico e consistência após nova consulta. Verificar regras de saldo negativo antes de considerar o módulo aprovado.

## 6. Lotes e validade

`/api/lots` lista lotes ativos e classifica a validade em:
- `expired`: vencido;
- `critical`: vencimento em até 7 dias;
- `alert`: vencimento em até 30 dias;
- `normal`: demais casos.

Testar limites de 7 e 30 dias, lote vencido, lote sem data quando permitido e fuso horário/data local.

## 7. Relatórios

`/api/reports` reúne contagens e indicadores relacionados a estoque baixo, lotes vencidos/próximos do vencimento, estados de tarefas e compras e vendas. O acesso deve respeitar a permissão de relatórios. Validar cada indicador contra consultas dos dados de origem.

## 8. Backup

`lib/backup.js` contempla exportação/importação de fornecedores, produtos, pedidos/itens de compra, tarefas de produção, vendas, lotes, movimentações de estoque e logs de auditoria. A operação é restrita a master.

A restauração pode sobrescrever dados: executar apenas no Preview com backup de segurança e confirmar contagens e integridade depois. Não enviar arquivos de backup com dados pessoais ou credenciais ao GitHub.

## 9. Auditoria

Existe helper compartilhado `lib/audit.js`. Eventos observados incluem criação de usuário e exportação de backup, mas não se deve afirmar cobertura integral de auditoria até verificar todos os handlers e realizar testes específicos.

## 10. Integração Tiny Olist ERP

`lib/tiny.js` implementa teste de leitura da API v3 de produtos usando `TINY_ACCESS_TOKEN` como bearer token e timeout de 12 segundos. O resultado distingue configuração ausente, conexão inválida e leitura bem-sucedida.

**Limite importante:** isso não comprova sincronização bidirecional, gravação no Tiny, importação completa do catálogo, sincronização automática de estoque ou webhooks. Cada fluxo deve ser especificado, implementado e homologado separadamente.

## 11. Navegação e interface

A interface contém destinos de navegação identificados por `data-page` e controles de menu/tema. A existência de 16 destinos detectados por teste estático não prova que todos os módulos estejam visualmente corretos ou que cada botão execute operações persistentes. Use o plano em [TESTES-E-HOMOLOGACAO.md](./TESTES-E-HOMOLOGACAO.md).
