import { CLIENT_IP_SECRET_MIN_LENGTH } from '@pack/auth/client-ip';
import { defineEnvVars } from '@sveltejs/kit/env';
import z from 'zod';
import { building } from '$app/env';

/**
 * The dashboard's runtime config, read through `$app/env/private`. Kit
 * validates it when the server starts and fails loudly. `vite build` runs
 * the app to analyse it with no env (images carry no secrets), so each
 * variable is optional only then.
 */
const required = <T extends z.ZodType>(schema: T) =>
  building ? schema.optional() : schema;

export const variables = defineEnvVars({
  API_URL: { schema: required(z.url()) },
  BETTER_AUTH_SECRET: { schema: required(z.string().min(32)) },
  // Shared with the API: signs the client IP sent with every auth call.
  CLIENT_IP_SECRET: {
    schema: required(z.string().min(CLIENT_IP_SECRET_MIN_LENGTH)),
  },
});
