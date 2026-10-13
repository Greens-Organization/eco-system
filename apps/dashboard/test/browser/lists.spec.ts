import { expect, signedIn, t, test } from './fixtures';

const pageOf = (page: number, pages: number) =>
  t.list.pageOf
    .replace('{page}', String(page))
    .replace('{pages}', String(pages));

test.beforeEach(async ({ page }) => {
  await signedIn(page);
});

test('customers: page through, search, filter, clear', async ({ page }) => {
  await page
    .getByRole('link', { name: t.navigation.customers })
    .first()
    .click();
  await expect(page).toHaveURL(/\/en\/customers$/);
  await expect(page).toHaveTitle(/Customers/);

  const rows = page.locator('tbody tr');
  await expect(rows.first()).toBeVisible();
  const pager = page.getByRole('navigation', { name: /Page 1 of/ });
  const pages = Number(
    (await pager.getAttribute('aria-label'))?.split(' of ')[1]
  );
  expect(pages).toBeGreaterThan(1);

  const firstOnPage1 = await rows.first().locator('a').innerText();
  await page.getByRole('link', { name: t.list.next }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText(pageOf(2, pages), { exact: true })).toBeVisible();
  await expect(rows.first().locator('a')).not.toHaveText(firstOnPage1);
  await page.getByRole('link', { name: t.list.previous }).click();
  await expect(rows.first().locator('a')).toHaveText(firstOnPage1);

  await page.getByLabel(t.list.search).fill(firstOnPage1);
  await page.getByRole('button', { name: t.list.apply }).click();
  await expect(page).toHaveURL(/q=/);
  await expect(rows).toHaveCount(1);
  await expect(rows.first().locator('a')).toHaveText(firstOnPage1);

  await page.getByRole('link', { name: t.list.clear }).click();
  await expect(page).toHaveURL(/\/en\/customers$/);
  await page.getByLabel(t.list.status).selectOption('pending');
  await page.getByRole('button', { name: t.list.apply }).click();
  await expect(page).toHaveURL(/status=pending/);
  const statuses = await rows.locator('[data-slot="badge"]').allInnerTexts();
  expect(statuses.length).toBeGreaterThan(0);
  expect(new Set(statuses)).toEqual(new Set([t.customers.status.pending]));

  await page.getByLabel(t.list.search).fill('zzz-nothing-matches');
  await page.getByRole('button', { name: t.list.apply }).click();
  await expect(page.getByText(t.list.noResults)).toBeVisible();
});

test('customers: detail page, and a 404 for an unknown id', async ({
  page,
}) => {
  await page.goto('/en/customers');
  const first = page.locator('tbody tr').first().locator('a');
  const name = await first.innerText();
  await first.click();
  await expect(page).toHaveURL(/\/en\/customers\/\d+$/);
  await expect(page.locator('[data-slot="card-title"]')).toHaveText(name);
  await page.getByRole('link', { name: t.list.back }).click();
  await expect(page).toHaveURL(/\/en\/customers$/);

  const res = await page.goto('/en/customers/99999');
  expect(res?.status()).toBe(404);
});

test('employees: list, search and detail', async ({ page }) => {
  await page
    .getByRole('link', { name: t.navigation.employees })
    .first()
    .click();
  await expect(page).toHaveURL(/\/en\/employees$/);
  const first = page.locator('tbody tr').first().locator('a');
  const name = await first.innerText();

  await page.getByLabel(t.list.search).fill(name);
  await page.getByRole('button', { name: t.list.apply }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await first.click();
  await expect(page.locator('[data-slot="card-title"]')).toHaveText(name);
});

test('the sidebar collapses and stays collapsed after a reload', async ({
  page,
}) => {
  const sidebar = page.locator('[data-slot="sidebar"][data-state]');
  await expect(sidebar).toHaveAttribute('data-state', 'expanded');
  await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
  await page.reload();
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
});
