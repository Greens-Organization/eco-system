import { timestamp } from 'drizzle-orm/pg-core';

export const updatedAt = (name = 'updated_at') =>
  timestamp(name, { mode: 'date' })
    .$defaultFn(() => new Date())
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull();
