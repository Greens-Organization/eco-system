# Auth Architecture Review

> Session started: 2026-04-16
> Status: **Em avaliação** — nenhuma mudança arquitetural foi implementada além das correções pontuais listadas na seção 5.

---

## 1. Arquitetura atual

### Visão geral

```
Browser
  │
  ├── GET/POST /auth/*  ──────────────────────────────────────────►  SvelteKit hooks.server.ts
  │                                                                      │  authHandle: proxy manual
  │                                                                      │  → fetch(API_URL + pathname)
  │                                                                      ▼
  │                                                               Hono API :3002
  │                                                                /auth/* → bAuth.handler()
  │
  ├── GET /{locale}/*  ───────────────────────────────────────────►  SvelteKit hooks.server.ts
  │                                                                      │  localeHandle
  │                                                                      │  sessionHandle  (¹)
  │                                                                      │  i18nHandle
  │                                                                      ▼
  │                                                               SvelteKit load functions
  │                                                                      │  createApiClient(cookie)
  │                                                                      ▼
  │                                                               Hono API :3002 /v1/*
  │                                                                authMiddleware (²)
  │
  └── Hono API (direct, sem SvelteKit)
       /auth/* → bAuth.handler()   ← endpoint paralelo acessível diretamente
```

**(¹)** `sessionHandle` usa `getSessionCookie(event.request)` — verifica apenas se o cookie **existe**, não valida contra o DB.

**(²)** `authMiddleware` usa `auth.api.getSession({ headers })` — valida de fato contra o DB.

### Pacotes envolvidos

| Pacote | Responsabilidade |
|---|---|
| `@pack/auth/server` | Instância `betterAuth` compartilhada (Hono + potencialmente SvelteKit) |
| `@pack/auth/client.svelte` | `createAuthClient` com stores reativos Svelte |
| `@pack/auth/cookies` | Re-exporta `getSessionCookie` do better-auth |
| `apps/api` | Hono API — monta `/auth/*` e `/v1/*` com `authMiddleware` |
| `apps/dashboard` | SvelteKit — proxy de `/auth/*`, sign-in/sign-up manual via `fetch()` |

---

## 2. Problemas identificados no fluxo atual

### 2.1 Validação superficial de sessão no hooks.server.ts

**Arquivo:** `apps/dashboard/src/hooks.server.ts:68`

```ts
// Atual — só verifica se o cookie existe
const sessionCookie = getSessionCookie(event.request);
event.locals.session = sessionCookie ?? null;

if (isProtectedPath(pathname) && !sessionCookie) {
  redirect(307, `/${locale}/sign-in`);
}
```

Cookie expirado, inválido ou de um DB diferente passa pelo guard. O `authMiddleware` no Hono rejeita a requisição com 401, mas o SvelteKit já renderizou o layout autenticado.

**Consequência direta:** loop de redirect (500 Internal Error):
1. Dashboard load → API retorna 401 → redirect para sign-in
2. Sign-in load → `locals.session` truthy (cookie existe) → redirect para dashboard
3. Dashboard → 401 → sign-in → dashboard → SvelteKit para o loop com 500

### 2.2 Parse manual de Set-Cookie no sign-in

**Arquivo:** `apps/dashboard/src/routes/[locale]/(unauthenticated)/sign-in/+page.server.ts:50-66`

```ts
const rawSetCookie = res.headers.getSetCookie();
for (const raw of rawSetCookie) {
  const parts = raw.split(';').map((p) => p.trim());
  // ...parse manual de name, value, max-age
  cookies.set(name, value, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: ...,
    // ← flag `secure` ausente — quebrará em HTTPS/produção
  });
}
```

Problemas:
- Flag `secure` não é propagada → cookie não será enviado em HTTPS
- Parse frágil (não lida com `domain`, cookies múltiplos de forma robusta)
- Duplicado entre sign-in e sign-out

### 2.3 Rota `/auth/*` acessível diretamente no Hono

O Hono expõe `POST /auth/sign-in/email`, `POST /auth/sign-up/email` etc. diretamente em `:3002/auth/*`. Em produção, se o Hono estiver na mesma rede pública, essa rota é um bypass completo de qualquer middleware do SvelteKit (rate limiting, CSRF, logging).

### 2.4 `baseURL` ausente na instância `betterAuth`

**Arquivo:** `packages/auth/server.ts`

O env var `BETTER_AUTH_URL` era carregado mas nunca passado para `betterAuth()`. Sem `baseURL`, o better-auth tenta inferir a URL base a partir do request — pode falhar quando a chamada vem do SvelteKit server-side com origin interno.

**Status:** ✅ Corrigido — `baseURL: env.BETTER_AUTH_URL` adicionado em 2026-04-16.

### 2.5 `nextCookies()` plugin inativo

**Arquivo:** `packages/auth/server.ts`

O plugin `nextCookies()` é específico para Next.js e não tem efeito no Hono. Registrado na instância mas nunca executa.

**Status:** Registrado como tech debt em CLAUDE.md — remover futuramente.

---

## 3. O que o better-auth oferece nativamente para SvelteKit

### Referências

- Documentação oficial: https://better-auth.com/docs/integrations/svelte-kit
- Exemplos oficiais: https://better-auth.com/docs/examples/svelte-kit
- Repositório: https://github.com/better-auth/better-auth

### Utilitários disponíveis em `better-auth/svelte-kit`

**Fonte inspecionada:** `packages/auth/node_modules/better-auth/dist/integrations/svelte-kit.mjs`

```ts
// 1. Handler automático — intercepta /auth/* e processa localmente
svelteKitHandler({ auth, event, resolve, building })

// 2. Plugin de cookies — elimina parse manual de Set-Cookie
sveltekitCookies(() => getRequestEvent())

// 3. Conversão simples do handler
toSvelteKitHandler(auth)
```

#### Como `svelteKitHandler` funciona internamente

```js
const svelteKitHandler = async ({ auth, event, resolve, building }) => {
  if (building) return resolve(event);
  if (isAuthPath(url.toString(), auth.options))
    return auth.handler(request);  // ← chama auth.handler DIRETAMENTE, não proxy
  return resolve(event);
};
```

**Importante:** `auth.handler(request)` processa o auth localmente no processo SvelteKit. Não é um proxy — é o handler real rodando no SvelteKit.

#### Como `sveltekitCookies` funciona internamente

```js
const sveltekitCookies = (getRequestEvent) => ({
  id: "sveltekit-cookies",
  hooks: { after: [{ matcher() { return true; },
    handler: createAuthMiddleware(async (ctx) => {
      const setCookies = ctx.context.responseHeaders?.get("set-cookie");
      if (!setCookies) return;
      const event = getRequestEvent();
      const parsed = parseSetCookieHeader(setCookies);
      for (const [name, { value, ...ops }] of parsed) {
        event.cookies.set(name, decodeURIComponent(value), {
          sameSite: ops.samesite,
          path: ops.path || "/",
          expires: ops.expires,
          secure: ops.secure,      // ← propaga secure corretamente
          httpOnly: ops.httponly,
          domain: ops.domain,
          maxAge: ops["max-age"]
        });
      }
    })
  }] }
});
```

O `getRequestEvent()` de `$app/server` (disponível desde SvelteKit 2.20, projeto usa 2.21.4) retorna o `RequestEvent` atual via `AsyncLocalStorage`.

#### Sessão no servidor — `auth.api.getSession()`

```ts
// Validação real contra o DB (não só checagem de existência)
const session = await auth.api.getSession({
  headers: event.request.headers,
});
// session é null se cookie inválido, expirado, ou não encontrado no DB
```

---

## 4. Opções arquiteturais avaliadas

### Opção A — Mover auth para SvelteKit (`svelteKitHandler`)

**Conceito:** SvelteKit passa a ser o servidor de auth. `svelteKitHandler` intercepta `/auth/*` e processa localmente. Hono mantém apenas `/v1/*` com `authMiddleware` que valida sessão direto no DB.

```
Browser /auth/*  →  SvelteKit (svelteKitHandler + sveltekitCookies)
Browser /v1/*    →  SvelteKit (proxy) → Hono (authMiddleware → DB)
```

**Vantagens:**
- Elimina proxy manual no hooks
- Elimina parse manual de Set-Cookie
- `sveltekitCookies` seta cookies corretamente (com `secure`)
- Sign-in/sign-up usam `auth.api.signInEmail()` — sem `fetch()` manual

**Problemas de segurança:**
1. Rota `/auth/*` no Hono continua acessível em paralelo → bypass completo do SvelteKit
2. `auth.api.signInEmail()` direto bypassa qualquer rate limiting futuro no Hono
3. SvelteKit passa a ter `DATABASE_URL` — acesso direto ao PostgreSQL se comprometido
4. Para funcionar, precisa de duas instâncias `betterAuth()` (ver abaixo) ou solução alternativa

### Opção B — Duas instâncias betterAuth

**Conceito:** `@pack/auth/server.ts` vira factory. Dashboard cria sua própria instância com `sveltekitCookies`.

```ts
// @pack/auth/server.ts
export function createAuth(extraPlugins = []) {
  return betterAuth({ ...config, plugins: [...extraPlugins] })
}
export const auth = createAuth()  // Hono usa esse

// apps/dashboard/src/lib/auth.server.ts
import { createAuth } from '@pack/auth/server'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { getRequestEvent } from '$app/server'
export const auth = createAuth([sveltekitCookies(() => getRequestEvent())])
```

**Por que surgiriam duas instâncias:**
- `sveltekitCookies` precisa de `getRequestEvent()` de `$app/server` (exclusivo do SvelteKit)
- `@pack/auth/server.ts` é importado pelo Hono também — não pode ter imports de `$app/server`
- Separação de plugins por contexto força objetos separados

**Problemas:**
- Mesmos riscos da Opção A
- `betterAuth()` instanciado duas vezes (mesmo config, mesmo DB, mesmo secret)
- Qualquer comprometimento do `BETTER_AUTH_SECRET` afeta ambos sem isolamento por contexto

### Opção C — `auth.use()` no hooks.server.ts (proposta descartada)

**Conceito:** Registrar `sveltekitCookies` na instância existente via `.use()` no hooks.

**Por que não funciona:** better-auth **não tem** método `.use()` para adicionar plugins após a criação. Plugins são registrados exclusivamente em `betterAuth({ plugins: [...] })`.

### Opção D — Correção cirúrgica: só `auth.api.getSession()` no hooks ✅ Recomendada

**Conceito:** Mudança mínima. Substituir `getSessionCookie()` por `auth.api.getSession()` no `sessionHandle`. Tudo mais permanece igual.

```ts
// hooks.server.ts — antes
const sessionCookie = getSessionCookie(event.request);
event.locals.session = sessionCookie ?? null;
if (isProtectedPath(pathname) && !sessionCookie) redirect(...)

// hooks.server.ts — depois
const session = await auth.api.getSession({ headers: event.request.headers });
event.locals.session = session?.session ?? null;
if (isProtectedPath(pathname) && !session) redirect(...)
```

**Vantagens:**
- Resolve o problema raiz (cookie inválido passando pelo guard)
- Elimina o loop de redirect / 500
- Sem mudança arquitetural
- Sem novos acessos ao DB além do que já existe (mitigado pelo `cookieCache`)

**Custo:**
- Uma query no DB por request protegido
- Mitigada por `session: { cookieCache: { enabled: true, maxAge: 60 * 5 } }` já configurado — valida localmente via HMAC por 5 min antes de ir ao DB

**Problemas que NÃO resolve:**
- Parse manual de Set-Cookie (ainda frágil, flag `secure` ausente)
- Rota `/auth/*` exposta no Hono em paralelo
- Sign-in/sign-up ainda via `fetch()` manual

---

## 5. Correções já implementadas (2026-04-16)

| Arquivo | Mudança | Motivo |
|---|---|---|
| `packages/auth/server.ts` | `baseURL: env.BETTER_AUTH_URL` adicionado | better-auth inferindo URL incorretamente |
| `apps/api/src/main/routes/public/auth.ts` | Middleware `getSession` removido da rota pública | Chamada redundante bloqueava sign-in se DB lento |
| `apps/api/src/main/routes/v1/index.ts` | `authMiddleware` descomentado | Rotas `/v1/*` estavam públicas |
| `apps/dashboard/src/lib/api/hono-client.ts` | Headers spreading corrigido para `Headers` instance | Headers perdidos em requests futuros com body |
| `apps/dashboard/src/routes/[locale]/(authenticated)/+page.server.ts` | Limpa cookies `better-auth.*` antes de redirecionar em 401 | Quebra o loop redirect → 500 |
| `apps/dashboard/.env` + `.env.example` | `API_URL=http://localhost:3002` adicionado | Arquivo estava vazio, URL dependia do default |

---

## 6. O que ainda precisa de decisão

### Alta prioridade

- [ ] **`auth.api.getSession()` no `sessionHandle`** (Opção D)
  Correção cirúrgica recomendada. Resolve validação superficial de sessão sem mudança arquitetural.

- [ ] **Flag `secure` no parse de Set-Cookie do sign-in**
  Atual parse manual ignora `secure` → cookies não enviados em HTTPS. Bloqueante para produção.

### Média prioridade

- [ ] **Decidir onde vive o auth em produção**
  Hono em rede privada (não acessível diretamente pelo browser) + SvelteKit como único ponto de entrada? Ou manter como está com firewall?

- [ ] **Rate limiting nas rotas de auth**
  `@pack/rate-limit` existe mas não está aplicado em `/auth/sign-in`. Brute force está desprotegido.

- [ ] **Sign-up não autentica automaticamente**
  Redireciona para sign-in em vez de logar direto. UX friction desnecessária.

### Baixa prioridade

- [ ] **Remover `nextCookies()` plugin de `@pack/auth/server.ts`**
  Inativo no contexto Hono. Tech debt registrado.

- [ ] **Validação HTML5 nos inputs de senha**
  `minlength="8"` ausente nos formulários — erro de senha curta só aparece após roundtrip ao servidor.

---

## 7. Notas sobre cookieCache e performance

O `betterAuth()` está configurado com:

```ts
session: { cookieCache: { enabled: true, maxAge: 60 * 5 } }
```

Com `auth.api.getSession()` no hooks, o fluxo de validação é:

1. better-auth lê o cookie `better-auth.session_token`
2. Verifica HMAC da sessão cacheada no cookie (sem DB)
3. Se cache válido e dentro dos 5 min → retorna sessão do cache
4. Se cache expirado → vai ao DB para renovar

Na prática, a maioria dos requests validará via HMAC local (< 1ms), não via DB query. O custo é aceitável.

---

## 8. Referências

- [SvelteKit Integration | Better Auth](https://better-auth.com/docs/integrations/svelte-kit)
- [SvelteKit Example | Better Auth](https://better-auth.com/docs/examples/svelte-kit)
- [better-auth GitHub](https://github.com/better-auth/better-auth)
- Código fonte inspecionado: `packages/auth/node_modules/better-auth/dist/integrations/svelte-kit.mjs`
- Código fonte inspecionado: `packages/auth/node_modules/better-auth/dist/api/routes/session.mjs`
- Análise de segurança existente no projeto: `AUTH_SECURITY_ANALYSIS.md`
