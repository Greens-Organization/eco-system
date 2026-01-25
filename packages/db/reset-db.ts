import { reset } from 'drizzle-seed';
import { db } from '.';
import * as schema from './schema';

if (process.env.NODE_ENV === 'local') {
  console.log('Initializing database reset...');

  await reset(db, schema);

  console.log('Reset completed!');
} else {
  console.error(
    `THIS SCRIPT CAN NOT BE EXECUTED ON "${process.env.NODE_ENV?.toUpperCase()}" ENVIRONMENT!`
  );
  process.exit(1);
}

process.exit(0);
