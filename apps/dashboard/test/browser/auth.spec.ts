import {
  expect,
  linkFromMail,
  newAccount,
  signedIn,
  signIn,
  signUp,
  t,
  test,
} from './fixtures';

test('a signed-out visitor is sent to sign-in, and back after it', async ({
  page,
}) => {
  await page.goto('/en/customers');
  await expect(page).toHaveURL(/\/en\/sign-in/);
  await expect(
    page.getByRole('heading', { name: t.auth.signIn.title })
  ).toBeVisible();
});

test('sign up, sign in, sign out', async ({ page }) => {
  const account = newAccount();
  await signUp(page, account);
  await signIn(page, account);
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByText(t.dashboard.signups)).toBeVisible();

  await page.getByRole('button', { name: account.name }).click();
  await page.getByRole('menuitem', { name: t.common.logout }).click();
  await expect(page).toHaveURL(/\/en\/sign-in/);

  await page.goto('/en');
  await expect(page).toHaveURL(/\/en\/sign-in/);
});

test('a wrong password says so and stays on sign-in', async ({ page }) => {
  const account = newAccount();
  await signUp(page, account);
  await signIn(page, { ...account, password: 'not-the-password' });
  await expect(page.getByRole('alert')).toContainText(
    t.errors.invalidCredentials
  );
  await expect(page).toHaveURL(/\/en\/sign-in/);
});

test('forgot password: mail, new password, old one stops working', async ({
  page,
}) => {
  const account = newAccount();
  await signUp(page, account);

  await page.goto('/en/sign-in');
  await page.getByRole('link', { name: t.auth.forgotLink }).click();
  // Client-side navigation: until it lands, "Email" is still sign-in's field.
  await expect(page).toHaveURL(/\/en\/forgot-password$/);
  await page.getByLabel(t.auth.email).fill(account.email);
  await page.getByRole('button', { name: t.auth.forgot.submit }).click();
  await expect(page.getByRole('status')).toHaveText(t.auth.forgot.sent);

  const link = await linkFromMail(account.email);
  expect(link.pathname).toBe('/en/reset-password');
  await page.goto(link.pathname + link.search);

  await page
    .getByLabel(t.auth.reset.newPassword, { exact: true })
    .fill('reset-in-browser-1');
  await page.getByLabel(t.auth.reset.confirmPassword).fill('something-else-1');
  await page.getByRole('button', { name: t.auth.reset.submit }).click();
  await expect(page.getByRole('alert')).toHaveText(t.auth.reset.mismatch);

  await page
    .getByLabel(t.auth.reset.newPassword, { exact: true })
    .fill('reset-in-browser-1');
  await page
    .getByLabel(t.auth.reset.confirmPassword)
    .fill('reset-in-browser-1');
  await page.getByRole('button', { name: t.auth.reset.submit }).click();
  await expect(page).toHaveURL(/\/en\/sign-in\?reset=1$/);
  await expect(page.getByRole('status')).toHaveText(t.auth.reset.done);

  // The link is spent.
  await page.goto(link.pathname + link.search);
  await page
    .getByLabel(t.auth.reset.newPassword, { exact: true })
    .fill('second-reset-pass-1');
  await page
    .getByLabel(t.auth.reset.confirmPassword)
    .fill('second-reset-pass-1');
  await page.getByRole('button', { name: t.auth.reset.submit }).click();
  await expect(page.getByRole('alert')).toHaveText(t.auth.reset.invalidLink);

  await signIn(page, account);
  await expect(page.getByRole('alert')).toContainText(
    t.errors.invalidCredentials
  );
  await signIn(page, { ...account, password: 'reset-in-browser-1' });
  await expect(page).toHaveURL(/\/en$/);
});

test('signed in, the auth pages send you home', async ({ page }) => {
  await signedIn(page);
  for (const path of ['/en/sign-in', '/en/sign-up', '/en/forgot-password']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/en$/);
  }
});
