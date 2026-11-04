# Plano de testes e homologação do Preview

## 1. Objetivo

Validar a interface, autenticação, permissões, persistência, regras de negócio, backup, integração Tiny e isolamento do banco. O plano é operacional; marque cada caso como aprovado somente após executar e registrar evidência.

## 2. Pré-condições

- Confirmar que o deploy aponta para Preview.
- Confirmar o banco `moon_fish_preview_tests` e não o banco de produção.
- Usar dados fictícios.
- Configurar `QA_PASSWORD` como secret no GitHub Actions para o E2E autenticado, se o workflow exigir.
- Guardar evidências sem tokens, senhas, dados pessoais ou strings de conexão.

## 3. Testes de autenticação e permissões

- [ ] Login com credenciais válidas.
- [ ] Login com senha inválida e usuário inexistente; mensagem não deve revelar detalhes sensíveis.
- [ ] Sessão consultável em `/api/auth/me`.
- [ ] Logout invalida a sessão.
- [ ] Expiração/revogação de sessão.
- [ ] Alteração de senha e validação da nova senha.
- [ ] Bootstrap só funciona quando habilitado e com token válido.
- [ ] Master consegue administrar usuários; operator não consegue.
- [ ] Endpoints bloqueiam requisições sem sessão/permissão, mesmo se chamados diretamente.

## 4. Testes de módulos e persistência

- [ ] Dashboard: conferir indicadores com dados do banco.
- [ ] Produtos: criar, consultar, editar e validar campos obrigatórios.
- [ ] Fornecedores: criar/editar e validar telefone/WhatsApp/e-mail.
- [ ] Produção: criar/editar tarefa, status, prioridade, datas e checklist.
- [ ] Compras: criar/editar pedido, fornecedor, status, data e total.
- [ ] Vendas: criar/editar registro e validar totais.
- [ ] Estoque: entrada, saída, ajuste, reserva e liberação.
- [ ] Estoque: saldo físico e reservado, limites e histórico após recarregar.
- [ ] Lotes: vencido, até 7 dias, até 30 dias e normal.
- [ ] Relatórios: comparar contagens e estados com dados de origem.
- [ ] Auditoria: confirmar quais ações geram eventos e se detalhes são suficientes.
- [ ] Backup: exportar, importar em base descartável/Preview e conferir integridade.
- [ ] Cancelar/fechar formulários: não persistir alterações não confirmadas.

## 5. Testes de navegação e interface

- [ ] Entrar, sair e recarregar a aplicação.
- [ ] Menu recolhido e expandido; conferir que todas as opções aparecem.
- [ ] Busca, notificações, perfil e controles de contraste/tema.
- [ ] Home e banner conforme a referência aprovada.
- [ ] Todos os 16 destinos de navegação detectados pelos testes estáticos.
- [ ] Cada botão Fechar, Cancelar, Registrar, Salvar e voltar.
- [ ] Nenhum overlay inesperado bloqueia a tela após cliques.
- [ ] Contraste, foco por teclado, mensagens de erro e estados vazios.
- [ ] Desktop, tablet e celular; verificar overflow e elementos sobrepostos.
- [ ] Comparação visual com `MISEO_MVP_com_manual_integrado.html` quando o arquivo for versionado.

## 6. Integração Tiny

- [ ] Sem token: indicar integração não configurada sem falha catastrófica.
- [ ] Token inválido: indicar falha de conexão sem expor token.
- [ ] Token válido de teste: endpoint de leitura retorna sucesso.
- [ ] Timeout e erro da API tratados com mensagem segura.
- [ ] Confirmar explicitamente quais operações são somente leitura.
- [ ] Não declarar sincronização bidirecional, webhooks ou gravação sem teste específico.

## 7. Testes automatizados

Arquivos conhecidos:
- `tests/security-contract.test.js`
- `tests/ui-contract.test.js`
- `tests/stock-lots.test.js`
- `tests/records-cancel.test.js`
- `tests/backup-api.test.js`
- `tests/e2e-preview.test.js`

Execute os scripts definidos no `package.json` e consulte os logs de GitHub Actions. Não presuma nomes de scripts sem verificar o arquivo. Registre SHA do commit, data, workflow, resultado e falhas.

## 8. Evidência por caso

Para cada teste registrar: ID, pré-condição, passos, resultado esperado, resultado observado, status (aprovado/reprovado/bloqueado), data, navegador/resolução e link/caminho da evidência. Para falha, incluir passos mínimos para reprodução e log sanitizado.

## 9. Critério de conclusão

Só declarar homologação concluída quando:
- todos os casos críticos forem executados;
- não houver falhas abertas de login, permissões, persistência ou isolamento;
- testes automatizados relevantes passarem;
- a integração Tiny tiver escopo documentado e validado;
- a comparação visual com a referência for concluída;
- os resultados e evidências estiverem anexados à documentação.
