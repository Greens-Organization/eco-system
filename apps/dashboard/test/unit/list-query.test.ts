import { describe, expect, test } from 'bun:test';
import {
  readListQuery,
  toApiQuery,
  withParams,
} from '../../src/lib/list-query';

const STATUSES = ['active', 'pending', 'inactive'] as const;
const url = (search: string) =>
  new URL(`http://dash.test/en/customers${search}`);

describe('readListQuery', () => {
  test('reads page, search and status', () => {
    expect(
      readListQuery(url('?page=3&q=ali&status=pending'), STATUSES)
    ).toEqual({
      page: 3,
      q: 'ali',
      status: 'pending',
    });
  });

  test('drops what the API would reject instead of failing the page', () => {
    expect(
      readListQuery(url('?page=0&status=archived&q=%20%20'), STATUSES)
    ).toEqual({ page: 1 });
    expect(readListQuery(url('?page=abc'), STATUSES)).toEqual({ page: 1 });
    expect(readListQuery(url('?page=2.5'), STATUSES)).toEqual({ page: 1 });
  });
});

describe('withParams', () => {
  test('replaces and removes params, keeping the rest', () => {
    expect(withParams(url('?q=ali&page=3'), { page: 4 })).toBe(
      '/en/customers?q=ali&page=4'
    );
    expect(withParams(url('?q=ali&page=3'), { page: undefined, q: '' })).toBe(
      '/en/customers'
    );
  });
});

describe('toApiQuery', () => {
  test('stringifies for the Hono client and omits empty filters', () => {
    expect(toApiQuery({ page: 2 }, 10)).toEqual({ page: '2', limit: '10' });
    expect(toApiQuery({ page: 1, q: 'x', status: 'active' }, 5)).toEqual({
      page: '1',
      limit: '5',
      q: 'x',
      status: 'active',
    });
  });
});
