import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    // Use process.env directly inline
    host: process.env.POSTGRES_URL!, // Non-null assertion (!) assumes check passed
    port: 6543, // Standard Supabase pooler port
    user: process.env.POSTGRES_USER!,
    password: process.env.POSTGRES_PASSWORD!,
    database: process.env.POSTGRES_DATABASE || 'postgres', // Default to 'postgres' if not set
    ssl: 'require',
  },
});