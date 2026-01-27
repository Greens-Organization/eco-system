import { timestamp } from 'drizzle-orm/pg-core';

export const gTimestamp = (name = 'timestamp') =>
  timestamp(name, {
    mode: 'date',
  });
