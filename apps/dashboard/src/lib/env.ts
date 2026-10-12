/**
 * Documentation: https://svelte.dev/docs/kit/$env-dynamic-private
 * Similar to $env/static/private, except that it provides access to environment variables that are determined at runtime rather than build time. Values from process.env are available, but only on the server. This module cannot be imported into client-side code.
 */

import { CLIENT_IP_SECRET_MIN_LENGTH } from '@pack/auth/client-ip';
import z from 'zod';
import { env as runtime } from '$env/dynamic/private';

export const env = z
  .object({
    API_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    // Shared with the API: signs the client IP sent with every auth call.
    CLIENT_IP_SECRET: z.string().min(CLIENT_IP_SECRET_MIN_LENGTH),
  })
  .parse(runtime);
