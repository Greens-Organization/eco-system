import { relations } from 'drizzle-orm';
import { index, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, gTimestamp, updatedAt, uuidv7 } from '../utils';
import { user } from './User';

export const session = pgTable(
  'session',
  {
    id: uuidv7(),
    expiresAt: gTimestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)]
);

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));
