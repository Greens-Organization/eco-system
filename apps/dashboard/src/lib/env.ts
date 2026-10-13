import {
  API_URL,
  BETTER_AUTH_SECRET,
  CLIENT_IP_SECRET,
} from '$app/env/private';

/** Validated in src/env.ts; only absent while `vite build` analyses the app. */
export const env = {
  API_URL: API_URL as string,
  BETTER_AUTH_SECRET: BETTER_AUTH_SECRET as string,
  CLIENT_IP_SECRET: CLIENT_IP_SECRET as string,
};
