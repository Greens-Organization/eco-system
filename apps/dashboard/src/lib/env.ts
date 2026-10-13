/**
 * Documentation: https://svelte.dev/docs/kit/$env-dynamic-private
 * Similar to $env/static/private, except that it provides access to environment variables that are determined at runtime rather than build time. Values from process.env are available, but only on the server. This module cannot be imported into client-side code.
 */

import { CLIENT_IP_SECRET_MIN_LENGTH } from '@pack/auth/client-ip';
import z from 'zod';
import { building } from '$app/environment';
import { env as runtime } from '$env/dynamic/private';

const schema = z.object({
  API_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  // Shared with the API: signs the client IP sent with every auth call.
  CLIENT_IP_SECRET: z.string().min(CLIENT_IP_SECRET_MIN_LENGTH),
});

export type Env = z.infer<typeof schema>;

// `vite build` imports server modules to analyse the app, with no runtime env
// (an image is built without secrets). Validation runs when the server
// starts instead, and still fails loudly there.
export const env: Env = building ? ({} as Env) : schema.parse(runtime);
