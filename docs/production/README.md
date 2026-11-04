# MISEO — Preparação para produção

Esta pasta reúne o plano de implantação, a matriz de paridade e os critérios de teste/go-live. O produto deve permanecer fiel ao HTML homologado.

## Documentos

- [Plano de implantação](PLANO-IMPLANTACAO.md) — arquitetura, ambientes, persistência, segurança, integrações, backup, observabilidade, CI/CD e critérios por módulo.
- [Matriz de paridade](MATRIZ-PARIDADE.md) — divergências confirmadas por leitura estática, severidade, correção definida e status.
- [Log de decisões](LOG-DECISOES.md) — decisões de engenharia e motivos.
- [Plano de testes e go-live](PLANO-DE-TESTES.md) — regressão por módulo, visual, segurança, recuperação e checklist de liberação.
- [HTML homologado](../reference/MISEO_MVP_com_manual_integrado.html) — arquivo de referência versionado para comparação.

## Estado inicial da auditoria — 04/11/2026

- Foram identificadas diferenças estruturais e de navegação entre a referência e o `index.html` atual.
- O módulo “Receitas e fichas técnicas” está presente na referência, mas não no menu principal atual do preview.
- O HTML de referência utiliza armazenamento e autenticação demonstrativos locais; produção exige adaptador de API, persistência real e autorização server-side.
- A paridade total não está comprovada. Nenhum documento declara a versão pronta para go-live.
- A branch `feat/production-parity-readiness` isola a documentação e o artefato de referência; o código de produção não foi promovido.

## Status dos itens

Use apenas:
- **Corrigido:** commit identificável + teste/evidência concluído.
- **Em progresso:** trabalho ou prova técnica ainda em execução.
- **Bloqueado por dependência técnica:** dependência específica descrita com próximo passo objetivo.

Nunca utilizar “pendente de validação do usuário” como estado de engenharia.
