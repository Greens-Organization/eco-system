import { timestamp } from 'drizzle-orm/pg-core';

export const createdAt = (name = 'created_at') =>
  timestamp(name, { mode: 'date' })
    .$defaultFn(() => new Date())
    .notNull();
