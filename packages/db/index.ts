import 'server-only';

import { PrismaNeon } from '@prisma/adapter-neon';
import { chaves } from './chaves';
import { PrismaClient } from './generated/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const connectionString = chaves().DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });

export const database = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = database;
}

export * from './generated/client';
