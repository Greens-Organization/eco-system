import { describe, expect, test } from 'bun:test';
import { listPage } from '../../src/main/infra/listing';

const items = Array.from({ length: 23 }, (_, i) => ({
  name: `Person ${i + 1}`,
  status: i % 2 ? 'inactive' : 'active',
}));
const byName = (item: { name: string }) => [item.name];

describe('listPage', () => {
  test('cuts the requested page and reports the totals', () => {
    const page = listPage(items, { page: 3, limit: 10 }, byName);
    expect(page.items.map((i) => i.name)).toEqual([
      'Person 21',
      'Person 22',
      'Person 23',
    ]);
    expect(page).toMatchObject({ total: 23, page: 3, limit: 10, pages: 3 });
  });

  test('a page past the end is empty, not an error', () => {
    expect(listPage(items, { page: 9, limit: 10 }, byName).items).toEqual([]);
  });

  test('search is case-insensitive and counts only matches', () => {
    const page = listPage(items, { page: 1, limit: 10, q: 'PERSON 2' }, byName);
    expect(page.total).toBe(5); // 2, 20, 21, 22, 23
  });

  test('status narrows before paging', () => {
    const page = listPage(
      items,
      { page: 1, limit: 50, status: 'inactive' },
      byName
    );
    expect(page.total).toBe(11);
    expect(page.items.every((i) => i.status === 'inactive')).toBe(true);
  });

  test('no match still reports one (empty) page', () => {
    const page = listPage(items, { page: 1, limit: 10, q: 'nobody' }, byName);
    expect(page).toMatchObject({ items: [], total: 0, pages: 1 });
  });
});
