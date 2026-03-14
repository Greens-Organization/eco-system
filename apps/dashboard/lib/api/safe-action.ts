"use server"

import type { ClientResponse } from 'hono/client';
import { failure, success } from '@/lib/api/either-fetch';

export async function safeFetch<T>(
  request: Promise<ClientResponse<T>>
) {
  try {
    const res = await request;

    if (!res.ok) {
      return await failure(res);
    }

    return await success<T>(res);
  } catch (error) {
    return {
      success: false as const,
      error: 'Internal server error',
      status: 500,
    };
  }
}
