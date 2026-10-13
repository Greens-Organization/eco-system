import { describe, expect, test } from 'bun:test';
import { resetEmail, resetLink } from '../src/emails/reset-password';

const betterAuthUrl = (callback: string) =>
  `https://app.test/auth/reset-password/tok123?callbackURL=${encodeURIComponent(callback)}`;

describe('resetLink', () => {
  test('points at the page from redirectTo, carrying the token', () => {
    const link = resetLink(
      betterAuthUrl('https://app.test/pt/reset-password'),
      'tok123'
    );
    expect(link?.toString()).toBe(
      'https://app.test/pt/reset-password?token=tok123'
    );
  });

  test('no redirectTo, no link', () => {
    expect(
      resetLink('https://app.test/auth/reset-password/tok?callbackURL=', 'tok')
    ).toBeNull();
  });
});

describe('resetEmail', () => {
  test('speaks the language of the page that asked', () => {
    expect(
      resetEmail(new URL('https://app.test/pt/reset-password?token=t')).subject
    ).toBe('Redefina sua senha');
    expect(
      resetEmail(new URL('https://app.test/es/reset-password?token=t')).subject
    ).toBe('Restablece tu contraseña');
    expect(
      resetEmail(new URL('https://app.test/xx/reset-password?token=t')).subject
    ).toBe('Reset your password');
  });

  test('escapes the link inside the HTML', () => {
    const { html } = resetEmail(
      new URL('https://app.test/en/reset-password?token=a"b&c=1')
    );
    expect(html).not.toContain('a"b');
    expect(html).toContain('&amp;c=1');
  });
});
