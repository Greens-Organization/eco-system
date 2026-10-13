import { describe, expect, test } from 'bun:test';
import { customersSchemaRes } from '@/main/routes/v1/customers/schema';
import { employeesSchemaRes } from '@/main/routes/v1/employees/schema';
import { buildTestApp, request } from '../helpers/app';
import { authenticate } from '../helpers/auth';

async function signedIn() {
  const app = buildTestApp();
  const { cookie } = await authenticate(app);
  return (path: string) => request(app, path, { cookie });
}

describe('customers list and detail', () => {
  test('pages, with totals', async () => {
    const get = await signedIn();
    const res = await get('/v1/customers?page=2&limit=5');
    const body = customersSchemaRes.parse(await res.json());
    expect(body).toMatchObject({ page: 2, limit: 5, total: 24, pages: 5 });
    expect(body.customers.map((c) => c.id)).toEqual(['6', '7', '8', '9', '10']);
  });

  test('searches name or email, and filters by status', async () => {
    const get = await signedIn();
    const search = customersSchemaRes.parse(
      await (await get('/v1/customers?q=ALICE')).json()
    );
    expect(search.customers.map((c) => c.name)).toEqual(['Alice Johnson']);

    const pending = customersSchemaRes.parse(
      await (await get('/v1/customers?status=pending&limit=100')).json()
    );
    expect(pending.total).toBeGreaterThan(0);
    expect(pending.customers.every((c) => c.status === 'pending')).toBe(true);
  });

  test('a bad query is a 400, not a silent default', async () => {
    const get = await signedIn();
    expect((await get('/v1/customers?limit=1000')).status).toBe(400);
    expect((await get('/v1/customers?status=archived')).status).toBe(400);
    expect((await get('/v1/customers?page=0')).status).toBe(400);
  });

  test('one customer by id; an unknown id is 404', async () => {
    const get = await signedIn();
    const one = await get('/v1/customers/1');
    expect(one.status).toBe(200);
    expect(((await one.json()) as { name: string }).name).toBe('Alice Johnson');
    expect((await get('/v1/customers/999')).status).toBe(404);
  });
});

describe('employees list and detail', () => {
  test('search covers role and department too', async () => {
    const get = await signedIn();
    const body = employeesSchemaRes.parse(
      await (await get('/v1/employees?q=design&limit=100')).json()
    );
    expect(body.total).toBeGreaterThan(0);
    expect(
      body.employees.every((e) =>
        `${e.name} ${e.role} ${e.department}`.toLowerCase().includes('design')
      )
    ).toBe(true);
  });

  test('one employee by id; an unknown id is 404', async () => {
    const get = await signedIn();
    expect((await get('/v1/employees/1')).status).toBe(200);
    expect((await get('/v1/employees/999')).status).toBe(404);
  });
});
