# Configuração, segurança e integrações

## 1. Variáveis de ambiente

O arquivo `.env.example` documenta variáveis como:
- `DATABASE_URL`: conexão PostgreSQL do ambiente;
- `SESSION_SECRET`: segredo de sessão;
- `ADMIN_BOOTSTRAP_ENABLED`: habilita/desabilita bootstrap administrativo;
- `ADMIN_BOOTSTRAP_TOKEN`: token temporário para bootstrap.

Outras variáveis usadas pelo código/fluxos de teste incluem:
- `TINY_ACCESS_TOKEN`: token de acesso à API Tiny Olist ERP;
- `QA_PASSWORD`: segredo requerido pelo teste E2E autenticado.

Os nomes são documentados aqui para orientar a configuração; os valores devem ficar apenas no painel de ambiente/secret manager e nunca em commits, issues, screenshots ou logs públicos.

## 2. Bootstrap administrativo

O bootstrap requer `ADMIN_BOOTSTRAP_ENABLED=true`, `ADMIN_BOOTSTRAP_TOKEN` e `DATABASE_URL`. Após inicialização, desabilite o bootstrap e remova/rotacione o token. Não deixe endpoint de bootstrap habilitado permanentemente.

## 3. Sessão e senhas

O código usa scrypt para hash de senha e comparação segura. O token de sessão é aleatório e o hash é armazenado no banco. O cookie é definido como HttpOnly, Secure e SameSite=Lax com validade de 12 horas. Confirme as configurações reais no ambiente de deploy e teste logout, expiração e revogação.

## 4. Separação Preview/Produção

- Preview: Neon project `quiet-boat-47268379`, branch `br-lively-boat-b68somqh`, banco `moon_fish_preview_tests`.
- Produção: Neon project `dawn-recipe-12545392`, branch `br-damp-cherry-b6j9q65r`, banco `miseo_moon_sushi`.

Antes de qualquer teste destrutivo:
1. Inspecione a variável `DATABASE_URL` do ambiente alvo sem imprimir seu valor secreto.
2. Verifique projeto, branch e nome do banco.
3. Confirme que é Preview.
4. Faça backup dos dados de teste.
5. Não reutilize credenciais de produção.

## 5. Tiny Olist ERP

A integração de leitura usa token bearer e endpoint de produtos da API v3, com timeout de 12 segundos. Armazene `TINY_ACCESS_TOKEN` apenas como variável secreta. Não registre cabeçalhos de autorização. Use uma conta de teste e dados não críticos.

O estado “conectado” deve significar apenas que o teste de leitura implementado teve sucesso; não inferir sincronização completa ou operações de escrita.

## 6. Recomendações de segurança

- Nunca versionar `.env`, tokens, senhas, cookies, dumps de banco ou backups reais.
- Rotacionar segredos que tenham sido expostos.
- Validar autorização no servidor em todos os endpoints.
- Validar e limitar payloads e tipos de dados.
- Evitar logs com dados pessoais e segredos.
- Testar rate limiting e proteção contra tentativas repetidas de login.
- Confirmar política de CORS, headers e tratamento de erros.
- Aplicar menor privilégio aos usuários e tokens.
- Usar somente dados fictícios no Preview.
