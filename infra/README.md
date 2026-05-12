# infra

Centraliza toda configuração de infraestrutura do monorepo. **Não é um workspace** — apenas um diretório top-level paralelo a `apps/` e `packages/`.

## Layout

```
infra/
└── docker/
    └── docker-compose.yml   # Postgres 18, Redis 7
```

## Serviços (`infra/docker/docker-compose.yml`)

| Serviço | Container | Porta host | Network |
|---|---|---|---|
| Postgres 18 | `sales-pg` | `${POSTGRES_PORT:-5432}` | `eco_system_network` |
| Redis 7 | `sales-redis` | `${REDIS_PORT:-6379}` | `eco_system_network` |

Defaults: `user` / `password` / `postgres`. Sobreponíveis via `.env` na raiz do monorepo.

## Comandos (executar na raiz)

```fish
bun run docker:infra:up        # sobe tudo em background
bun run docker:infra:ps        # status dos serviços
bun run docker:infra:restart   # restart graceful
bun run docker:infra:down      # para tudo
```

## Expansão futura

Quando precisar, adicionar:
- `infra/scripts/` — backup, restore, reset, dump, smoke-tests da infra
- `infra/k8s/` — manifests Kubernetes
- `infra/terraform/` — IaC para staging/prod
- `infra/docker/services/` — split do `docker-compose.yml` se ficar grande
