import { relations } from 'drizzle-orm';
import { boolean, index, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { gTimestamp, uuidv7 } from '../utils';
import { user } from './user';

/** better-auth `twoFactor` plugin: one TOTP secret per user (encrypted). */
export const twoFactor = pgTable(
  'two_factor',
  {
    id: uuidv7(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // false until the user confirms a code from the authenticator app.
    verified: boolean('verified').default(true).notNull(),
    failedVerificationCount: integer('failed_verification_count')
      .default(0)
      .notNull(),
    lockedUntil: gTimestamp('locked_until'),
  },
  (table) => [
    index('twoFactor_secret_idx').on(table.secret),
    index('twoFactor_userId_idx').on(table.userId),
  ]
);

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id],
  }),
}));
