# MISEO | Moon Sushi

Plataforma de gestão inteligente para cozinhas da Moon Cozinha Oriental.

## Objetivo

Evoluir o MVP MISEO para um ambiente de produção com frontend, backend seguro e persistência PostgreSQL no Neon, com implantação na Vercel.

## Estado do projeto

- Repositório privado: `adminecogotech-blip/miseo-moon-sushi`.
- Projeto Vercel `miseo-moon-sushi` criado.
- Banco Neon e estrutura inicial de tabelas criados.
- A variável `DATABASE_URL` foi informada como cadastrada na Vercel; a conexão ainda precisa ser testada.
- O arquivo HTML atual do MVP ainda precisa ser incorporado ao repositório e adaptado para produção.

## Segurança

Nunca commitar senhas, tokens, strings de conexão ou arquivos `.env`. Credenciais devem permanecer nas variáveis de ambiente da plataforma. A autenticação deve ser validada no servidor, não apenas no navegador.

## Próximas etapas

1. Incorporar o MVP HTML existente preservando o layout aprovado.
2. Implementar autenticação e autorização server-side.
3. Conectar os módulos ao PostgreSQL.
4. Vincular o repositório à Vercel e configurar a implantação.
5. Validar login, persistência e permissões antes de liberar o ambiente.
