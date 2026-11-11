# Continuação controlada — 06/11/2026

## Resultado remoto e correção de recebimento

Esta seção atualiza os bloqueios históricos abaixo. No [run 42290599582](https://github.com/adminecogotech-blip/miseo-moon-sushi/actions/runs/42290599582), a credencial estava disponível e o E2E autenticou de verdade: **2 passaram, 1 falhou, 0 ignorados**. Contratos, screenshots offline e gate de isolamento passaram. O fluxo alcançou recebimento de compra, onde retornou 503. [Capturas do run](https://github.com/adminecogotech-blip/miseo-moon-sushi/actions/runs/42290599582/artifacts/13538589695).

- Commit publicado: `631b2d794d8525247fcc9b5a51d8818e96214e1f`.
- Deployment `dpl_13doiNhdyehbmQKNVXKMPhWEaQ5u`: READY, [Preview](https://miseo-moon-sushi-pjjdiwk48-evoluateam.vercel.app).
- Health remoto HTTP 200 confirmou esse SHA, branch autorizada, ambiente Preview e **banco efetivo `moon_fish_preview_tests`**. O vínculo de runtime está agora comprovado.
- Log Preview `2026-11-06T20:43:42.126Z`: recebimento violou `purchase_orders_status_check`. SELECT no catálogo Neon confirmou que o schema aceita `partially_received`; o código usava `partial`.
- Corrigidos workflow, condição de recebimento na interface e expectativa E2E para o estado existente `partially_received`. **Sem migration nem alteração de constraint.**
- Teste de regressão executa o handler para recebimento parcial, excesso com rollback, recebimento final e rejeição de recebimento adicional. Contratos locais após a correção: **55 passaram, 0 falhas**, 3 testes remotos não habilitados localmente.
- A correção ainda requer o novo E2E remoto. A ausência de segredo deixou de ser o bloqueio observado; não redefinir senha nem configurar outro valor sem necessidade.
- O E2E criou dados QA no Preview antes da falha. Não houve limpeza desses dados nem restauração.

## Linha de base verificada

- GitHub conectado; checkout limpo da branch `feat/production-parity-readiness`, commit `2d9f6f1886a7128139edbf2d6416d43c7c93aa20`.
- Guia mestre recuperado do anexo da conversa anterior e lido integralmente.
- Vercel conectada: equipe `team_otvHuVaLQAgnqIwOAD5JMy2W`, projeto `prj_ccCxhYVC1RLDWoNolqQI9ONI3CMq`. Preview `dpl_BJYCAieWBbtgGDCfjTYhngq4nhrQ`, READY, SHA igual à linha de base.
- Metadados da Vercel confirmam `DATABASE_URL` sensível, target Preview, restrita à branch autorizada. Valor não solicitado nem divulgado.
- Neon conectado: consulta SELECT no projeto `quiet-boat-47268379`, branch `br-lively-boat-b68somqh`, banco `moon_fish_preview_tests`: ambiente `preview`, tabela de conexões existente, `qa-admin` ativo, administrador mestre, sem troca obrigatória de senha.
- O vínculo do banco com o deployment será confirmado em runtime pelo novo campo `databaseName` do health. Metadados da variável não bastam para comprová-lo.

## Causa do E2E ignorado

Evidência: [run 42272458894](https://github.com/adminecogotech-blip/miseo-moon-sushi/actions/runs/42272458894), job `128080332529`. `QA_PASSWORD` estava vazio. O teste operacional tinha `skip: ... || !pass`. TAP: 1 passou, 1 ignorado, 0 falhas. O verde não certificava login ou operações autenticadas.

Correções:

- Quando `RUN_PREVIEW_E2E=true`, ausência de senha passa a falhar explicitamente, sem imprimir valores. Apenas a etapa de teste recebe o segredo.
- Gate exige HTTPS, alias exato autorizado, banco `moon_fish_preview_tests`, ambiente Preview, branch autorizada e SHA exato do workflow. Não segue redirects no health.
- Workflow aguarda esse SHA, evitando testar o deployment anterior enquanto a Vercel publica.
- Compras e vendas por rota genérica agora esperam 409, conforme o código real; operações efetivas usam workflow transacional.
- Restauração/merge removida da suíte padrão; requer autorização separada. Senha de operador sintético usa aleatoriedade criptográfica.
- Dependências travadas em lockfile; actions fixadas nos SHAs observados no run anterior; checkout sem persistir credenciais.

## Paridade — avanço parcial

- Restaurados título aprovado, 13 rótulos e ordem principal da referência. Administração mantém usuários, conexões, backup e manual. Agenda continua acessível em Produção.
- Marca MISEO no menu e identificação do restaurante no cabeçalho; controles separados.
- Imagem WebP original extraída sem transformação do HTML aprovado. Banner e apresentação usam esse mesmo recurso; tokens base copiados da referência.
- Corrigido conflito CSS responsivo: `.loginwrap` voltava a aparecer mesmo com classe `hidden` no celular. Novo teste de navegador cobre o estado em quatro larguras.
- Referência integral preservada, sem alterações; autenticação real e APIs mantidas. Não foram transplantados login demonstrativo, dados locais ou integrações ERP da referência.

## Testes e limites

| Verificação | Estado | Evidência |
|---|---|---|
| Contratos locais | PASSOU | `npm test`: 54 passaram, 0 falhas; 3 testes remotos não habilitados localmente |
| Segurança do target | PASSOU | rejeita produção, banco errado, branch errada, SHA antigo, URL com usuário/path e HTTP |
| Credencial ausente | PASSOU como teste negativo | execução solicitada sem `QA_PASSWORD`: falha explícita, 0 skips, sem requisições operacionais |
| Navegador offline | PASSOU | `node tools/visual-preview.cjs`; 24 capturas, referência/antes/depois, menu expandido/recolhido, 1440/1024/768/390 × 900; sem overflow no depois; login oculto; Administração/manual acessíveis; sem pageerror no depois |
| E2E remoto autenticado | BLOQUEADO | usuário orientado a configurar `QA_PASSWORD` diretamente no GitHub Actions |
| Paridade total | NÃO EXECUTADO | painel, formulários, temas e módulos completos ainda exigem comparação e correção |
| Backup/restauração real | NÃO EXECUTADO | sem autorização para restauração |

As capturas offline usam respostas sintéticas de API somente no processo de teste. Não comprovam autenticação, autorização ou persistência reais. Estão em `artifacts/visual/`, incluindo `results.json`; o diretório não é versionado. Comando reproduzível mantido em `tools/visual-preview.cjs`.

## Pendências prioritárias

1. Configurar secret de repositório `QA_PASSWORD` com a senha atual de `qa-admin`. Não enviar a senha no chat. Reexecutar o workflow na branch autorizada.
2. Confirmar novo Preview READY, SHA, banco em runtime e CI. Registrar IDs após publicação.
3. Corrigir painel para o grid, métricas, agenda, notificações e estados da referência sem valores demonstrativos. Continuar comparação por módulo, login, temas, teclado e responsividade.
4. Auditar tarefas avançadas, planejamento, CSV, autorização por ação, isolamento de usuários, concorrência e integrações; não presumir cobertura completa pela existência de testes estáticos.
5. Registrar e manter os dados QA criados pelo E2E. Nenhuma limpeza automática de dados existentes; conta sintética permanece pendente de desativação controlada após teste.

Nenhuma migration, reset, restauração, alteração de produção, merge ou alteração de `main` foi executada.
