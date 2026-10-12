import { relations } from 'drizzle-orm';
import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt, uuidv7 } from '../utils';
import { account } from './account';
import { session } from './session';
import { twoFactor } from './two-factor';

export const user = pgTable('user', {
  id: uuidv7(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  twoFactors: many(twoFactor),
}));
