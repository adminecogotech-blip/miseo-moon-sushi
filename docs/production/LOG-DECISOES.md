# MISEO — Log de decisões

## 2026-11-04 — DEC-001 — HTML homologado é a referência única de produto
**Decisão:** `MISEO_MVP_com_manual_integrado.html` determina nomes, menu, aparência, estados, regras e comportamento visível.  
**Motivo:** requisito explícito do projeto.  
**Consequência:** divergências no `index.html` atual são defeitos; não se muda o HTML aprovado para acomodar o preview.

## 2026-11-04 — DEC-002 — Separar experiência de infraestrutura
**Decisão:** substituir a camada local demonstrativa por APIs e persistência sem redesenhar a interface.  
**Motivo:** o HTML atual descreve login, integrações e dados demonstrativos, enquanto produção exige autenticação e persistência reais.  
**Consequência:** manter textos, formulários, ordem dos fluxos e feedbacks; adaptar apenas as chamadas e os mapeadores de dados.

## 2026-11-04 — DEC-003 — Não declarar integração ativa sem E2E
**Decisão:** estados “simulado”, “planejado” ou equivalentes da referência permanecem honestos até que integração externa esteja configurada e testada.  
**Motivo:** a referência declara que WhatsApp/ERP/PDV e canais externos não transmitem dados no modo offline.  
**Consequência:** não inventar sincronização, webhooks ou envio de mensagens.

## 2026-11-04 — DEC-004 — Segurança prevalece sobre demonstração insegura
**Decisão:** credenciais fixas no JavaScript e troca de perfil somente no navegador não são mecanismos válidos de produção; substituí-los por autenticação e autorização server-side preservando a apresentação.  
**Motivo:** segredos no cliente são recuperáveis e permissões de UI podem ser contornadas.  
**Consequência:** sessões seguras, validação no servidor, autorização por ação e logs redigidos.

## 2026-11-04 — DEC-005 — Nenhum teste destrutivo em produção
**Decisão:** migrações de ensaio, importação, restauração, carga e E2E com escrita rodam somente em desenvolvimento/homologação.  
**Motivo:** preservar dados reais e evitar impacto operacional.  
**Consequência:** ambiente Preview deve ter banco e contas de QA independentes.

## 2026-11-04 — DEC-006 — Status rastreável por evidência
**Decisão:** um defeito só é “corrigido” com commit e teste demonstrável; ausência de teste fica “em progresso” ou “bloqueado por dependência técnica” com explicação objetiva.  
**Motivo:** evitar alegações de paridade não comprovadas.  
**Consequência:** a matriz de paridade é atualizada em cada release.
