/**
 * Stands in for the CSP nonce in server-rendered markup. Kit replaces
 * `%sveltekit.nonce%` only in app.html, and components cannot read the
 * nonce, so a component that needs one (ModeWatcher's inline script)
 * renders this and `injectCspNonce` (server) swaps in the real value.
 */
export const CSP_NONCE_PLACEHOLDER = '__csp_nonce_placeholder__';
