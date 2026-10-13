import { expect, signedIn, t, test } from './fixtures';

/** Hold the data request of the next client-side navigation for `ms`. */
const slowData = (page: import('@playwright/test').Page, ms: number) =>
  page.route(/__data\.json/, async (route) => {
    await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });

test('a slow navigation shows the next page skeleton, then the page', async ({
  page,
}) => {
  await signedIn(page);
  await slowData(page, 1500);

  await page
    .getByRole('link', { name: t.navigation.customers })
    .first()
    .click();
  const skeleton = page.getByTestId('page-skeleton');
  await expect(skeleton).toBeVisible();
  await expect(skeleton).toHaveAttribute('aria-busy', 'true');
  await expect(skeleton.getByRole('status')).toHaveText(t.common.loading);

  await expect(page).toHaveURL(/\/en\/customers$/);
  await expect(skeleton).toBeHidden();
  await expect(page.locator('tbody tr').first()).toBeVisible();
});

test('a fast navigation goes straight to the page', async ({ page }) => {
  await signedIn(page);
  const seen: boolean[] = [];
  await page.exposeFunction('skeletonSeen', () => seen.push(true));
  await page.evaluate(() => {
    new MutationObserver(() => {
      if (document.querySelector('[data-testid="page-skeleton"]')) {
        (window as unknown as { skeletonSeen: () => void }).skeletonSeen();
      }
    }).observe(document.body, { childList: true, subtree: true });
  });

  await page
    .getByRole('link', { name: t.navigation.employees })
    .first()
    .click();
  await expect(page.locator('tbody tr').first()).toBeVisible();
  expect(seen).toEqual([]);
});
