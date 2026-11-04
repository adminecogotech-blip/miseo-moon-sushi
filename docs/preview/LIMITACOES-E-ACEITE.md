# Limitações conhecidas e critérios de aceite

## 1. Limitações registradas na data de referência

1. **Paridade visual:** a referência aprovada `MISEO_MVP_com_manual_integrado.html` não foi encontrada na branch examinada. Sem comparação com o arquivo exato, não é possível certificar equivalência visual. O responsável relatou anteriormente diferenças no menu expandido, home e banner; esses pontos devem ser tratados como itens de verificação prioritários.
2. **E2E autenticado:** o teste de ponta a ponta depende do secret `QA_PASSWORD`; a última observação indicava que a execução isolada ainda estava em andamento. Consulte Actions para estado atualizado.
3. **Tiny:** a implementação identificada realiza teste de leitura de produtos. Não há evidência suficiente nesta documentação para afirmar sincronização bidirecional, escrita, importação integral ou webhooks.
4. **Auditoria:** existe helper, mas cobertura integral de todos os tipos de alteração precisa ser demonstrada.
5. **Botões e fluxos:** testes estáticos e a existência de handlers não garantem que cada ação execute, trate erros e persista corretamente em todas as telas.
6. **Backup/importação:** a funcionalidade pode alterar muitos registros e requer teste controlado em Preview.
7. **Logos/ativos:** validar os arquivos oficiais e suas proporções visualmente; não inferir aprovação apenas pela presença de um wordmark.

## 2. Prioridades de correção/verificação

- P0: isolamento do banco, login, sessão e autorização de endpoints.
- P1: menu expandido/recolhido, home/banner, botões e persistência de cadastros.
- P1: movimentos de estoque, reservas, lotes/validade e backup/restauração.
- P2: relatórios, auditoria e mensagens de erro.
- P2: Tiny com token de teste e definição explícita do escopo.
- P2: acessibilidade, responsividade e comparação visual documentada.

## 3. Critérios de aceite sugeridos

- Zero requisições de escrita ao banco de produção durante homologação.
- Testes de autenticação/permissão passam para cada perfil.
- Toda ação crítica mostra resultado de sucesso ou erro e persiste conforme esperado.
- Saldo físico/reservado e histórico de estoque permanecem consistentes.
- Importação de backup é testada em base isolada e validada por contagem/integridade.
- Interface comparada com a referência aprovada em desktop/tablet/mobile.
- Relatórios reconciliados com registros de origem.
- Escopo e limitações da integração Tiny descritos sem alegar capacidades não testadas.
- Evidências e SHA do commit arquivados.

## 4. Como registrar uma falha

Incluir: módulo/tela, perfil utilizado, passos para reproduzir, resultado esperado/observado, horário aproximado, navegador/resolução, endpoint/status HTTP quando disponível e captura sanitizada. Nunca incluir senha, token, cookie, dados pessoais ou URL de conexão.

## 5. Aviso

Esta documentação é uma descrição técnica/funcional e um plano de homologação, não um laudo de segurança nem uma certificação de produção. O estado do deploy e dos workflows pode mudar após a data de referência.
