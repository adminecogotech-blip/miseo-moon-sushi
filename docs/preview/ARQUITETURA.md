# Visão geral técnica e arquitetura

## 1. Resumo

O MISEO Preview é estruturado como uma aplicação web com frontend principal em `index.html`, endpoints serverless Node.js em `api/`, módulos de serviço em `lib/` e persistência PostgreSQL via `pg`. O deploy é hospedado na Vercel; o repositório GitHub mantém o código e workflows automatizados.

## 2. Componentes

| Componente | Responsabilidade |
|---|---|
| `index.html` | Interface, estilos CSS, navegação e lógica de interação do frontend |
| `api/*.js` | Endpoints HTTP para autenticação, dashboard, cadastros, estoque, lotes, relatórios, backup e integração Tiny |
| `lib/*.js` | Lógica compartilhada de autenticação, auditoria, backup, relatórios, estoque/lotes e Tiny |
| PostgreSQL | Usuários, permissões e registros operacionais |
| Vercel | Hospedagem do frontend e execução de endpoints serverless |
| GitHub Actions | Execução de testes e workflows de validação |
| Playwright | Automação de testes de navegador/E2E, quando devidamente configurada |

## 3. Principais rotas da API

Os endpoints listados abaixo são identificados no código do projeto; confirme métodos, payloads e respostas no código vigente antes de integrar um cliente externo.

- `/api/auth/login`: autenticação.
- `/api/auth/me`: consulta da sessão atual.
- `/api/auth/logout`: encerramento de sessão.
- `/api/auth/change-password`: alteração de senha.
- `/api/auth/bootstrap`: inicialização controlada do administrador.
- `/api/dashboard`: indicadores resumidos.
- `/api/stock`: consulta e movimentação de estoque.
- `/api/lots`: consulta de lotes e validade.
- `/api/records`: operações sobre cadastros e registros operacionais.
- `/api/reports`: dados para relatórios.
- `/api/backup`: exportação/importação de backup com restrição administrativa.
- Endpoint de integração Tiny: verifique o arquivo correspondente em `api/` e `lib/tiny.js` antes de consumir; não presuma sincronização bidirecional.

## 4. Banco de dados

Ambientes identificados durante a revisão:

- **Preview:** projeto Neon `quiet-boat-47268379`, branch `br-lively-boat-b68somqh`, banco `moon_fish_preview_tests`.
- **Produção:** projeto Neon `dawn-recipe-12545392`, branch `br-damp-cherry-b6j9q65r`, banco `miseo_moon_sushi`.

Esses identificadores são documentação operacional, não credenciais. Nunca grave URLs de conexão, senhas ou tokens no repositório. Antes de executar qualquer teste de escrita, confirme em runtime que a conexão está apontando para Preview.

## 5. Testes versionados

Arquivos de teste identificados:
- `tests/security-contract.test.js`
- `tests/ui-contract.test.js`
- `tests/stock-lots.test.js`
- `tests/records-cancel.test.js`
- `tests/backup-api.test.js`
- `tests/e2e-preview.test.js`

Os testes de contrato verificam aspectos estáticos e de comportamento esperado. O sucesso de um teste isolado não prova que todas as funcionalidades do produto estão homologadas.

## 6. Pipeline e rastreabilidade

O commit usado como referência na última verificação registrada foi `2d6b95a63960fb826c6665f8fe6bc7cc2b40b64b`. O workflow de contrato foi reportado como concluído com sucesso; o E2E isolado ainda estava em execução naquele momento. Consulte a aba [Actions](https://github.com/adminecogotech-blip/miseo-moon-sushi/actions) para o estado atual, pois resultados podem mudar após novos commits.

## 7. Fluxo de requisição recomendado

1. O navegador apresenta a interface e envia requisições HTTP para os endpoints.
2. Os endpoints validam entrada, sessão e autorização.
3. Os módulos `lib/` executam regras de negócio.
4. O acesso ao PostgreSQL ocorre pelo `DATABASE_URL` configurado no ambiente.
5. A resposta retorna ao frontend, que atualiza os dados visíveis.

Não assuma que uma ação de interface persistiu no banco sem verificar a resposta da API e confirmar o dado após nova consulta.
