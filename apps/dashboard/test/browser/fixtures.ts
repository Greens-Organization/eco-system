import { createHmac, randomInt, randomUUID } from 'node:crypto';
import {
  type Browser,
  test as base,
  expect,
  type Page,
} from '@playwright/test';
import en from '../../../../packages/i18n/dictionaries/en.json' with {
  type: 'json',
};
import { MAILPIT } from './stack';

/** The English copy, so a wording change does not break a selector. */
export const t = en.app;

export type Account = { name: string; email: string; password: string };

export const newAccount = (): Account => ({
  name: 'Browser Tester',
  email: `browser-${randomUUID().slice(0, 8)}@e2e.test`,
  password: 'browser-password-1',
});

const randomIp = () =>
  `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;

/**
 * Every test (and every extra device) is its own client IP, sent in the
 * header the dashboard is told to trust (stack.ts). Any CSP violation or
 * uncaught page error fails the test.
 */
export const test = base.extend<{ cspGuard: undefined }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright reads fixture dependencies from this pattern and rejects any other first argument.
  extraHTTPHeaders: async ({}, use) => {
    await use({ 'x-forwarded-for': randomIp() });
  },
  cspGuard: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('console', (msg) => {
        if (
          msg.type() === 'error' &&
          /Content Security Policy/i.test(msg.text())
        ) {
          problems.push(msg.text());
        }
      });
      page.on('pageerror', (err) => problems.push(err.message));
      await use(undefined);
      expect(problems).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** A second browser: own cookies, own IP. */
export async function newDevice(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    extraHTTPHeaders: { 'x-forwarded-for': randomIp() },
  });
  return context.newPage();
}

export async function signUp(page: Page, account: Account) {
  await page.goto('/en/sign-up');
  await page.getByLabel(t.auth.name).fill(account.name);
  await page.getByLabel(t.auth.email).fill(account.email);
  await page.getByLabel(t.auth.password).fill(account.password);
  await page.getByRole('button', { name: t.auth.signUp.title }).click();
  await expect(page).toHaveURL(/\/en\/sign-in$/);
}

export async function signIn(page: Page, account: Account) {
  await page.goto('/en/sign-in');
  await page.getByLabel(t.auth.email).fill(account.email);
  await page
    .getByLabel(t.auth.password, { exact: true })
    .fill(account.password);
  await page.getByRole('button', { name: t.auth.signIn.title }).click();
}

/** A fresh account, signed in, on the home page. */
export async function signedIn(page: Page): Promise<Account> {
  const account = newAccount();
  await signUp(page, account);
  await signIn(page, account);
  await expect(page).toHaveURL(/\/en$/);
  return account;
}

function base32(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of input.toUpperCase()) {
    bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  }
  return Buffer.from(
    (bits.match(/.{8}/g) ?? []).map((b) => Number.parseInt(b, 2))
  );
}

/** RFC 6238 (SHA-1, 6 digits, 30 s): what an authenticator app shows now. */
export function totp(secret: string): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const h = createHmac('sha1', base32(secret)).update(counter).digest();
  const offset = (h.at(-1) ?? 0) & 0xf;
  return ((h.readUInt32BE(offset) & 0x7fffffff) % 1_000_000)
    .toString()
    .padStart(6, '0');
}

/** The first link in the newest mail to `address` (sending is async). */
export async function linkFromMail(address: string): Promise<URL> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const res = await fetch(
      `${MAILPIT}/search?query=${encodeURIComponent(`to:${address}`)}`
    );
    const { messages } = (await res.json()) as { messages: { ID: string }[] };
    const [latest] = messages;
    if (latest) {
      const mail = await fetch(`${MAILPIT}/message/${latest.ID}`);
      const { HTML } = (await mail.json()) as { HTML: string };
      const href = /href="([^"]+)"/.exec(HTML)?.[1];
      if (href) return new URL(href.replaceAll('&amp;', '&'));
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no mail to ${address}`);
}
