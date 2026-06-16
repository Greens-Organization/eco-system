# `apps/api/test`

Testes da API com o **Bun test runner**. Dois tiers.

## Rodar

```bash
cd apps/api

bun run test            # tier unit (rápido, SEM docker) — também roda no `turbo test`
bun run test:watch      # unit em watch
bun run test:coverage   # unit com LCOV
bun run test:e2e        # tier e2e (sobe pg efêmero, migra, roda, derruba)
```

## Estrutura

```
test/
  unit/                 # unidades + pipeline HTTP sem DB real (sem docker)
  e2e/
    run.ts              # orquestrador: compose up --wait → bun test test/e2e (E2E=1) → down
    setup.ts            # preload: env de teste; gated E2E=1 → migrate + truncate(afterEach) + disconnect
    helpers/
      containers.ts     # docker compose up/down
      reset.ts          # truncateAll() — TRUNCATE ... RESTART IDENTITY CASCADE
      app.ts            # buildTestApp() + request(app, path, { cookie, body })
      auth.ts           # authenticate(app) → cookie de sessão (better-auth real)
    factories/index.ts  # makeUser(...) (tabela better-auth)
    routes/             # *.e2e.test.ts por rota
  helpers/mock-db.ts    # mock.module('@pack/db') p/ unit que importam db direto
```

## Tiers

- **unit** (`bun test test/unit`): sem infra. Unidades puras, middleware, error
  handler, rotas via DI (`createReadyRoute({ ping })`) ou app Hono inline. Rápido.
- **e2e** (`bun run test:e2e`, `E2E=1`): app real (`buildApp()`) contra Postgres
  efêmero (`docker-compose.test.yml`, tmpfs). `setup.ts` migra uma vez e
  **trunca a cada teste** (isolamento). Guard: `DATABASE_URL` tem que conter `eco_test`.

## Convenções

- Arquivos: `*.test.ts` (unit) e `*.e2e.test.ts` (e2e). Bun descobre sozinho.
- e2e que precisa de usuário autenticado: `const { cookie } = await authenticate(app)`
  e passe em `request(app, '/v1/...', { cookie })`.
- Dado de teste único por `crypto.randomUUID().slice(0,8)` (sem colisão de email).
- Nunca aponte `DATABASE_URL` pra um banco real ao rodar e2e — o `setup.ts` força
  o `eco_test` e tem guard.
