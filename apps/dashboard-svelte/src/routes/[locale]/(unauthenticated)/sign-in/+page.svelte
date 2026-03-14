<script lang="ts">
  import { enhance } from '$app/forms'
  import { Button } from '@pack/design-system-svelte'
  import { useTranslation, useLocale } from '$lib/i18n/context.svelte'

  interface Props {
    form?: { error?: string } | null
    data?: Record<string, never>
  }

  let { form }: Props = $props()

  const t = useTranslation()
  const locale = useLocale()

  let loading = $state(false)
</script>

<svelte:head>
  <title>{t.app.auth.signIn.title} | eco-system</title>
</svelte:head>

<div class="flex flex-col gap-6">
  <div class="flex flex-col gap-2 text-center">
    <h1 class="text-2xl font-bold">{t.app.auth.signIn.title}</h1>
    <p class="text-sm text-muted-foreground">{t.app.auth.signIn.description}</p>
  </div>

  <form
    method="POST"
    use:enhance={() => {
      loading = true
      return ({ update }) => {
        loading = false
        update()
      }
    }}
    class="flex flex-col gap-4"
  >
    <div class="flex flex-col gap-1.5">
      <label for="email" class="text-sm font-medium">{t.app.auth.email}</label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autocomplete="email"
        placeholder="you@example.com"
        class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="password" class="text-sm font-medium">{t.app.auth.password}</label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autocomplete="current-password"
        placeholder="••••••••"
        class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>

    {#if form?.error}
      <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
        {form.error}
      </p>
    {/if}

    <Button type="submit" disabled={loading} class="w-full">
      {loading ? t.app.common.loading : t.app.auth.signIn.title}
    </Button>
  </form>

  <p class="text-center text-sm text-muted-foreground">
    {t.app.auth.noAccount}
    <a href="/{locale}/sign-up" class="font-medium text-primary hover:underline">
      {t.app.auth.signUp.title}
    </a>
  </p>
</div>
