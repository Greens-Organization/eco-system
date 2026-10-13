// Relative, not $lib: plain `bun test` (no Vite) resolves this module.
import { CSP_NONCE_PLACEHOLDER } from '../csp';

/** Headers every dashboard response carries, on top of Kit's CSP. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'x-content-type-options': 'nosniff',
  // For browsers that predate CSP frame-ancestors.
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

/**
 * Put the nonce Kit generated for this response (from its CSP header) where
 * the placeholder was rendered. Only HTML is touched; anything else, or HTML
 * without a nonce, comes back as it was.
 */
export async function injectCspNonce(response: Response): Promise<Response> {
  if (!response.headers.get('content-type')?.startsWith('text/html')) {
    return response;
  }
  const csp = response.headers.get('content-security-policy') ?? '';
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  if (!nonce) return response;

  const html = await response.text();
  if (!html.includes(CSP_NONCE_PLACEHOLDER)) {
    return new Response(html, response);
  }
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html.replaceAll(CSP_NONCE_PLACEHOLDER, nonce), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
