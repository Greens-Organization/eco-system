import { hc } from 'hono/client';
import type { AppType } from '@api/main/routes/v1';
import { cookies } from 'next/headers'
import { env } from '@/env';

// Cliente Hono tipado com AppType do backend
// Isso habilita a inferência de tipos end-to-end (tRPC-like)
export const api = hc<AppType>(`${env.API_URL}/v1`, {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const cookieStore = await cookies()
    return fetch(input, {
      ...init,
      headers: {
        ...init?.headers,
        Cookie: cookieStore.toString()
      }
    })
  }
});
