# Conexões do MISEO — arquitetura e limites

O painel **Administração → Conexões** é um catálogo configurável por necessidade. O catálogo contempla canais de entrega (iFood e 99Food), adquirentes/soluções de pagamento (Stone, Cielo, Rede, Getnet, PagBank, Mercado Pago, SafraPay, SumUp e InfinitePay) e WhatsApp Business Platform (Cloud API oficial da Meta).

## Segurança e funcionamento
- O banco guarda somente provedor, estado habilitado e metadados não secretos.
- Tokens, chaves, segredos e tokens de verificação devem ficar em secrets do ambiente do servidor (Preview/Produção separados), nunca no navegador, banco, commits ou chat.
- A opção **Ativar** registra a intenção de uso; não significa que a integração está conectada ou homologada.
- O status de credenciais só verifica a presença de variáveis de ambiente. A conexão real exige endpoint oficial, credenciais autorizadas, sandbox/homologação e teste ponta a ponta.
- Cada adquirente tem diferentes produtos, protocolos, terminais e credenciamentos. Stone/Cielo/Rede/Getnet/SafraPay podem exigir TEF, SDK ou equipamento homologado; não há API universal para qualquer maquininha. Confirmar o modelo/solução antes de implementar captura, estorno ou fechamento de comanda.
- WhatsApp usa WhatsApp Business Platform (Cloud API), número empresarial e configuração de webhook HTTPS. Templates, opt-in, política de mensagens e limites da Meta devem ser respeitados.
- Não há envio de mensagens, cobrança, captura, estorno ou fechamento financeiro implementado por esta configuração inicial.

## Variáveis de ambiente previstas
- iFood: `IFOOD_CLIENT_ID`, `IFOOD_CLIENT_SECRET`
- 99Food: `NINETY_NINE_FOOD_CLIENT_ID`, `NINETY_NINE_FOOD_CLIENT_SECRET`
- Stone: `STONE_CLIENT_ID`, `STONE_CLIENT_SECRET`
- Cielo: `CIELO_MERCHANT_ID`, `CIELO_MERCHANT_KEY`
- Rede: `REDE_PV`, `REDE_TOKEN`
- Getnet: `GETNET_CLIENT_ID`, `GETNET_CLIENT_SECRET`
- PagBank: `PAGBANK_ACCESS_TOKEN`
- Mercado Pago: `MERCADOPAGO_ACCESS_TOKEN`
- SafraPay: `SAFRAPAY_CLIENT_ID`, `SAFRAPAY_CLIENT_SECRET`
- SumUp: `SUMUP_ACCESS_TOKEN`
- InfinitePay: `INFINITEPAY_API_KEY`
- WhatsApp: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`

Os nomes acima são convenções de configuração do projeto, não garantia de compatibilidade de uma conta/equipamento. Validar documentação oficial e credenciais antes de ativar em operação.
