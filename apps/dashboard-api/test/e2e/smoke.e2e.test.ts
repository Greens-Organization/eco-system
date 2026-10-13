import { describe, expect, test } from 'bun:test';
import { buildTestApp } from './helpers/app';

// Sanidade do harness: o app real sobe e responde. Se isto quebra, o problema é
// o ambiente (env/migrate/container), não a feature sob teste.
describe('e2e harness smoke', () => {
  test('app boots and /status responds 200', async () => {
    const app = buildTestApp();
    const res = await app.request('/status');
    expect(res.status).toBe(200);
  });
});
