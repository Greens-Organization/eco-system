# Plano: migrar i18n para Paraglide JS (compiler-first)

> Status: **PLANEJADO** (não executado). Documento de intenção. Migração grande
> (L), opt-in; só executar quando o boilerplate estabilizar e houver volume de
> mensagens que justifique. Motivação: o runtime de dicionários atual não faz
> tree-shaking por mensagem nem tipagem de chave em tempo de compilação.

## 1. Estado atual

`@pack/i18n` é um runtime de dicionários:

- `dictionaries/{en,pt,es}.json` carregados **sob demanda** via
  `import(\`./dictionaries/${locale}.json\`)` em `getDictionary(locale)`.
- Locale vem da rota (`/[locale]/...`); `hooks.server.ts` resolve via
  `resolveLocale` (Accept-Language) e semeia o dicionário no **contexto Svelte**
  (`$lib/i18n/context.svelte.ts` → `useTranslation()`/`useLocale()`).
- `format.ts`: `formatCurrency/formatNumber/formatPercent` (Intl).
- Helpers de path: `addLocaleToPathname`, `removeLocaleFromPathname`, etc.

Funciona e é pequeno (os 3 dicionários somam ~8,6 KB). **Não é a causa do
cold-start lento do dev** (isso era o Vite — já resolvido, §5).

## 2. Por que migrar

Dois limites reais para um boilerplate que deve escalar:

1. **Sem tree-shaking por mensagem.** O dicionário inteiro do locale vai pro
   client mesmo que a página use 3 chaves. Cresce com o catálogo, não com o uso.
   (Benchmark do inlang: 100 mensagens usadas → ~47 KB com Paraglide vs ~205 KB
   com i18next; Paraglide fica plano conforme o catálogo cresce.)
2. **Sem type-safety nas chaves.** `dict.app.dashboard.titulo` com typo falha
   **em runtime**, silencioso. Paraglide compila cada mensagem para uma função
   ESM **tipada** → autocomplete + erro de compilação no typo.

## 3. Opções consideradas

| Opção | Tree-shaking | Type-safe | Plural/ICU | Notas |
|---|---|---|---|---|
| **Paraglide JS / inlang** (recomendado) | ✅ compile-time | ✅ funções geradas | ✅ (plugin ICU) | Menor bundle; SSR via `paraglideMiddleware` + `AsyncLocalStorage`. |
| typesafe-i18n | ❌ runtime (mas ~1 KB) | ✅ | ✅ | Modelo de dicionário familiar, tipado; sem tree-shaking de mensagem. |
| Manter o custom atual | ❌ | ❌ | ❌ | Ok para catálogo pequeno; não escala em bundle nem em DX. |

**Recomendação: Paraglide JS** — melhor história de bundle-size + type-safety,
e o projeto já tem o plugin `ANALYZE` (bundle-stats), ou seja, se importa com
tamanho. typesafe-i18n é o plano B se quisermos um modelo runtime com tipos.

## 4. Plano de migração (fases)

1. **Setup do inlang/Paraglide**
   - Adicionar `@inlang/paraglide-js` (+ o Vite plugin) ao dashboard.
   - `project.inlang/settings.json` com os locales (`en`, `pt`, `es`) e
     `baseLocale: 'en'`.
   - Plugin de mensagens (inlang message format ou i18next-json) apontando para
     os JSONs atuais como ponto de partida.
2. **Converter os dicionários → mensagens**
   - Migrar `dictionaries/*.json` para o formato de mensagens do inlang
     (`messages/{locale}.json`). As chaves viram funções `m.app_dashboard_x()`.
   - Manter `en` como base; `pt`/`es` como traduções.
3. **Wiring SvelteKit (SSR-safe)**
   - `hooks.server.ts`: usar `paraglideMiddleware`/`AsyncLocalStorage` para
     isolar `getLocale()` por request (substitui a semeadura via contexto).
   - Definir o locale a partir do segmento `[locale]` (manter o roteamento).
   - Trocar `useTranslation()` por `import * as m from '$lib/paraglide/messages'`
     nos componentes; remover `$lib/i18n/context.svelte.ts`.
4. **Edge cases (fazer junto — o custom atual NÃO cobre):**
   - `<html lang={locale}>` no root layout (a11y/SEO) a partir do param de rota.
   - `hreflang` alternates + canonical por locale (`@pack/seo`, hoje órfão —
     bom momento pra ligar os dois).
   - Garantir 1 só carga: passar locale/mensagens via `load` data, sem fetch
     duplicado server+client.
5. **Limpeza**
   - `@pack/i18n` fica só com `format.ts` (Intl) + helpers de path/locale; os
     dicionários e `getDictionary` saem.
   - Atualizar `removeLocaleFromPathname`/`addLocaleToPathname` se o roteamento
     mudar.
   - Rodar `ANALYZE=1 bun run build` antes/depois pra medir o ganho de bundle.

## 5. Riscos / decisões em aberto

- **Roteamento**: manter `[locale]` no path (recomendado, SEO) vs estratégia de
  cookie/sub-domínio do Paraglide. Decidir antes da fase 3.
- **Pluralização/ICU**: hoje não há; se precisarmos, habilitar o plugin ICU.
- **Strings dinâmicas**: chaves construídas em runtime (`t[\`x.${var}\`]`) não
  existem no Paraglide (mensagens são estáticas) — mapear esses casos antes.
- **`@pack/i18n` consumido pela API?** Hoje só o dashboard usa as mensagens; a
  API usa só os helpers de format/locale — manter esses no pacote.

## 6. Esforço & sequenciamento

- Esforço: **L** (toca dashboard inteiro + build + SEO). Fazer em PR próprio.
- Pré-requisito: catálogo de mensagens estável (evitar migrar durante churn).
- Verificação: `svelte-check` 0 erros, `ANALYZE` build mostrando bundle menor,
  smoke das 3 locales no browser, `<html lang>` correto por rota.
