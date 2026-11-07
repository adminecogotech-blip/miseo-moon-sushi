## Visão geral e início do Planejamento
A Visão geral do perfil mestre passou a consultar vendas concluídas, compras, posição de estoque, canais, entregas e alertas. O valor de perdas fica sem estimativa enquanto faltar classificação estruturada. Os demais perfis mantêm os indicadores de contagem.
O Planejamento desconta a reserva uma vez, considera o saldo pendente de pedidos enviados ou parcialmente recebidos com entrega no horizonte e projeta sete dias pela venda direta de quatorze dias para o perfil mestre. O contrato de sale_items vincula a venda ao produto. Faltam o vínculo explícito com a receita vendida, segurança, múltiplo de compra e filtros da referência.
Comparação local com dados sintéticos em 1440, 1024, 768 e 390 px, menu expandido/recolhido, temas claro/escuro. O teste no Preview valida também saldo de recebimento parcial e demanda da venda concluída. Evidência remota em GitHub Actions na revisão correspondente.

### Continuação do Planejamento
Consulta de metadados ao banco isolado moon_fish_preview_tests confirmou os vínculos existentes: sale_items.product_id, recipe_ingredients.recipe_id e recipe_ingredients.product_id. O catálogo não possui fornecedor preferencial, estoque de segurança ou múltiplo por produto. O histórico de compras identifica o fornecedor de cada pedido e não estabelece preferência de cadastro.

A tela agora mostra projeções para 1, 3, 7, 14 ou 30 dias, categoria, demanda, entradas, investimento e custo por item. O múltiplo padrão de uma unidade segue o HTML homologado. O horizonte vale para a consulta atual. Os perfis com acesso apenas ao estoque continuam usando saldo e mínimo. A consulta do Planejamento lê todo o catálogo ativo e calcula estoque, demanda e entradas no mesmo instante lógico.

Proposta para revisão antes de qualquer migração: associar explicitamente o item vendido à receita e registrar o consumo por ingrediente e o rendimento vigentes na conclusão da venda. Manter as vendas diretas e o histórico sem vínculo. Definir no cadastro do produto o fornecedor preferencial opcional, a segurança na unidade de estoque e o múltiplo de compra positivo. Usar os valores padrão 0 e 1 da referência nos cadastros antigos. Testar primeiro no Preview com venda direta, venda por receita, edição posterior da ficha e conversão de unidades.

Evidência prevista no teste autenticado: entrada pendente de duas unidades excluída em um dia e incluída em sete dias, horizonte inválido rejeitado, categoria preservada ao mudar para 14 dias, três unidades de demanda exibidas e capturas em desktop e celular.
