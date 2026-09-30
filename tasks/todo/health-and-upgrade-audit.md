# Auditoria de saúde + plano de upgrade

> Data: 2026-09-29. Branch: `alpha/eco-system-v2` (87 commits à frente de `main`,
> sem upstream). Escopo: estado real verificado por execução (não inspeção),
> toolchain, 60 deps desatualizadas e triagem do `tasks/todo/`.

---

## 1. Estado verificado (executado hoje)

| Check | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `turbo run typecheck --force` | **13/13 pacotes OK** (2m19s, cache limpo) |
| Lint | `biome check .` | **5 erros** em 213 arquivos |
| Testes | `turbo run test --force` | **55 pass / 0 fail** (4 pacotes, 151 expects) |
| E2E | `E2E=1 …` | **não executado** — exige compose efêmero |
| Runtime | dashboard `:3000` + API `:3002` | painel acessível com sessão real (5 rotas 200) |

### Os 5 erros de lint

```
packages/db/schema/User/Account.ts       lint/style/useFilenamingConvention
packages/db/schema/User/Session.ts       lint/style/useFilenamingConvention
packages/db/schema/User/User.ts          lint/style/useFilenamingConvention
packages/db/schema/User/Verification.ts  lint/style/useFilenamingConvention
apps/dashboard/static/favicon.svg        lint/a11y/noSvgWithoutTitle
```

Os 4 primeiros têm só 6 referências, todas internas ao `@pack/db`
(`schema/index.ts` reexporta os 4; `Account.ts` e `Session.ts` importam
`./User`). Renomear para kebab-case é mecânico e de raio curto.

O favicon é falso-positivo de regra a11y aplicada a um asset estático —
`noSvgWithoutTitle` existe para SVG inline em JSX/Svelte, não para
`static/favicon.svg`. Corrigir com `overrides` no `biome.json` para
`apps/dashboard/static/**`, não adicionando `<title>` ao favicon.

### O backlog de "migration debt" está obsoleto

`memory/progress.md` lista 4 pendências para religar o verify gate. Três já
morreram sem ninguém marcar:

| Item do backlog | Realidade hoje |
| --- | --- |
| `@pack/payments` vazio | pacote **não existe mais** |
| `apps/api` imports quebrados | typecheck **verde** |
| `apps/dashboard` `$lib/env` ausente | arquivo **existe** e é usado |
| `packages/db/schema/User/*` filenaming | **único real** — 4 dos 5 erros |

**Consequência:** com os 5 erros de lint zerados, os três checks ficam verdes e
podem virar gate obrigatório em CI. (O gate local — `agent-md.toml`, `memory/`,
`.agent-md/` e os hooks do `.claude/` — foi removido em 2026-09-30; a
verificação passa a ser manual até o workflow existir.)

---

## 2. Toolchain — três versões de Bun brigando

| Fonte | Versão declarada |
| --- | --- |
| `.tool-versions` (o que o mise ativa no repo) | bun **1.3.13**, nodejs **26.1.0** |
| `package.json` → `packageManager` | bun **1.3.14** |
| `~/.config/mise/config.toml` (global) | bun **1.4.2** ← já instalado |
| `@types/bun` (7 pacotes) | **1.3.14** |
| `apps/api/Dockerfile` | `oven/bun@sha256:e10577…` (digest, versão não legível) |

Upstream hoje: **bun 1.4.2**, **node 26.10.0** (latest) / **24.21.0** (LTS Krypton).

`.tool-versions` vence localmente, então você programa em 1.3.13 enquanto o
`packageManager` promete 1.3.14 e o mise global tem 1.4.2 parado. Qualquer
divergência entre o bun que roda os testes e o bun da imagem de produção é bug
esperando data.

### Proposta

1. Trocar `.tool-versions` por `mise.toml` nativo:
   ```toml
   [tools]
   bun = "1.4.2"
   node = "26.10.0"
   ```
2. `package.json`: `"packageManager": "bun@1.4.2"`, `"engines": { "node": ">=26" }`.
3. `@types/bun` → `1.4.2` nos 7 pacotes (hoje `1.3.14`).
4. Re-pinar o digest do `oven/bun` no `apps/api/Dockerfile` para um build 1.4.2.
5. `bun install` + rodar typecheck/lint/test — o lockfile é v1, o runtime muda.

**Decisão sua:** node 26.10.0 (latest, o que você pediu) vs 24.21.0 (LTS). 26 é
*current*, não LTS — em imagem de produção isso significa janela de suporte
curta. Local em 26 e imagem em LTS também é opção, mas aí some a garantia de
paridade que o item 4 existe para dar.

---

## 3. Dependências — 60 desatualizadas

Todas as versões estão **pinadas exatas** (sem `^`), então `bun update` não move
nada: a coluna `Update` do `bun outdated` é igual à `Current` em 100% dos casos.
Precisa de `bun update --latest` ou edição do catálogo.

### Tier 1 — patch/minor, baixo risco (um commit, uma verificação)

`hono 4.12.25→4.13.11` · `zod 4.4.3→4.6.5` · `@hono/zod-openapi 1.4.0→1.6.3` ·
`@hono/otel 1.1.2→1.2.0` · `@scalar/hono-api-reference 0.11.3→0.12.7` ·
`drizzle-orm 0.45.2→0.45.3` · `drizzle-kit 0.31.10→0.31.11` ·
`@sveltejs/kit 2.65.1→2.70.3` · `svelte 5.56.3→5.57.1` · `vite 8.0.16→8.3.1` ·
`@sveltejs/vite-plugin-svelte 7.1.2→7.3.1` · `adapter-node 5.5.4→5.5.7` ·
`svelte-check 4.6.0→4.7.6` · `tailwindcss 4.3.1→4.3.3` (+ vite/postcss plugins) ·
`bits-ui 2.18.1→2.19.3` · `tailwind-merge 3.6.0→3.7.0` ·
`tailwind-variants 3.2.2→3.3.1` · `@biomejs/biome 2.5.0→2.5.14` ·
`turbo 2.9.18→2.11.5` · `es-toolkit 1.47.1→1.52.0` · `pino`/OTel `0.219→0.222` ·
`postcss 8.5.15→8.5.28` · `ws`, `negotiator`, `concurrently`, `@types/*`.

### Tier 2 — cada um é sua própria fatia, com verificação própria

| Pacote | Salto | Por que separar |
| --- | --- | --- |
| `typescript` | 6.0.3 → **7.0.2** | major; 7.x é a reescrita nativa do compilador. Verificar `svelte-check`, `drizzle-kit` e os 13 typechecks antes de adotar |
| `better-auth` | 1.6.19 → **1.7.6** | maior raio de explosão do repo — sessão, cookie cache, adapter Drizzle, argon2. Testar sign-in/sign-out + `/auth/get-session` de ponta a ponta |
| `@lucide/svelte` | 1.18.0 → **1.48.0** | 30 minors acumulados; os deep imports por ícone estão no caminho crítico do cold-start do vite (`vite.config.ts`) |
| `nodemailer` | 9.0.0 → **10.0.12** | major |
| `resend` | 6.12.4 → **6.31.0** | 19 minors |
| `@formatjs/intl-localematcher` | 0.8.10 → **0.9.0** | minor 0.x = breaking por convenção; alimenta `resolveLocale` |
| `react`/`react-dom` | 19.2.7 → 19.3.0 | legítimo — `@pack/email` usa `@react-email/render`, não é sobra da migração Next |

---

## 4. Lacunas estruturais

1. **Sem CI.** `.github/` tem só templates de issue/PR/CONTRIBUTING/SECURITY —
   zero workflows. 55 testes existem e nada os roda automaticamente. Com o
   verify gate stubado, hoje **nenhum** check é obrigatório em lugar nenhum.
   Maior gap do repo.
2. **Cobertura concentrada.** 4 de 14 pacotes têm script `test`: `api`,
   `@pack/observability`, `@pack/tools`, `@pack/testing`. Sem teste:
   `@pack/auth`, `@pack/db`, `@pack/i18n`, `@pack/cache`, `@pack/storage`,
   `@pack/email`, `@pack/seo`, `@pack/design-system` e **o dashboard inteiro**.
3. **Sem Dockerfile do dashboard.** Só `apps/api` tem. O item "deploy recipe"
   do audit de maio segue aberto.
4. **`@pack/seo` sem importadores — por decisão, não por esquecimento.** O
   `metadata.ts` Next-shaped foi removido em junho (`858b7ad`) e só o `json-ld`
   ficou, como helper para quem forkar o template. Não é pendência; está
   registrado no `CLAUDE.md` §5 para não ser "limpado" por engano.
4. **Verificação manual.** Removidos `memory/`, `.agent-md/`, `agent-md.toml` e
   os hooks do `.claude/` (2026-09-30). Sem CI, nenhum check roda sozinho —
   `typecheck`, `lint` e `test` dependem de disciplina até o workflow existir.

---

## 5. Triagem do `tasks/todo/`

| Arquivo | Status real | Ação sugerida |
| --- | --- | --- |
| `boilerplate-gaps-audit.md` | **desatualizado** — audit de 2026-05-10. Itens já entregues depois: README (`cd91e2b`), rotas da sidebar (5 commits de 21/06), observabilidade (todo o bloco de junho), pacotes vazios (payments removido). Continuam abertos: CI, auth flows, ~10 componentes do design system, env management, deploy recipe, middleware Hono, CSP, better-auth prod | re-auditar e reescrever; hoje ele mente sobre o estado |
| `observability-followups.md` | F1/F2/F5 feitos, F4/F6 parciais. Abertos: **F3** (spans de DB no Drizzle), **F7** (observabilidade no dashboard + manifests k8s/HPA) | manter; são os únicos 2 itens vivos |
| `i18n-paraglide-migration.md` | planejado, não executado, adiado deliberadamente (tamanho L) | manter parado até o boilerplate estabilizar |
| `sampling-strategy.md` | pesquisa **concluída**, decisão tomada e já documentada no `CLAUDE.md` §16 | mover para `tasks/done/` ou `docs/` — não é pendência |

---

## 6. Sequência sugerida

1. **Toolchain** — `mise.toml` bun 1.4.2 + node, `packageManager`, `@types/bun`,
   digest do Dockerfile. Verificar com typecheck/lint/test.
2. **Zerar o lint** (4 renames + override do favicon).
3. **CI** — um workflow rodando typecheck + lint + test nas mesmas versões do
   `mise.toml`. É a única rede de proteção que sobrou; sem ele os passos
   seguintes são bump sem verificação.
4. **Tier 1 de deps** em um commit, verificado.
5. **Tier 2**, um por fatia, na ordem: `@lucide/svelte` → `typescript` →
   `better-auth` → resto.
6. **Limpeza do `tasks/todo/`** conforme §5.

Passos 1–3 pagam a dívida que torna os demais seguros. Fazer 4/5 antes de 2/3
é bump de dependência sem verificação — exatamente o que o gate stubado esconde.
