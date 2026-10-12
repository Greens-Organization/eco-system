// Hop-by-hop headers describe one connection and must not be forwarded.
// `host` is dropped so fetch sets the upstream host itself.
const DROP_REQUEST = [
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
];

// fetch already decoded the body, so the upstream encoding and length no
// longer describe it.
const DROP_RESPONSE = [
  'content-encoding',
  'content-length',
  'transfer-encoding',
];

type Fetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

/**
 * Forward `request` to `target` and return a response the rest of the hook
 * chain may modify. Under Node (undici) the headers of a `fetch` response are
 * immutable, so handing it back directly makes any later
 * `response.headers.set` throw `TypeError: immutable`.
 */
export async function proxyRequest(
  request: Request,
  target: string,
  {
    requestId,
    fetch: fetchImpl = fetch,
  }: { requestId?: string; fetch?: Fetch } = {}
): Promise<Response> {
  const headers = new Headers(request.headers);
  for (const name of DROP_REQUEST) headers.delete(name);
  if (requestId) headers.set('x-request-id', requestId);

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const upstream = await fetchImpl(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
    // @ts-expect-error — duplex is required for streaming bodies, missing from RequestInit
    duplex: 'half',
  });

  const responseHeaders = new Headers(upstream.headers);
  for (const name of DROP_RESPONSE) responseHeaders.delete(name);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
