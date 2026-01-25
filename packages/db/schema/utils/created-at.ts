import { timestamp } from 'drizzle-orm/pg-core';

/**
 *   createdAt: timestamp('created_at')
   .$defaultFn(() => new Date())
   .notNull(),
 updatedAt: timestamp('updated_at')
   .$defaultFn(() => new Date())
   .$onUpdateFn(() => new Date())
   .notNull(),
 */

export const createdAt = (name = 'created_at') =>
  timestamp(name, { mode: 'date' })
    .$defaultFn(() => new Date())
    .notNull();
