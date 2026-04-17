import { PrismaPg } from '@prisma/adapter-pg';
import type { Prisma } from './prisma.client';

export function createPrismaClientOptions(): Prisma.PrismaClientOptions {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is required to configure Prisma. Set DATABASE_URL to your PostgreSQL connection string in the environment or a local .env file before running the app, migrations, or seed.',
    );
  }

  return {
    adapter: new PrismaPg({ connectionString }),
  };
}
