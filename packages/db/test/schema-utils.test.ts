import { describe, expect, test } from 'bun:test';
import { getTableConfig, pgTable } from 'drizzle-orm/pg-core';
import { createdAt } from '../schema/utils/created-at';
import { gTimestamp } from '../schema/utils/generic-timestamp';
import { updatedAt } from '../schema/utils/updated-at';
import { uuidv7 } from '../schema/utils/uuid-v7';

const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Built through `pgTable` + `getTableConfig` rather than reading the builder's
// `config` directly, which drizzle marks protected.
const table = pgTable('probe', {
  id: uuidv7(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: gTimestamp('deleted_at'),
  renamed: uuidv7('uuid'),
});

const columns = new Map(getTableConfig(table).columns.map((c) => [c.name, c]));
const column = (name: string) => {
  const found = columns.get(name);
  if (!found) throw new Error(`column ${name} not found`);
  return found;
};

describe('schema/utils column helpers', () => {
  test('uuidv7 is the primary key and generates a v7 uuid', () => {
    const id = column('id');
    expect(id.primary).toBe(true);
    expect(String(id.defaultFn?.())).toMatch(UUID_V7);
  });

  test('createdAt defaults to now and is not null', () => {
    const col = column('created_at');
    expect(col.notNull).toBe(true);
    expect(col.defaultFn?.()).toBeInstanceOf(Date);
    expect(col.onUpdateFn).toBeUndefined();
  });

  test('updatedAt also refreshes on update', () => {
    const col = column('updated_at');
    expect(col.notNull).toBe(true);
    expect(col.defaultFn?.()).toBeInstanceOf(Date);
    expect(col.onUpdateFn?.()).toBeInstanceOf(Date);
  });

  test('gTimestamp is nullable with no default', () => {
    const col = column('deleted_at');
    expect(col.notNull).toBe(false);
    expect(col.defaultFn).toBeUndefined();
  });

  test('a custom column name is honoured', () => {
    expect(columns.has('uuid')).toBe(true);
    expect(column('uuid').primary).toBe(true);
  });
});
