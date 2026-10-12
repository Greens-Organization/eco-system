import { index, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, gTimestamp, updatedAt, uuidv7 } from '../utils';

export const verification = pgTable(
  'verification',
  {
    id: uuidv7(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: gTimestamp('expires_at').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)]
);
