# Interface visual e identidade

## 1. Referência e princípio de preservação

A referência indicada como aprovada pelo responsável do projeto é `MISEO_MVP_com_manual_integrado.html`. O arquivo não foi localizado na branch examinada ao preparar esta documentação; portanto, esta descrição registra os sinais visuais encontrados no código atual, mas não certifica paridade pixel a pixel com a referência.

## 2. Identidade visual observada no código

- Nome/wordmark: `MISEO | Moon Fish`.
- Idioma: português brasileiro.
- Tipografia-base: pilha de sistema (system-ui/Segoe UI), tamanho-base de 14 px e line-height aproximado de 1,45.
- Cores encontradas: azul `#1769FF`, azul-petróleo `#12364A`, fundo claro `#F5F8FA`, texto `#20343D`.
- Componentes: cartões com bordas suaves, cantos arredondados e sombras discretas.
- Navegação: ícones/emoji e estado ativo de menu.
- Tema: regra `body.dark-theme`.
- Layout responsivo: breakpoints para desktop/tablet/mobile.

## 3. Preferências de layout registradas no projeto

A implementação deve preservar o layout de referência, em vez de redesenhar a experiência por conta própria. Os requisitos anteriormente explicitados incluem:
- barra superior na ordem: logo, menu recolhido, botão expandir, busca, notificações e perfil;
- menu recolhido com ícones e rótulos de apoio; expandido com todas as opções visíveis e organizadas;
- manter os controles de expandir/recolher e contraste na posição aprovada;
- fundo principal claro, com contraste legível;
- home com banner e organização visual conforme a referência;
- navegação completa sem empurrar o menu lateral para uma segunda tela;
- responsividade em diferentes larguras.

Esses requisitos são critérios de comparação, não uma afirmação de que a versão publicada já atende integralmente a todos.

## 4. Preferências de persistência da interface

O código utiliza `localStorage` com as chaves `miseo_theme` para o tema e `miseo_menu_collapsed` para o estado recolhido do menu. Verificar se essa persistência é desejada e se falha de armazenamento não impede a navegação.

## 5. Testes visuais recomendados

1. Capturar login, home, menu recolhido e expandido, dashboard e cada módulo.
2. Comparar com a referência aprovada usando a mesma resolução e escala.
3. Conferir alinhamento, espaçamento, contraste, tipografia, logos e banner.
4. Repetir em desktop, tablet e celular.
5. Testar com textos longos, mensagens de erro, listas vazias e dados preenchidos.
6. Confirmar que overlays/notificações não bloqueiam a interação após qualquer clique.

## 6. Logos e ativos

Não inserir logos recriados ou distorcidos como substitutos dos arquivos oficiais. Use os ativos oficiais já versionados ou obtenha os originais aprovados. Registrar origem/licença e dimensões dos arquivos incluídos.
