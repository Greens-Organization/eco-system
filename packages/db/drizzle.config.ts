import { defineConfig } from 'drizzle-kit';
import { connectionString } from './pack-env';

export default defineConfig({
  schema: './schema/**/*',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
});
