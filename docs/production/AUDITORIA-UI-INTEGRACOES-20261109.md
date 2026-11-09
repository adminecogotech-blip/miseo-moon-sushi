# Auditoria de interface e integrações — 09/11/2026

## Fonte conferida
O anexo MISEO_MVP_com_manual_integrado.html recebido do usuário e a referência do repositório têm conteúdo idêntico após normalizar quebras de linha. O SHA-256 do anexo é C71CD3FD18CDFBFBAB5C02475149E39113417FE12C9816BD6F85F91846870D92. A diferença visual vinha da implementação.

## Correção aplicada
| Achado | Tratamento | Verificação |
|---|---|---|
| CSS e cabeçalho alternativos em todo o sistema | CSS original extraído, cabeçalho original, grupos Operação/Gestão, tipografia e botões da referência | Comparação de 13 menus em desktop e celular |
| Formulários sempre abertos | Ações no cabeçalho abrem diálogos, preservando formulários e operações existentes | Abrir, fechar, editar, criar e navegar |
| Compras somente em tabela | Kanban e lista com filtros e estados reais do backend | Navegação, detalhes e operações da suíte |
| Receitas e vendas com apresentação genérica | Cards de custo/rendimento e indicadores de vendas | Dados reais na suíte autenticada |
| Banner sem imagem após trocar CSS | Imagem original reutilizada na Visão geral | Captura do banner |
| Manual integrado inacessível | PDF extraído do próprio HTML e disponibilizado no cabeçalho | Download servido como arquivo |
| Quebra no celular e tablet | Ajuste do cabeçalho e navegação inferior com todos os módulos no menu Mais | 390, 768, 1024 e 1440 px |
| Campos de integração genéricos | Campos por provedor, identificação de terminais e credenciais protegidas | Contratos, criptografia, acesso de administrador e formulário |
| Ausência do Telegram | Token do bot, chat e verificação de acesso | Testes com respostas simuladas de getMe e getChat |

## Integrações priorizadas pelo usuário
- Saipos — autorização da API de Dados e identificação da loja. Consulta de verificação com período de um minuto e limite de um pedido. [API de Dados](https://saipos-data-api.readme.io/reference/consultar-vendas)
- iFood — Client ID, Client secret e merchant ID. A verificação autentica a aplicação centralizada e consulta a loja. [Autenticação](https://developer.ifood.com.br/en-US/docs/food/guides/modules/authentication/centralized)
- 99Food — campos da aplicação e loja para preparar o credenciamento. O contrato completo e o acesso parceiro precisam ser confirmados para homologar o consumo de eventos. [Portal oficial](https://developer-food.99app.com/)
- Stone — StoneCode, serial e modelo. A integração SmartPOS exige aplicativo Android/interface homologada e ensaio no equipamento. [Pré-requisitos](https://sdkandroid.stone.com.br/reference/pre-requisitos)
- Cielo — configuração para terminal Smart/LIO com Client ID, Merchant ID e Access token do Order Manager. Confirmar modelo do terminal antes do ensaio de pagamento. [Manual oficial](https://developercielo.github.io/manual/cielo-lio)
- InfinitePay — InfiniteTag, serial e modelo. A confirmação da interface do terminal físico fica pendente. As modalidades públicas InfiniteTap e Checkout precisam ser distinguidas do aparelho contratado. [Modalidades oficiais](https://www.infinitepay.io/desenvolvedores)
- Telegram — token do bot e chat. Verificação de identidade do bot e acesso ao chat por consulta. [Bot API](https://core.telegram.org/bots/api)
- WhatsApp — token, número, conta Business, segredo do app e token do webhook. Consulta de confirmação do número na Meta. O fluxo de mensagens e os eventos de webhook ainda requerem implementação e homologação com a conta.

## Proteção das credenciais
Os campos secretos são de escrita e ficam vazios ao reabrir. O servidor armazena valores cifrados com AES-256-GCM, vinculados ao provedor e ao campo. A chave MISEO_CONNECTIONS_KEY foi provisionada como segredo Vercel exclusivamente no target Preview e na branch autorizada. O conteúdo cifrado fica em app_settings com prefixo connection_vault; o backup operacional exclui essa tabela. A API devolve nomes dos campos configurados. Logs e eventos de auditoria omitem valores. A promoção exige uma chave e credenciais próprias do ambiente de produção, além dos testes de cada contrato.

## Limites que continuam abertos
A equivalência funcional integral depende de contagem/aprovação de estoque, recorrências e todos os estados avançados de produção, transições de compras ausentes no backend e importação CSV de vendas. As capturas atestam as telas e larguras exercitadas. A verificação de credenciais confirma acesso às APIs implementadas. Sincronização contínua de pedidos, despacho de mensagens, confirmação de pagamentos e terminais físicos precisam de credenciamento e ensaios próprios. Nenhuma credencial de terceiro foi inventada, nenhuma mensagem foi enviada e nenhuma cobrança foi executada nesta revisão.

## Validação antes da publicação
Base remota reconciliada: 7dd2ba3ce2e3b6f8fe4f373d070f31f91958e0f0. Preservadas as correções de permissões, corrida de login e descarte de respostas de navegação antigas. Suíte local: 61 testes aprovados; 5 testes dependentes do Preview ficam para o job autenticado. Comparação offline: 13 menus em desktop/celular, quatro larguras da Visão geral e temas claro/escuro; sem erros JavaScript ou overflow na versão corrigida. As fixtures não comprovam persistência. Schema de app_settings e integration_connections confirmado por SELECT no banco isolado, sem migração. Os resultados remotos serão registrados após o deploy.
