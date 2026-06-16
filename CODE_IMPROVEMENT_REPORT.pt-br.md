# Relatório de Melhoria de Código — Boilerplate `eco-system` v2

> Tradução pt-br de [`CODE_IMPROVEMENT_REPORT.md`](./CODE_IMPROVEMENT_REPORT.md).

**Escopo:** adequação a nível de linguagem aos padrões modernos — ECMAScript (ES2023+), TypeScript (strict, 6.x) e capacidades nativas do Bun 1.3.x.
**Branch:** `alpha/eco-system-v2` · **Runtime:** Bun 1.3.14 fixado · **Lint:** Biome 2.4.14 · **Build:** Turbo 2.9.11 · **TS:** 6.0.3
**Método:** achados consolidados de 6 agentes de investigação, verificados pontualmente contra o código-fonte. Cada file:line abaixo foi lido ou inspecionado via grep durante esta passagem.

---

## 1. Resumo Executivo

**Nota geral: B− (estrutura sólida, target moderno, mas convenções ainda não aplicadas de forma uniforme).**

A base de código mira em um baseline genuinamente moderno — `Bun.password` nativo, `Bun.randomUUIDv7()`, `AbortSignal.timeout`, Svelte 5 runes em todo lugar, um tsconfig strict com `noUncheckedIndexedAccess` + `verbatimModuleSyntax` + `moduleResolution: bundler`. O app da API é bem estratificado em camadas e livre de `any`/`@ts-ignore`. Isso está acima da média para um boilerplate.

A lacuna é **consistência**, não capacidade. Os dois pacotes mais importados (`@pack/tools`, `@pack/design-system`) não têm exports maps, enquanto dois pacotes menores (`@pack/i18n`, `@pack/seo`) têm — então o "padrão de referência" é a exceção, não a regra. Vários valores de configuração validados são computados e depois descartados (`BETTER_AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`). O gerenciamento de recursos moderno do ES (`using` / `Symbol.asyncDispose`) está ausente justamente onde compensaria (pool do DB, OTel, containers de e2e).

### Melhorias de maior alavancagem (faça estas primeiro)

1. **Adicione exports maps a `@pack/tools` e `@pack/design-system`** (e aos 5 pacotes finos). Atualmente resolvem apenas via fallback de filesystem do Bun — frágil, não portável, quebra qualquer consumidor não-Bun ou um futuro build com `tsup`. *(verificado: nenhum dos dois tem `exports`)*
2. **Conecte `BETTER_AUTH_SECRET` em `betterAuth({ secret: ... })`** — `packages/auth/server.ts` o valida no pack-env mas nunca o passa adiante; funciona apenas pelo fallback silencioso de `process.env` do better-auth. *(verificado: nenhuma chave `secret:` no objeto de config)*
3. **Corrija a brecha de segurança do `DATABASE_URL` no e2e** — `apps/api/test/e2e/setup.ts:8` atribui com `=` puro, então o guard de `eco_test` na linha 45 nunca consegue enxergar um override externo. Use `||=` como toda outra variável duas linhas abaixo. *(verificado)*
4. **Corrija o barrel de email quebrado** — `packages/email/index.ts` faz `export * from 'send'` (specifier sem `./`) e `export * from 'templates/contact'` (arquivo não existe). O pacote lança erro ao ser importado. *(verificado)*
5. **Corrija o `memoryCost: 8129` do argon2** em `packages/tools/src/crypto/argon2-adapter.ts:9` — não é potência de dois, ~8 MiB, bem abaixo do baseline de 19 MiB (`19456`) do argon2id da OWASP. Quase certamente um typo de `8192`; deveria ser elevado para `19456`. *(verificado: o valor é literalmente `8129`)*
6. **Delete código morto:** `packages/observability/errors/parse-error.ts` (zero chamadores; arrasta o grafo do pino/OTel para dentro do subpath `errors` e loga em nível error a cada "parse"). *(verificado: ainda importa `../logger` e chama `log.error`)*
7. **Adote `using` / `await using`** para o pool do DB, o shutdown do OTel e os containers de e2e — transforma teardown artesanal de try/finally em ciclos de vida garantidos pela linguagem.
8. **Adicione `noUncheckedIndexedAccess: true` ao `packages/tsconfig/svelte.json`** (ou remova o override) — atualmente o define como `false`, enfraquecendo silenciosamente `@pack/i18n`, `@pack/seo`, `@pack/design-system` e o dashboard. *(verificado)*

---

## 2. Adequação de Linguagem — ECMAScript (ES2023+)

### 2a. `using` / `await using` + `Symbol.dispose` / `Symbol.asyncDispose` — o maior ganho de ES

O repositório gerencia manualmente vários ciclos de vida de recursos assíncronos com try/finally ou teardown imperativo. Estes são candidatos clássicos a `await using` (TS 5.2+, o Bun suporta o protocolo de disposal nativamente).

- **`apps/api/src/main/infra/graceful-shutdown.ts`** — `shutdown()` (linhas 29–68) faz imperativamente `server.stop()` → `await disconnectDatabase()` → `await shutdownObservability()`, cada um envolto em logging, com um `clearTimeout` manual. Isso é uma pilha de disposal. Defina `[Symbol.asyncDispose]` nos handles do DB e da observability e deixe um teardown ordenado executá-los. No mínimo, o sleep interno do grace-period (linhas 45–47) — um `new Promise(resolve => setTimeout(resolve, gracePeriod))` artesanal — deveria ser `await Bun.sleep(options.gracePeriod)`. *(verificado: o sleep `new Promise`/`setTimeout` está presente em 45–47)*

- **`packages/db/index.ts`** — `disconnectDatabase()` (30–38) é efetivamente um disposer para o pool do `postgres`. Adicione:
  ```ts
  export const db = Object.assign(drizzle({ client, schema, ... }), {
    async [Symbol.asyncDispose]() { await client.end(); },
  });
  ```
  para que consumidores possam `await using database = db`. A função existente pode delegar a ele. *(verificado: `await db.$client.end()` dentro de um try/catch)*

- **e2e `containers.ts` / `run.ts`** (testcontainers) — start/stop de container é o exemplo canônico de `await using`. Cada container é um disposable; o harness não deveria precisar de `.stop()` manual no finally.

- **transporter SMTP do `@pack/email`, cliente Redis do `@pack/rate-limit`, Redis do `@pack/cache`** — singletons criados no carregamento do módulo (ver §5). Se virarem factory-created, dê a eles `Symbol.asyncDispose` para que clientes com escopo de request ou de teste se fechem sozinhos.

### 2b. Atribuição lógica (`||=` / `??=`) e `??` vs `||`

- **`apps/api/test/e2e/setup.ts:8`** — `process.env.DATABASE_URL = '...eco_test'` usa `=` puro. As linhas logo abaixo (`BETTER_AUTH_SECRET ||=`, `BETTER_AUTH_URL ||=`, `ORIGIN_ALLOWED ||=`) já usam `||=`. A inconsistência é o bug: o guard de `eco_test` na linha 45 é decorativo porque a URL é sobrescrita incondicionalmente. **Correção: `||=`.** *(verificado — inconsistência exata reproduzida)*

- **`apps/api/src/main/app.ts:28`** — `env.ORIGIN_ALLOWED || ['http://localhost:3000']` mistura um LHS `string` com um fallback `string[]`. Isso é um bug de tipo/formato, não só um detalhe de `||` vs `??` — restrinja `ORIGIN_ALLOWED` a um array (split/transform no pack-env) para que o tipo do fallback bata. *(verificado)*

### 2c. Consistência de `cause` em erros

- **`packages/db/index.ts:36`** — `throw new Error('Failed to disconnect database', { cause: error })` usa `cause` corretamente (bom uso de ES2022) **mas** lança um `Error` cru enquanto todo outro pacote lança `AppError`/`BaseError`. É desvio de convenção, não defeito de ES — alinhe o *tipo*, mantenha o `cause`. *(verificado)*
- `cause` é usado bem onde aparece; a lacuna é uniformidade, não sintaxe.

### 2d. `Array.at`, `Object.hasOwn`, `Promise.withResolvers`, `structuredClone`

- **`packages/tools/src/string/m-string.ts:96`** — `names[names.length - 1]?.[0]` é exatamente o idiom que o `Array.prototype.at(-1)` foi desenhado para substituir: `names.at(-1)?.[0]`. Pequeno, mas é uma lib de utilitários e deveria modelar o idiom. *(verificado)*
- **`safe-fetch.ts` `json?.message ?? json?.error`** — está ok, mas `json` é `any` (ver §3); uma vez tipado, prefira `Object.hasOwn(json, 'message')` em vez de encadeamento por truthiness, se o formato for um record.
- `Promise.withResolvers()` limparia qualquer padrão de deferred artesanal `let resolve; new Promise(r => resolve = r)` — nenhum caso gritante encontrado, mas vale conhecer para a reescrita do grace-period do shutdown.

### 2e. Onde o código já é moderno (crédito onde é devido)

- `Bun.randomUUIDv7()` para IDs do DB — correto, monotônico, sem dependência de `uuid`. ✅
- Uso de `AbortSignal.timeout` nos caminhos de fetch — moderno, sem encanamento manual de `AbortController`. ✅
- `Bun.password` (argon2id) para hashing de auth — nativo, sem addon nativo `argon2`. ✅ (valor à parte, §1.5)
- Svelte 5 runes (`$state`/`$derived`/`$props`/`$derived.by`) de forma uniforme em todo o dashboard, com `$app/state` e não o depreciado `$app/stores`. ✅
- Resolução baseada em `import.meta` e ESM amigável a top-level `await` em todo lugar (`"module": "Preserve"`). ✅

---

## 3. Adequação de Linguagem — TypeScript (strict, 6.x)

A base do tsconfig é forte: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `noImplicitOverride`, `moduleResolution: bundler`, `target/module: ESNext/Preserve`. Os defeitos são *escapes locais* dessa rigidez.

### 3a. `satisfies` em vez de literais sem tipo / casts

- **`packages/observability/logger/index.ts:25`** — `loggerOptions` é um literal de objeto cru. Aplique `satisfies pino.LoggerOptions` para que chaves em excesso/com typo (os campos pretty vestigiais `requestId`/`path` em 58–61) falhem na compilação em vez de serem silenciosamente ignorados.
- **`packages/observability/sentry/index.ts:12–16`** — casts `as string | undefined` a partir de um `Record<string, unknown>`. Substitua por um parse de config tipado (`satisfies Sentry.BunOptions` após um passo de zod/narrowing), não asserções.

### 3b. Substitua `as` / `as unknown as` / `as string` por narrowing

- **`apps/dashboard/.../sign-in/+page.server.ts:23–24` e `sign-up/+page.server.ts:22–24`** — `data.get('email') as string`. `FormData.get` retorna `FormDataEntryValue | null`; o cast é unsound (um upload de arquivo ou campo ausente vira silenciosamente `string`). Faça o narrowing:
  ```ts
  const email = data.get('email');
  if (typeof email !== 'string') return fail(400, { error: 'invalid' });
  ```
  Ou passe o FormData por um schema zod (o dashboard já depende de zod). *(verificado: 5 casts desse tipo entre as duas actions)*
- **`apps/api/src/core/env.ts:27`** — `process.env.NODE_ENV === ('local' as string)`. O `as string` existe só para escapar do narrowing literal contra a união `'development' | 'production' | ...`. Adicione `'local'` ao enum de env no pack-env em vez de forçá-lo via cast no ponto de comparação. *(verificado)*
- **`apps/api/src/main/infra/error-handler.ts:67,83,114`** + **`openapi/utils.ts:54`** — `as ContentfulStatusCode` repetido. Centralize um helper tipado `toStatusCode(n: number): ContentfulStatusCode` (validando o intervalo uma vez) em vez de fazer cast em quatro sítios. *(verificado todos os quatro)*
- **`@pack/db` `reset.ts` `as unknown as`** — substitua por uma query Drizzle tipada para que o cast duplo desapareça.
- **`safe-fetch.ts` `body as T`** (caminho de sucesso) — a response é `await res.json()` (`any`) castada direto para `T`. Sem validação apesar de existir um `StatsSchema` em outro lugar. Ou valide com o schema zod na fronteira, ou assuma o `as T` honestamente com um comentário — mas o setup atual dá confiança *falsa* (schema declarado, nunca executado). *(verificado: `success<T>` faz `body as T`, sem parse)*

### 3c. Enfraquecimento de `noUncheckedIndexedAccess` via `svelte.json`

- **`packages/tsconfig/svelte.json:12`** define `noUncheckedIndexedAccess: false`, sobrescrevendo o `true` em `bun.json:19`. Isso enfraquece silenciosamente `@pack/i18n`, `@pack/seo`, `@pack/design-system` e o dashboard. O fallout concreto: **`packages/i18n/index.ts:16,44`** o acesso por índice com magic-string `dictionaries['en']()` compila *somente* por causa deste override; sob a base strict ele seria (corretamente) `T | undefined`. **Correção:** remova o override (preferível) e trate o `undefined`, ou restrinja a relaxação de forma muito mais estreita. *(verificado: svelte.json linha 12 = `false`)*

### 3d. `isolatedModules` e `verbatimModuleSyntax`

- **`packages/tsconfig/svelte.json:11`** define `isolatedModules: true`, mas **`bun.json` não o tem**. Com `verbatimModuleSyntax` ligado, `isolatedModules` deveria estar também na base para que as garantias de transpilação por arquivo valham uniformemente (o Bun transpila arquivo a arquivo). Adicione-o ao `bun.json`. *(verificado: presente em svelte.json, ausente em bun.json)*
- `verbatimModuleSyntax` é respeitado no restante (imports type-only estão marcados) — nenhuma violação observada no app da API.

### 3e. Eliminação de `any`, const type params, branded types

- **`packages/design-system/lib/utils.ts:8–9`** — `any` dentro de tipos condicionais (gerados pelo shadcn). Aceitável como código vendorizado *se* estiver isolado, mas o arquivo também mistura estilo escrito à mão (ver §5); separe o gerado do escrito.
- **`safe-fetch.ts`** — `const json = await res.json()` é `any`; tipe como `unknown` e faça narrowing.
- **Branded types** ajudariam onde vivem IDs stringly-typed e o guard de nome de DB `eco_test` (um brand `TestDatabaseUrl` torna o guard um *tipo*, não uma checagem de string em runtime). Opcional, alto polimento.
- **`const` type parameters** apertariam os helpers `safeFetch<T>` e de dicionário do i18n, preservando inferência literal — bom de ter.

---

## 4. Adequação Nativa ao Bun 1.3.x

Distinguindo **"faça isto"** de **"possível mas não vale a pena"** — e um **"não faça"** explícito.

### FAÇA

- **`@pack/cache` → `Bun.redis`** — **forte.** O pacote é um placeholder declarando `bullmq` + `ioredis` sem nenhuma implementação e com um `REDIS_URL` obrigatório no carregamento do módulo que ninguém lê. O Bun traz um cliente Redis nativo (`Bun.redis` / `import { redis } from "bun"`). Para um cache simples, descarte `ioredis` por completo e use `Bun.redis`. *(bullmq é uma preocupação à parte — ele precisa de ioredis; se filas forem realmente desejadas, mantenha o ioredis só para o bullmq e documente o porquê.)*
- **`@pack/storage` → `Bun.s3`** — **vale avaliar.** Hoje é um passthrough puro re-exportando `@vercel/blob` (`client.ts` é `export * from '@vercel/blob/client'`), e o `BLOB_READ_WRITE_TOKEN` declarado nunca é usado. Se o target de deploy não estiver travado em Vercel Blob, `Bun.s3` (compatível com S3, nativo, URLs presigned) remove uma dependência e o token morto. Se o Vercel Blob for requisito rígido, mantenha-o mas **delete a variável de env decorativa**. *(verificado: passthrough + token não usado)*
- **`Bun.sleep`** — `graceful-shutdown.ts:45–47` faz um sleep artesanal; substitua por `await Bun.sleep(ms)`. *(verificado)*
- **`Bun.password`** — já usado em `argon2-adapter.ts`. ✅ Apenas o valor de `memoryCost` precisa de correção (§1.5).
- **`Bun.file`** — use para qualquer leitura de config/template no `@pack/email` (carregamento de template) em vez de `fs`.

### NÃO FAÇA

- **`@pack/rate-limit` → NÃO use `Bun.redis`.** O pacote usa `@upstash/ratelimit` + `@upstash/redis`, que falam com o Upstash via **REST (HTTP)**, não o protocolo RESP/TCP que o `Bun.redis` fala. Trocar por `Bun.redis` quebraria o transporte REST do Upstash. Deixe em `@upstash/redis`. A correção real aqui é a **nível de tipo** (`url`/`token` são `string | undefined` vs o `string` obrigatório — falha em runtime adiada; aperte o pack-env para exigi-los ou falhe rápido). *(verificado: `new Redis({ url, token })` do `@upstash/redis`)*

### CUIDADO — `Bun.sql` vs Drizzle

- **Não arranque o Drizzle.** `@pack/db` corretamente possui schema, migrations (`drizzle-kit`), queries tipadas e `drizzle-seed`. `Bun.sql` não é um substituto para uma ORM + toolchain de migration.
- **Uso estreito e justificado de `Bun.sql`:** o ping de liveness cru `pingDatabase()` (`db.$client\`select 1\``, linha 45) e o truncate em `reset.ts` poderiam usar um caminho raw leve — mas como o cliente `postgres` já é compartilhado, **não há benefício** em introduzir um segundo driver SQL. **Veredito: mantenha postgres.js + Drizzle; não adicione `Bun.sql`.** A única alavanca de perf do DB que vale olhar é `prepare: false` (linha 16) — o próprio comentário inline diz para colocar `true` para servidores de longa duração, que é o caso da API. Faça benchmark virando o valor.

### Rotas do `Bun.serve` (apps/api)

- A API usa Hono sobre Bun. O `Bun.serve({ routes })` nativo do Bun é **opcional** e não vale a pena migrar um app Hono funcional — o Hono dá middleware, OpenAPI e validação que o router cru não tem. **Pule.**

---

## 5. Estrutural / Morfológico

### 5a. Fronteiras de módulo — exports maps não respeitados (maior dívida estrutural)

A convenção declarada é "todo pacote envia um exports map". Na realidade:

| Pacote | `exports`? | Importado como |
|---|---|---|
| `@pack/observability` | ✅ (limpo, 7 subpaths) | referência a copiar |
| `@pack/i18n` | ✅ | — |
| `@pack/seo` | ✅ | (mas órfão, §5c) |
| **`@pack/tools`** | ❌ (só `main`/`type`) | `@pack/tools` cru + deep |
| **`@pack/design-system`** | ❌ | deep-imported pesadamente pelo dashboard |
| **`@pack/db`** | ❌ (só `main`/`types`) | `@pack/db/pack-env`, `@pack/db/schema` |
| `@pack/rate-limit` / `cache` / `storage` | ❌ | cru + subpath |

*(Todos verificados.)* `@pack/observability/package.json:10–18` é o modelo a replicar:
```json
"exports": {
  ".": "./index.ts",
  "./errors": "./errors/index.ts",
  "./logger": "./logger/index.ts",
  "./pack-env": "./pack-env.ts"
}
```
Hoje `@pack/db/schema` e `@pack/db/pack-env` resolvem **apenas** via fallback de filesystem do Bun — eles quebrariam sob Node, um bundler com resolução estrita, ou qualquer futura ferramenta `tsup`/que respeite `exports`. Esta é a correção de convenção de maior alavancagem.

### 5b. Nomenclatura / idiom (morfológico)

- **`MString.capitalize()`** (`m-string.ts:46`) está mal nomeado — ele coloca em minúsculas e depois aplica title-case a cada palavra com uma skip list `NAME_EXCEPTIONS`. Isso é **`toTitleCase`** (ou `toNameCase`), não `capitalize` (que implica "deixar a primeira letra maiúscula"). Renomeie para casar com o comportamento. *(verificado)*
- **`MString.valueOf(): string`** (linha 109) retorna uma string — um footgun de coerção. `instance + ''` e comparações `==` viram string silenciosamente, e `valueOf` retornando o mesmo que `toString` convida a bugs em contextos de aritmética/concatenação. Remova `valueOf` (mantenha `toString` + o getter `value`) a menos que a coerção implícita seja um recurso deliberado e documentado. *(verificado ambos)*
- **Comentários misturados PT/EN** em `m-string.ts` (`// --- Funções customizadas ---` vs `// --- Wrappers es-toolkit ---`) e em outros lugares — escolha um idioma para os comentários de código.

### 5c. Código morto / órfão

- **`packages/observability/errors/parse-error.ts`** — zero chamadores; `import { log } from '../logger'` puxa todo o grafo de transporte do pino/OTel para dentro do subpath `errors`, e `log.error` dispara em *todo* parse (um "parse" que sempre loga em nível error é um footgun). **Delete.** *(verificado: ainda importa o logger, ainda chama `log.error`)*
- **`@pack/seo`** — totalmente órfão (zero importadores). `metadata.ts:28` tem uma index signature aberta `[key: string]: unknown` que existe *só* para fazer o cast `properties as SeoMetadata` compilar; `json-ld.ts:17` `export * from 'schema-dts'` re-exporta um namespace de terceiros enorme; a identidade do tenant (`eco-system` / `GRN Group`) está hardcoded. Ou conecte-o ao dashboard ou remova-o do build.
- **`@pack/payments`** — placeholder (package.json + tsconfig, sem source).
- **`@pack/cache`** — placeholder (`index.ts` não existe; só `pack-env.ts` + `package.json`), e ainda assim exige `REDIS_URL` no carregamento e declara `bullmq` + `ioredis`. *(verificado: não há `index.ts`)*
- **Dependências não usadas:** `resend` em `@pack/email`; `BLOB_READ_WRITE_TOKEN` decorativo em storage; `BETTER_AUTH_SECRET` validado-e-não-usado em auth.

### 5d. Correção de barrels

- **`packages/email/index.ts`** — `export * from 'send'` (specifier cru — deve ser `'./send'`) e `export * from 'templates/contact'` (**fantasma**, o arquivo não existe). O barrel lança erro ao ser importado. Corrija o caminho relativo e remova/crie o export de template ausente. *(verificado ambas as linhas)*
- **`@pack/i18n`** tem uma superfície de export `./utils` redundante — tudo já está no barrel raiz. Colapse.

### 5e. Inconsistência de estilo de código (Biome não normaliza diretórios gerados)

- **`@pack/design-system`** mistura tabs + aspas duplas + extensões `.js` (arquivos gerados pelo shadcn) contra 2-espaços + aspas simples (escrito à mão) — e `lib/utils.ts` mistura *ambos os estilos em um só arquivo*. O Biome não está configurado para formatar os diretórios gerados. **Correção:** ou adicione os diretórios gerados ao include do Biome e re-formate, ou isole-os via `overrides` e pare de editá-los à mão.

### 5f. Desvio de convenção

- **`stringbool({ truthy, falsy })`** de config duplicado verbatim em `observability/pack-env.ts` e `db/pack-env.ts` — eleve para um helper de env compartilhado em `@pack/tools`.
- **Lançamento de erro:** `@pack/db` lança `Error` cru; todos os outros lançam `AppError`/`BaseError`. Alinhe.
- **Scripts `test` ausentes:** `@pack/db` e `@pack/auth` não têm nenhum e não têm testes unitários (observability *tem* — `"test": "bun test --preload @pack/testing/preload"` é o padrão a copiar). O adapter de argon2 e a lógica de conexão/guard do DB são exatamente o que deveria ser testado.
- **`setup.timezone()`** (`apps/api/src/main/setup.ts:6`) é um no-op que loga `"Need to setup timezone"` — ou implemente (`process.env.TZ` já está plumbado via o `connection.TimeZone` comentado no db) ou remova o stub. *(verificado)*
- **`tsconfig.json` ausente** em `@pack/rate-limit` e `@pack/cache`.

---

## 6. Tabela de Ações Priorizada

Ordenada por alavancagem (impacto × confiança ÷ esforço). Severidade: Crítico / Alto / Médio / Baixo. Esforço: S (<30 min) / M (horas) / L (dia+).

| # | Área | File:Line | Sev | Esf | Correção |
|---|---|---|---|---|---|
| 1 | auth | `packages/auth/server.ts:7` | **Crítico** | S | Passe `secret: env.BETTER_AUTH_SECRET` para `betterAuth({...})`; pare de depender do fallback silencioso de `process.env`. |
| 2 | security | `packages/tools/src/crypto/argon2-adapter.ts:9` | **Crítico** | S | `memoryCost: 8129` → `19456` (baseline argon2id da OWASP); corrige o typo de não-potência-de-dois. |
| 3 | test safety | `apps/api/test/e2e/setup.ts:8` | **Crítico** | S | `process.env.DATABASE_URL ||= '...eco_test'` (era `=` puro) para que o guard de `eco_test` da linha 45 funcione. |
| 4 | email | `packages/email/index.ts:1-2` | **Alto** | S | `'send'`→`'./send'`; remova/crie o fantasma `'templates/contact'`. O barrel atualmente lança erro ao importar. |
| 5 | module boundaries | `packages/{tools,design-system,db}/package.json` | **Alto** | M | Adicione exports maps (copie `observability/package.json:10-18`). Para de depender do fallback de filesystem do Bun. |
| 6 | ts strictness | `packages/tsconfig/svelte.json:12` | **Alto** | S | Remova o override `noUncheckedIndexedAccess: false`; corrija os `undefined` resultantes em `i18n/index.ts:16,44`. |
| 7 | dead code | `packages/observability/errors/parse-error.ts` | **Alto** | S | Delete (0 chamadores; arrasta o grafo do logger para `errors`; loga em error a cada parse). |
| 8 | type soundness | `apps/dashboard/.../sign-in,sign-up/+page.server.ts:22-24` | **Alto** | S | Substitua os 5× `data.get(x) as string` por narrowing com `typeof` ou um parse de zod. |
| 9 | type soundness | `apps/dashboard/src/lib/api/safe-fetch.ts` | **Alto** | M | Tipe `await res.json()` como `unknown`; valide com o schema zod existente (ou descarte a confiança falsa do schema). |
| 10 | ES lifecycle | `apps/api/src/main/infra/graceful-shutdown.ts:45` | Médio | S | `await Bun.sleep(options.gracePeriod)` substituindo o sleep `new Promise`/`setTimeout`. |
| 11 | ES lifecycle | `packages/db/index.ts` + `graceful-shutdown.ts` | Médio | M | Adicione `[Symbol.asyncDispose]` ao db (e ao handle do OTel); adote `await using` no shutdown + containers de e2e. |
| 12 | cache | `packages/cache/*` | Médio | M | Implemente com `Bun.redis` (descarte `ioredis` a menos que bullmq seja real); remova o `REDIS_URL` obrigatório não usado. |
| 13 | rate-limit | `packages/rate-limit/pack-env.ts` + `index.ts` | Médio | S | Mantenha `@upstash/redis` (REST — NÃO troque por `Bun.redis`); torne `url`/`token` obrigatórios no pack-env. Adicione `tsconfig.json`. |
| 14 | ts | `apps/api/src/main/infra/error-handler.ts:67,83,114` + `openapi/utils.ts:54` | Médio | S | Um helper `toStatusCode(n)` em vez de 4× `as ContentfulStatusCode`. |
| 15 | ts | `apps/api/src/core/env.ts:27` | Médio | S | Adicione `'local'` ao enum de env; remova `('local' as string)`. |
| 16 | ts | `apps/api/src/main/app.ts:28` | Médio | S | Restrinja `ORIGIN_ALLOWED` a `string[]` no pack-env para que o fallback de array tenha o tipo correto. |
| 17 | ts | `packages/observability/logger/index.ts:25` | Médio | S | `... satisfies pino.LoggerOptions`; remova os campos pretty vestigiais `requestId`/`path` (58-61). |
| 18 | ts | `packages/observability/sentry/index.ts:12-16` | Médio | S | Substitua os casts `as string \| undefined` por uma config tipada/com narrowing. |
| 19 | naming | `packages/tools/src/string/m-string.ts:46,109,96` | Médio | S | Renomeie `capitalize`→`toTitleCase`; remova `valueOf` (footgun de coerção); `names.at(-1)`. |
| 20 | ts config | `packages/tsconfig/bun.json` | Médio | S | Adicione `isolatedModules: true` (já está em svelte.json; combina com `verbatimModuleSyntax`). |
| 21 | convention | `packages/db/index.ts:36` | Baixo | S | Lance `AppError`/`BaseError` (mantenha `{ cause }`) para casar com os outros pacotes. |
| 22 | tests | `packages/{db,auth}/package.json` | Baixo | M | Adicione script `"test"` (copie observability) + testes unitários para o adapter de argon2 e o guard do db. |
| 23 | storage | `packages/storage/*` | Baixo | M | Avalie `Bun.s3` vs `@vercel/blob`; de qualquer forma delete o `BLOB_READ_WRITE_TOKEN` não usado. |
| 24 | dead code | `packages/seo/*` | Baixo | M | Conecte ao dashboard ou remova do build; remova a index signature aberta que habilita o cast (`metadata.ts:28`). |
| 25 | dead code | `apps/api/src/main/setup.ts:6` | Baixo | S | Implemente `timezone()` (TZ já está plumbado) ou remova o stub no-op. |
| 26 | DRY | `observability/pack-env.ts` + `db/pack-env.ts` | Baixo | S | Eleve o `stringbool({truthy,falsy})` duplicado para um helper compartilhado em `@pack/tools`. |
| 27 | style | `packages/design-system/**` | Baixo | M | Configure o Biome para formatar/isolar os diretórios gerados (tabs/aspas-duplas/.js vs escrito 2-espaços/aspas-simples). |
| 28 | perf | `packages/db/index.ts:16` | Baixo | S | Faça benchmark de `prepare: true` para a API de longa duração (o próprio comentário recomenda). |

---

### Nota honesta de encerramento

Este é um **boilerplate saudável e moderno** cujos problemas são predominantemente de *consistência e follow-through*, não de arquitetura: config validada-e-descartada, uma convenção de exports map aplicada à metade errada dos pacotes, um punhado de escapes `as` unsound, e gerenciamento de recursos moderno do ES deixado de lado. Os itens 1–9 são em sua maioria de esforço S e removem as lacunas genuinamente perigosas (secret de auth, custo de senha fraco, a brecha do guard de DB no e2e, o barrel de email que lança erro em tempo de import). A adoção de `using`/`Symbol.asyncDispose` (10–11) é a modernização mais *interessante* mas não a mais urgente. Nada aqui exige rearquitetar; exige terminar.
