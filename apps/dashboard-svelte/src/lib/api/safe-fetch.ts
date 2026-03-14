import type { ClientResponse } from 'hono/client'

type Success<T> = { success: true; data: T }
type Failure = { success: false; error: string; status: number }
type Result<T> = Success<T> | Failure

async function failure(res: Response): Promise<Failure> {
  let message = 'Internal server error'
  try {
    const json = await res.json()
    message = json?.message ?? json?.error ?? message
  } catch {
    // ignore
  }
  return { success: false, error: message, status: res.status }
}

async function success<T>(res: Response): Promise<Success<T>> {
  const body = await res.json()
  return { success: true, data: body as T }
}

export async function safeFetch<T>(request: Promise<ClientResponse<T>>): Promise<Result<T>> {
  try {
    const res = await request
    if (!res.ok) return failure(res)
    return success<T>(res)
  } catch {
    return { success: false, error: 'Internal server error', status: 500 }
  }
}
