import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './src/shared/database/drizzle/schema.ts',
  out: './src/shared/database/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
