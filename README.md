# MISEO | Moon Fish

Plataforma de gestão inteligente para cozinhas da Moon Fish.

## Objetivo

Evoluir o MVP MISEO para um ambiente de produção com frontend, backend seguro e persistência PostgreSQL no Neon, com implantação na Vercel.

## Estado do projeto

- Repositório privado: `adminecogotech-blip/miseo-moon-sushi`.
- Projeto Vercel `miseo-moon-sushi` criado.
- Banco Neon e estrutura inicial de tabelas criados.
- A variável `DATABASE_URL` foi informada como cadastrada na Vercel; a conexão ainda precisa ser testada.
- O repositório atual ainda apresenta diferenças de interface e cobertura funcional em relação ao HTML de referência; a paridade precisa ser concluída e comprovada por testes.

## Segurança

Nunca commitar senhas, tokens, strings de conexão ou arquivos `.env`. Credenciais devem permanecer nas variáveis de ambiente da plataforma. A autenticação deve ser validada no servidor, não apenas no navegador.

## Próximas etapas

1. Usar `MISEO_MVP_com_manual_integrado.html` como referência visual e funcional.
2. Manter autenticação por usuário e senha, sem cadastro público, com contas criadas por administrador.
3. Conectar cada módulo ao PostgreSQL por APIs autorizadas no servidor.
4. Comparar interface e comportamento por tela, breakpoint, tema e estado.
5. Validar login, persistência, permissões e consistência de estoque em preview isolado antes de qualquer publicação.
