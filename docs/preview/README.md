# Documentação do ambiente Preview — MISEO

**Data de referência:** 04/11/2026  
**Repositório:** [miseo-moon-sushi](https://github.com/adminecogotech-blip/miseo-moon-sushi)  
**Branch documentada:** `feat/moon-fish-parity-auth`

Esta pasta reúne a documentação técnica, funcional, visual e de homologação do ambiente Preview do MISEO. Ela descreve o comportamento previsto a partir do código e das informações de ambiente verificadas; não deve ser interpretada como certificação de que todos os fluxos foram aprovados em execução.

## Documentos

- [Visão geral técnica e arquitetura](./ARQUITETURA.md)
- [Manual funcional dos módulos e APIs](./FUNCIONALIDADES.md)
- [Interface visual e identidade](./INTERFACE-E-IDENTIDADE.md)
- [Configuração, segurança e integrações](./CONFIGURACAO-E-SEGURANCA.md)
- [Plano de testes e homologação](./TESTES-E-HOMOLOGACAO.md)
- [Limitações conhecidas e critérios de aceite](./LIMITACOES-E-ACEITE.md)

## Ambiente Preview

- Aplicação: https://miseo-moon-sushi-ejy6afnyk-evoluateam.vercel.app
- Código principal: [index.html](../../blob/feat/moon-fish-parity-auth/index.html)
- Branch: [feat/moon-fish-parity-auth](https://github.com/adminecogotech-blip/miseo-moon-sushi/tree/feat/moon-fish-parity-auth)
- Pipeline de CI: consulte a aba Actions do repositório.

**Isolamento de dados:** os testes devem usar exclusivamente o banco Preview. Não execute importação, restauração, limpeza de dados ou testes de escrita no banco de produção.

## Estado de validação

Os testes de contrato de interface/segurança e alguns testes automatizados fazem parte do repositório. A execução integral de E2E autenticado depende da configuração do segredo `QA_PASSWORD` no GitHub Actions. Portanto, não se declara aqui que todas as telas, permissões, integrações ou operações ponta a ponta foram aprovadas.

## Como contribuir

Ao alterar código ou configuração:
1. Atualize os documentos afetados na mesma branch.
2. Não inclua tokens, senhas, cookies, strings de conexão ou dados pessoais.
3. Registre claramente o que foi testado, em qual ambiente, com resultado e evidência.
4. Execute os testes automatizados disponíveis e documente qualquer bloqueio.
5. Compare a interface com o arquivo de referência aprovado antes de declarar paridade visual.

## Referência visual aprovada

O arquivo `MISEO_MVP_com_manual_integrado.html` foi indicado como referência aprovada pelo responsável do projeto, mas não foi localizado na branch durante a preparação desta documentação. Para manter a rastreabilidade, inclua-o em `docs/referencia/MISEO_MVP_com_manual_integrado.html` quando estiver disponível e registre sua versão/hash. Até lá, não se afirma paridade visual completa com essa referência.
