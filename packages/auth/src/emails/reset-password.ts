/** Text of the reset email per dashboard locale; English when unknown. */
const COPY = {
  en: {
    subject: 'Reset your password',
    intro: 'Someone asked to reset the password of your account.',
    action: 'Choose a new password',
    expiry: 'The link works once and expires in one hour.',
    ignore:
      'If it was not you, ignore this email: your password stays the same.',
  },
  pt: {
    subject: 'Redefina sua senha',
    intro: 'Pediram para redefinir a senha da sua conta.',
    action: 'Escolher uma nova senha',
    expiry: 'O link funciona uma vez e expira em uma hora.',
    ignore: 'Se não foi você, ignore este e-mail: sua senha continua a mesma.',
  },
  es: {
    subject: 'Restablece tu contraseña',
    intro: 'Alguien pidió restablecer la contraseña de tu cuenta.',
    action: 'Elegir una nueva contraseña',
    expiry: 'El enlace funciona una vez y vence en una hora.',
    ignore: 'Si no fuiste tú, ignora este correo: tu contraseña sigue igual.',
  },
} as const;

type Locale = keyof typeof COPY;

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * The link to the dashboard's reset page carrying the token. better-auth's
 * own `url` points at `<baseURL>/auth/reset-password/<token>`, a route the
 * dashboard no longer proxies (the API is not public), so the email links
 * straight to the page the request named in `redirectTo`.
 */
export function resetLink(betterAuthUrl: string, token: string): URL | null {
  const callback = new URL(betterAuthUrl).searchParams.get('callbackURL');
  if (!callback) return null;
  const link = new URL(callback);
  link.searchParams.set('token', token);
  return link;
}

/** Subject and HTML in the locale of the page the request came from. */
export function resetEmail(link: URL): { subject: string; html: string } {
  const segment = link.pathname.split('/')[1] ?? '';
  const copy = COPY[(segment in COPY ? segment : 'en') as Locale];
  const href = escapeHtml(link.toString());
  return {
    subject: copy.subject,
    html: `<p>${copy.intro}</p>
<p><a href="${href}">${copy.action}</a></p>
<p>${copy.expiry}</p>
<p>${copy.ignore}</p>`,
  };
}
