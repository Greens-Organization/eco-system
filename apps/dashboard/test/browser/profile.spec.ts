import { expect, newDevice, signedIn, signIn, t, test, totp } from './fixtures';

test('rename shows up in the profile and the user menu', async ({ page }) => {
  await signedIn(page);
  await page.goto('/en/profile');
  await page.getByLabel(t.profile.name, { exact: true }).fill('Ada Lovelace');
  await page.getByRole('button', { name: t.profile.edit.save }).click();
  await expect(page.getByText(t.profile.edit.saved).first()).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Ada Lovelace' })
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Ada Lovelace' })
  ).toBeVisible();
});

test('a new password keeps this device in and signs the other out', async ({
  page,
  browser,
}) => {
  const account = await signedIn(page);
  const phone = await newDevice(browser);
  await signIn(phone, account);
  await expect(phone).toHaveURL(/\/en$/);

  await page.goto('/en/profile');
  await page.getByLabel(t.settings.password.current).fill('wrong-password-1');
  await page.getByLabel(t.settings.password.new).fill('changed-password-1');
  await page.getByRole('button', { name: t.settings.password.submit }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  await page.getByLabel(t.settings.password.current).fill(account.password);
  await page.getByLabel(t.settings.password.new).fill('changed-password-1');
  await page.getByRole('button', { name: t.settings.password.submit }).click();
  await expect(page.getByText(t.settings.password.done).first()).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/en\/profile$/);
  // Data access is refused at once; the page itself follows within the
  // 60 s cookie cache, so the phone goes to sign-in on a data page.
  await phone.goto('/en/customers');
  await expect(phone).toHaveURL(/\/en\/sign-in/);
});

test('devices: sign another device out from the list', async ({
  page,
  browser,
}) => {
  const account = await signedIn(page);
  const phone = await newDevice(browser);
  await signIn(phone, account);
  await expect(phone).toHaveURL(/\/en$/);

  await page.goto('/en/profile');
  const devices = page.getByRole('list', { name: t.settings.devices.title });
  await expect(devices.getByRole('listitem')).toHaveCount(2);
  await expect(devices.getByText(t.settings.devices.thisDevice)).toBeVisible();

  await devices
    .getByRole('button', {
      name: new RegExp(`^${t.settings.devices.signOut}:`),
    })
    .click();
  await expect(
    page.getByText(t.settings.devices.signedOutOne).first()
  ).toBeVisible();
  await expect(devices.getByRole('listitem')).toHaveCount(1);

  await phone.goto('/en/customers');
  await expect(phone).toHaveURL(/\/en\/sign-in/);
});

test('2FA: turn on, sign in with a code, then with a backup code', async ({
  page,
  browser,
}) => {
  test.slow();
  const account = await signedIn(page);
  await page.goto('/en/profile');
  await page.locator('#enable-password').fill(account.password);
  await page.getByRole('button', { name: t.settings.security.enable }).click();

  const secret = (await page.locator('code').innerText()).trim();
  const backupCodes = await page.locator('ul.font-mono li').allInnerTexts();
  expect(backupCodes.length).toBeGreaterThan(0);
  await page.getByLabel(t.settings.security.confirmCode).fill(totp(secret));
  await page.getByRole('button', { name: t.settings.security.confirm }).click();
  await expect(
    page.getByText(t.settings.security.enabled).first()
  ).toBeVisible();
  // Turning it on rotates the session; this device stays in.
  await page.reload();
  await expect(page).toHaveURL(/\/en\/profile$/);

  const laptop = await newDevice(browser);
  await signIn(laptop, account);
  await expect(laptop).toHaveURL(/\/en\/sign-in\/two-factor/);
  await laptop.getByLabel(t.auth.twoFactor.code).fill('000000');
  await laptop.getByRole('button', { name: t.auth.twoFactor.verify }).click();
  await expect(laptop.getByRole('alert')).toContainText(t.errors.invalidCode);
  await laptop.getByLabel(t.auth.twoFactor.code).fill(totp(secret));
  await laptop.getByRole('button', { name: t.auth.twoFactor.verify }).click();
  await expect(laptop).toHaveURL(/\/en$/);

  const tablet = await newDevice(browser);
  await signIn(tablet, account);
  await tablet.getByRole('link', { name: t.auth.twoFactor.useBackup }).click();
  await tablet
    .getByLabel(t.auth.twoFactor.backupCode)
    .fill(backupCodes[0] ?? '');
  await tablet.getByRole('button', { name: t.auth.twoFactor.verify }).click();
  await expect(tablet).toHaveURL(/\/en$/);
});

test('delete account: password required, then everything is gone', async ({
  page,
}) => {
  const account = await signedIn(page);
  await page.goto('/en/profile');

  await page.getByRole('button', { name: t.settings.danger.delete }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByText(t.settings.danger.confirmTitle)).toBeVisible();
  await dialog.getByRole('button', { name: t.common.cancel }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: t.settings.danger.delete }).click();
  await dialog
    .getByPlaceholder(t.settings.security.confirmPassword)
    .fill('wrong-password-1');
  await dialog.getByRole('button', { name: t.settings.danger.confirm }).click();
  // The dialog stays open with the error inside it, not behind the overlay.
  await expect(dialog.getByRole('alert')).toHaveText(t.errors.wrongPassword);
  await expect(page).toHaveURL(/\/en\/profile$/);

  await dialog
    .getByPlaceholder(t.settings.security.confirmPassword)
    .fill(account.password);
  await dialog.getByRole('button', { name: t.settings.danger.confirm }).click();
  await expect(page).toHaveURL(/\/en\/sign-in/);

  await signIn(page, account);
  await expect(page.getByRole('alert')).toContainText(
    t.errors.invalidCredentials
  );
});
