# Internacionalização (i18n) - App Dashboard

Este diretório contém toda a lógica de internacionalização para o aplicativo dashboard.

## 📚 Estrutura

```
lib/i18n/
├── provider.tsx    # Provider e hooks React para i18n
├── utils.ts        # Utilitários e tipos para i18n
├── index.ts        # Exportações centralizadas
└── README.md       # Este arquivo
```

## 🌍 Idiomas Suportados

- **en** - English (padrão)
- **pt** - Português
- **es** - Español

## 🚀 Como Usar

### 1. Em Componentes Server (páginas e layouts)

```typescript
import { getDictionary } from '@pack/i18n';
import type { Locale } from '@/lib/i18n/utils';

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export default async function MyPage({ params }: PageProps) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return (
    <div>
      <h1>{dictionary.app.dashboard.title}</h1>
      <p>{dictionary.app.dashboard.description}</p>
    </div>
  );
}
```

### 2. Em Componentes Client

```typescript
'use client';

import { useTranslation, useLocale } from '@/lib/i18n';

export function MyComponent() {
  const t = useTranslation();
  const locale = useLocale();

  return (
    <div>
      <h1>{t.app.common.settings}</h1>
      <p>Current locale: {locale}</p>
    </div>
  );
}
```

### 3. Metadata com i18n

```typescript
import { getDictionary } from '@pack/i18n';
import type { Locale } from '@/lib/i18n/utils';
import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return {
    title: dictionary.app.dashboard.title,
    description: dictionary.app.dashboard.description,
  };
}
```

## 🔧 Hooks Disponíveis

### `useTranslation()`
Retorna o objeto completo de traduções (dictionary).

```typescript
const t = useTranslation();
console.log(t.app.common.loading); // "Loading..."
```

### `useLocale()`
Retorna o locale atual (en, pt, es).

```typescript
const locale = useLocale();
console.log(locale); // "pt"
```

### `useI18n()`
Retorna tanto o locale quanto as traduções.

```typescript
const { locale, dictionary } = useI18n();
```

## 🛠️ Utilitários

### `isValidLocale(locale: string): boolean`
Verifica se um locale é válido.

```typescript
import { isValidLocale } from '@/lib/i18n/utils';

isValidLocale('pt'); // true
isValidLocale('fr'); // false
```

### `getLocaleFromPathname(pathname: string): Locale`
Extrai o locale de um pathname.

```typescript
import { getLocaleFromPathname } from '@/lib/i18n/utils';

getLocaleFromPathname('/pt/dashboard'); // "pt"
getLocaleFromPathname('/dashboard'); // "en" (fallback)
```

### `removeLocaleFromPathname(pathname: string): string`
Remove o locale de um pathname.

```typescript
import { removeLocaleFromPathname } from '@/lib/i18n/utils';

removeLocaleFromPathname('/pt/dashboard'); // "/dashboard"
```

### `addLocaleToPathname(pathname: string, locale: Locale): string`
Adiciona um locale a um pathname.

```typescript
import { addLocaleToPathname } from '@/lib/i18n/utils';

addLocaleToPathname('/dashboard', 'es'); // "/es/dashboard"
```

## 📝 Adicionando Novas Traduções

1. Edite o arquivo principal em inglês:
   ```
   packages/i18n/dictionaries/en.json
   ```

2. Execute o comando de tradução automática:
   ```bash
   cd packages/i18n
   bun run translate
   ```

3. Ou adicione manualmente nos outros arquivos:
   ```
   packages/i18n/dictionaries/pt.json
   packages/i18n/dictionaries/es.json
   ```

## 🗂️ Estrutura do Dicionário

```json
{
  "app": {
    "common": {
      "loading": "Loading...",
      "error": "Error",
      "save": "Save"
    },
    "navigation": {
      "dashboard": "Dashboard",
      "webhooks": "Webhooks"
    },
    "dashboard": {
      "title": "Acme Inc",
      "description": "My application."
    },
    "errors": {
      "notFound": "Page not found",
      "unauthorized": "Unauthorized access"
    },
    "auth": {
      "signIn": {
        "title": "Welcome back",
        "description": "Enter your details to sign in."
      }
    }
  }
}
```

## 🔄 Mudança de Idioma

Use o componente `LanguageSelector`:

```typescript
import { LanguageSelector } from '@/components/language-selector';

export function Header() {
  return (
    <header>
      <LanguageSelector />
    </header>
  );
}
```

## 🎯 Rotas

As rotas são automaticamente prefixadas com o locale:

- `/en/dashboard` → Dashboard em inglês
- `/pt/dashboard` → Dashboard em português
- `/es/dashboard` → Dashboard em espanhol
- `/dashboard` → Redireciona para `/en/dashboard`

## ⚙️ Configuração do Middleware

O middleware em `middleware.ts` cuida de:

1. ✅ Autenticação (Clerk)
2. ✅ Detecção automática de idioma (header Accept-Language)
3. ✅ Redirecionamento para locale correto
4. ✅ Fallback para inglês quando necessário

## 🔍 Type Safety

Todas as traduções são type-safe:

```typescript
import type { Dictionary } from '@pack/i18n';

// TypeScript vai autocompletar e validar as chaves
const t: Dictionary = await getDictionary('pt');
t.app.common.loading; // ✅ Type-safe
t.app.common.invalid; // ❌ TypeScript error
```

## 📖 Referências

- [next-international](https://next-international.vercel.app/)
- [Languine - Auto Translation](https://github.com/languine-ai/languine)
- [Next.js i18n Routing](https://nextjs.org/docs/app/building-your-application/routing/internationalization)