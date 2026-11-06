# Bloco de execução — ficha técnica da venda e parâmetros do Planejamento

## Etapas e ponto de autorização

| Etapa | Critério de saída |
|---|---|
| 1. Confirmar a base | Branch feat/production-parity-readiness, revisão c7670e7, banco moon_fish_preview_tests e marcador preview. |
| 2. Auditar as dependências | Conferir tipos das chaves, nomes livres e unidades. Ler os fluxos de reserva, conclusão da venda e cálculo de demanda. |
| 3. Preparar a alteração | Revisar o SQL abaixo e os critérios funcionais. Publicar apenas este documento na branch de Preview e validar o deploy e o CI. |
| 4. Aplicar o SQL | Requer autorização explícita para executar este bloco SQL no Neon Preview br-lively-boat-b68somqh, projeto quiet-boat-47268379. Antes de executar, reconfirmar branch Neon, banco, marcador de ambiente e disponibilidade de recuperação. |
| 5. Integrar e homologar | Somente após a etapa 4, ligar venda, parâmetros de produto, planejamento, preservação do histórico e exportação de backup. Reexecutar os cenários abaixo com dados de QA. |

As consultas de leitura da etapa 2 confirmaram as chaves bigint esperadas, os três nomes de tabela livres e unidades compatíveis nas linhas atuais da ficha técnica. O pedido de venda já reserva e baixa o produto vendido por lote. A proposta mantém esse movimento físico. A composição da receita é usada para projetar demanda de insumos. Uma baixa adicional dos ingredientes na venda duplicaria o consumo em operações que já registram a produção.

## SQL proposto para a etapa 4

Este bloco cria três tabelas vazias em uma única transação. O aplicativo publicado na etapa 3 continua usando o esquema atual. Um nome já ocupado ou bloqueio prolongado interrompe a transação para revisão.

```sql
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';

DO $guard$
BEGIN
  IF current_database() <> 'moon_fish_preview_tests' OR
     (SELECT setting_value->>'environment' FROM public.app_settings
      WHERE setting_key = 'tenant') IS DISTINCT FROM 'preview' THEN
    RAISE EXCEPTION 'Destino fora do Preview autorizado';
  END IF;
END;
$guard$;

CREATE TABLE public.product_planning_policy (
  product_id bigint PRIMARY KEY REFERENCES public.products(id),
  preferred_supplier_id bigint REFERENCES public.suppliers(id),
  safety_stock numeric(14,3) NOT NULL DEFAULT 0 CHECK (safety_stock >= 0 AND safety_stock < 'NaN'::numeric),
  purchase_multiple numeric(14,3) NOT NULL DEFAULT 1 CHECK (purchase_multiple > 0 AND purchase_multiple < 'NaN'::numeric)
);

CREATE TABLE public.sale_item_recipe (
  sale_item_id bigint PRIMARY KEY REFERENCES public.sale_items(id),
  recipe_id bigint NOT NULL REFERENCES public.recipes(id),
  yield_quantity numeric(12,3),
  yield_unit text,
  captured_at timestamptz,
  CHECK ((captured_at IS NULL AND yield_quantity IS NULL AND yield_unit IS NULL)
      OR (captured_at IS NOT NULL AND yield_quantity IS NOT NULL AND yield_quantity > 0
          AND yield_quantity < 'NaN'::numeric AND yield_unit IS NOT NULL AND length(trim(yield_unit)) > 0))
);

CREATE TABLE public.sale_item_recipe_consumption (
  sale_item_id bigint NOT NULL REFERENCES public.sale_item_recipe(sale_item_id),
  product_id bigint NOT NULL REFERENCES public.products(id),
  quantity numeric NOT NULL CHECK (quantity > 0 AND quantity < 'Infinity'::numeric),
  stock_unit text NOT NULL CHECK (length(trim(stock_unit)) > 0),
  PRIMARY KEY (sale_item_id, product_id)
);

COMMIT;
```

## Regras e ensaios da etapa 5

- **Venda direta e histórico** — Ausência de vínculo mantém a quantidade do produto vendido. A criação do esquema dispensa preenchimento retroativo.
- **Venda por receita** — Selecionar a ficha explicitamente e registrar o vínculo na criação da linha. A quantidade vendida é expressa na unidade de rendimento da ficha. Na conclusão, conferir que essa unidade corresponde à unidade da linha. Capturar rendimento, unidade e quantidades totais dos ingredientes na mesma transação da conclusão. Uma ficha com rendimento de 4 porções e 0,6 kg de ingrediente deve projetar 0,3 kg para 2 porções. Consolidar ingredientes repetidos antes de gravar.
- **Unidades e concorrência** — Bloquear o registro da venda e coordenar a leitura da ficha com o bloqueio utilizado pela edição. Validar conversões explícitas entre unidades compatíveis. Rejeitar conversão desconhecida, ficha vazia ou inativa e reverter a conclusão inteira. Uma repetição da conclusão deve preservar a baixa e a composição já gravadas.
- **Projeção histórica** — Agregar consumo capturado para linhas com vínculo e venda concluída; somar quantidade direta apenas para linhas sem vínculo. Editar uma ficha após a venda e confirmar que o histórico permanece idêntico. Uma venda aberta deve ficar fora da projeção.
- **Parâmetros de compra** — Associar fornecedor por ID. Usar segurança 0 e múltiplo 1 quando o produto não tem política cadastrada. Calcular alvo como o maior valor entre mínimo e demanda mais segurança; subtrair saldo disponível e entradas confirmadas; arredondar a necessidade positiva ao próximo múltiplo. Para demanda 8, segurança 2, saldo 3, entrada 1 e múltiplo 4, sugerir 8. Conferir filtros e autorizações de leitura e edição.
- **Preservação dos dados** — Incluir as novas tabelas nos formatos de exportação/importação em ordem de dependência e manter compatibilidade com backups antigos. Validar importação com simulação local; restauração real exige autorização própria.
- **Falha ou interrupção** — Se o SQL falhar antes do commit, encerrar a transação e registrar a causa. Se a integração falhar após o commit, manter a aplicação anterior compatível e preservar as tabelas e os dados para diagnóstico. Qualquer remoção requer autorização separada.

## Registro da execução no Preview

A etapa 4 recebeu autorização explícita nesta execução. Antes da aplicação foram reconfirmados banco, marcador de ambiente, nomes livres e janela de recuperação de seis horas. O SQL foi aplicado em uma transação à branch Neon indicada; a consulta posterior confirmou zero linhas nas três tabelas. O CI da revisão documental 27ee11d passou no run 42294765190.

A integração passa a capturar a composição na conclusão da venda, com consolidação por ingrediente e conversão de massa e volume. O perfil mestre pode editar os parâmetros no Planejamento. O backup v3 inclui linhas de venda, vínculos, consumos e políticas, com suporte às versões de entrada 1 e 2. O teste de importação usa um cliente simulado. Não houve restauração de dados no Preview.

### Validação da ficha e continuação dos pedidos
O commit ecb57fc9cc25668821eb06ff37583643b9e38d2f passou no [run autenticado 42295521555](https://github.com/adminecogotech-blip/miseo-moon-sushi/actions/runs/42295521555), com três testes aprovados e zero ignorados no job de Preview. Uma leitura posterior ao Neon confirmou um vínculo com rendimento capturado e consumo de 0,3 kg. Deployment dpl_JB64GboiEHWdAiTpxhq1MaLmxuv3. Artefato 13540704982.

O fluxo seguinte permite selecionar insumos, ajustar quantidades e conferir o investimento antes de criar os rascunhos por fornecedor. Preço e fornecedor vêm do catálogo no servidor. Sem preferência ativa, usa o primeiro fornecedor ativo por ordem de cadastro, identificado na tabela, ou deixa o rascunho sem fornecedor quando não há cadastro ativo. Rascunhos e evento de auditoria são gravados juntos. O mesmo identificador de tentativa retorna os mesmos pedidos quando a seleção é repetida.

## Ensaio autorizado de restauração real

O E2E da branch faz uma nova conferência do ambiente e da revisão antes do ensaio. O backup v3 fornece três registros criados pelo próprio teste: política de um produto, vínculo da linha de venda com a receita e consumo de um ingrediente. O teste altera o múltiplo desse produto de 4 para 9. Uma primeira importação com referência inválida deve retornar 409 e preservar o estado anterior à tentativa. A seguir, a importação dos três registros originais deve restaurar o múltiplo para 4 e reproduzir o conteúdo exportado. A repetição da importação deve preservar o mesmo resultado. O artefato restore-result.json guarda apenas revisão, contagem, resultado e hash. O restante do banco fica fora do arquivo de entrada. O ensaio cobre recuperação operacional seletiva por merge; recuperação integral de infraestrutura tem escopo distinto.
