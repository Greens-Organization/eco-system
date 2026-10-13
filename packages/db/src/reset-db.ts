import { reset } from 'drizzle-seed';
import { connectionString } from '../pack-env';
import * as schema from '../schema';
import { db, disconnectDatabase } from '.';
import { resetRefusal } from './reset-guard';

const refusal = resetRefusal(connectionString, process.env.NODE_ENV);
if (refusal) {
  console.error(`db:reset refused: ${refusal}.`);
  process.exit(1);
}

console.log('Initializing data reset...');
await reset(db, schema);
await disconnectDatabase();
console.log('Data reset completed!');
