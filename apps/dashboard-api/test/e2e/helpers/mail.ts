// Mailpit (docker-compose.test.yml) HTTP API: what the API really sent.
const MAILPIT = 'http://localhost:8025/api/v1';

type Summary = { ID: string; To: { Address: string }[]; Subject: string };

export async function clearMail(): Promise<void> {
  await fetch(`${MAILPIT}/messages`, { method: 'DELETE' });
}

/** Messages sent to `address`, newest first. */
export async function mailTo(address: string): Promise<Summary[]> {
  const res = await fetch(`${MAILPIT}/messages?limit=50`);
  const { messages } = (await res.json()) as { messages: Summary[] };
  return messages.filter((m) =>
    m.To.some((to) => to.Address.toLowerCase() === address.toLowerCase())
  );
}

/** Wait for a message to `address` (sending is not awaited by the API). */
export async function waitForMail(
  address: string,
  timeoutMs = 5000
): Promise<{ subject: string; html: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const [latest] = await mailTo(address);
    if (latest) {
      const res = await fetch(`${MAILPIT}/message/${latest.ID}`);
      const body = (await res.json()) as { Subject: string; HTML: string };
      return { subject: body.Subject, html: body.HTML };
    }
    await Bun.sleep(100);
  }
  throw new Error(`no mail to ${address} within ${timeoutMs} ms`);
}
