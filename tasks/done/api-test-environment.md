# Ambiente de testes do `apps/api` (bun:test, real-DB)

Harness de testes dedicado pro `apps/api`, em `bun:test`, inspirado no
`study/fastify-boilerplate` (split unit/e2e, app factory) e no
`mac-dashboard/apps/api/test` (DB real efêmero, factories, truncate-per-test).

> Origem: pedido "crie um ambiente de testes só pra eles, robusto, bun-oriented".
> Decisão travada: **harness completo (real-DB, mac-style)**.

## Dois tiers

- **unit** (`bun test test/unit`, default, **sem docker**): unidades + pipeline
  HTTP mockado/sem-DB. Rápido. Roda no `turbo test`.
- **e2e** (`bun run test:e2e`, gated `E2E=1`, **docker**): app real (`buildApp()`)
  contra Postgres efêmero (migrate programático + truncate-per-test). Orquestrado
  por `run.ts` (compose up → `bun test test/e2e` → down).

## Layout

```
apps/api/
  test/
    README.md
    unit/                         # os 3 testes atuais migram pra cá
      graceful-shutdown.test.ts
      health.test.ts
      observability.test.ts
    e2e/
      run.ts                      # compose up --wait → bun test test/e2e (E2E=1) → down
      setup.ts                    # preload: env de teste; gated E2E=1: migrate + truncate + disconnect
      smoke.e2e.test.ts
      helpers/
        containers.ts             # docker compose up/down (spawnSync)
        reset.ts                  # truncateAll() (TRUNCATE ... RESTART IDENTITY CASCADE)
        app.ts                    # buildTestApp() + request() helper
        auth.ts                   # better-auth sign-up/sign-in → cookie de sessão
      factories/index.ts          # makeUser (tabela better-auth)
      routes/
        status.e2e.test.ts        # 200 ok
        ready.e2e.test.ts         # 200 ready (ping no DB real migrado)
        stats.e2e.test.ts         # 401 sem cookie / 200 com sessão
        auth.e2e.test.ts          # sign-up → sign-in → set-cookie
    helpers/mock-db.ts            # mock.module('@pack/db') p/ unit futuros
  src/main/app.ts                 # refactor: export buildApp() factory (+ default p/ server.ts)
infra/docker/docker-compose.test.yml  # postgres efêmero (tmpfs+healthcheck), :5436, db eco_test
```

## Decisões / adaptações ao eco-system

- **DB**: postgres.js + Drizzle. Migrate programático (`drizzle-orm/postgres-js/migrator`,
  pasta `packages/db/migrations`). Truncate via `pg_tables` (schema public, exceto `drizzle%`).
- **Env de teste**: `setup.ts` seta antes de qualquer import — `DATABASE_URL` (eco_test,
  override do `.env`), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ORIGIN_ALLOWED`,
  `SMTP_FROM` (obrigatórios), SENTRY/OTEL vazios. Guard: `DATABASE_URL` tem que conter `eco_test`.
- **App factory**: `app.ts` vira `buildApp()` + `export default buildApp()`. `server.ts`
  inalterado (default import). Permite e2e HTTP contra o app real, instância fresca por teste.
- **Auth**: helper usa as rotas reais `/auth/sign-up/email` + `/auth/sign-in/email`
  (better-auth, argon2, min 8) e captura `better-auth.session_token` via `getSetCookie()`.
- **Sem Redis** (a API não usa em teste). Sem testcontainers libs — `docker compose` direto.

## Verify

- `bun run test` (turbo) verde — unit tier (os 3 migrados) sem docker.
- `bun run test:e2e` — sobe pg, migra, roda e2e (status/ready/stats/auth/smoke), derruba.
  Aceite: ≥1 e2e real-DB verde (ready 200 contra DB migrado; stats 401→200 com sessão).
- typecheck api exit 0.

## NOT in scope
- Cobertura exaustiva de rotas (a API só tem `/v1/stats` stub) — o foco é o **harness**.
- Redis/testcontainers libs; CI workflow (card separado).
