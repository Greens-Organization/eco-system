import type { Page } from '@playwright/test';
import es from '../../../../packages/i18n/dictionaries/es.json' with {
  type: 'json',
};
import pt from '../../../../packages/i18n/dictionaries/pt.json' with {
  type: 'json',
};
import { expect, signedIn, t, test } from './fixtures';

const copy = { en: t, pt: pt.app, es: es.app };
type Locale = keyof typeof copy;

const LABELS: Record<Locale, string> = {
  en: '🇺🇸 English',
  pt: '🇧🇷 Português',
  es: '🇪🇸 Español',
};

/** Pick a language in the header selector, labelled in the current one. */
async function switchTo(page: Page, from: Locale, to: Locale) {
  await page
    .getByRole('combobox', { name: copy[from].common.selectLanguage })
    .selectOption({ label: LABELS[to] });
}

/**
 * Marks the current document, and counts document requests from here on:
 * a client-side switch keeps the mark and makes none.
 */
async function watchReloads(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __sameDocument: boolean }).__sameDocument = true;
  });
  const documents: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'document') documents.push(request.url());
  });
  return {
    documents,
    sameDocument: () =>
      page.evaluate(
        () =>
          (window as unknown as { __sameDocument?: boolean }).__sameDocument ===
          true
      ),
  };
}

test.beforeEach(async ({ page }) => {
  await signedIn(page);
});

test('switching the language stays on the page, without a reload', async ({
  page,
}) => {
  await page.goto('/en/customers?status=active');
  await expect(page.locator('tbody tr').first()).toBeVisible();
  const reloads = await watchReloads(page);

  await switchTo(page, 'en', 'pt');
  await expect(page).toHaveURL(/\/pt\/customers\?status=active$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
  await expect(page).toHaveTitle(new RegExp(`^${pt.app.customers.title} · `));
  await expect(
    page.getByRole('link', { name: pt.app.navigation.dashboard }).first()
  ).toBeVisible();
  // The list filter came along, and the selector shows the new language.
  await expect(page.getByLabel(pt.app.list.status)).toHaveValue('active');
  await expect(
    page.getByRole('combobox', { name: pt.app.common.selectLanguage })
  ).toHaveValue('pt');
  // No English copy left behind by a component that was not refreshed.
  await expect(
    page.getByRole('link', { name: t.navigation.dashboard, exact: true })
  ).toHaveCount(0);

  expect(await reloads.sameDocument()).toBe(true);
  expect(reloads.documents).toEqual([]);
});

test('server-formatted data follows the new language', async ({ page }) => {
  await page.goto('/en/profile');
  const today = new Date();
  const longDate = (locale: Locale) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(today);
  await expect(page.getByText(longDate('en'), { exact: true })).toBeVisible();
  const reloads = await watchReloads(page);

  // Profile has its own selector next to the header's; either will do.
  await page
    .getByRole('combobox', { name: t.common.selectLanguage })
    .first()
    .selectOption({ label: LABELS.pt });
  await expect(page).toHaveURL(/\/pt\/profile$/);
  // memberSince is formatted by the server load in the request's locale.
  await expect(page.getByText(longDate('pt'), { exact: true })).toBeVisible();
  await expect(page.getByText(pt.app.profile.memberSince)).toBeVisible();

  // Back to English through history: the load reruns for that too.
  await page.goBack();
  await expect(page).toHaveURL(/\/en\/profile$/);
  await expect(page.getByText(longDate('en'), { exact: true })).toBeVisible();
  await expect(page.getByText(t.profile.memberSince)).toBeVisible();

  expect(await reloads.sameDocument()).toBe(true);
  expect(reloads.documents).toEqual([]);
});

test('back and forward walk through the languages', async ({ page }) => {
  await page.goto('/en');
  const reloads = await watchReloads(page);

  await switchTo(page, 'en', 'pt');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
  await switchTo(page, 'pt', 'es');
  await expect(page).toHaveURL(/\/es$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(
    page.getByRole('combobox', { name: es.app.common.selectLanguage })
  ).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/pt$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
  await expect(
    page.getByRole('combobox', { name: pt.app.common.selectLanguage })
  ).toHaveValue('pt');

  await page.goBack();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByRole('combobox', { name: t.common.selectLanguage })
  ).toHaveValue('en');

  await page.goForward();
  await expect(page).toHaveURL(/\/pt$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt');

  expect(await reloads.sameDocument()).toBe(true);
  expect(reloads.documents).toEqual([]);
});

test('a reload after switching renders the new language from the server', async ({
  page,
}) => {
  await page.goto('/en/customers');
  await switchTo(page, 'en', 'pt');
  await expect(page).toHaveURL(/\/pt\/customers$/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
  await expect(page).toHaveTitle(new RegExp(`^${pt.app.customers.title} · `));
});
