import { randomUUIDv7 as generateUUIDv7 } from 'bun';
import { text } from 'drizzle-orm/pg-core';

export const uuidv7 = (name = 'id') =>
  text(name)
    .primaryKey()
    .$defaultFn(() => generateUUIDv7());
