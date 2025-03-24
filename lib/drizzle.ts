import {
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// This assumes you have a POSTGRES_URL environment variable set
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// Original sample table (renamed from profiles to UsersTable as per your request)
export const UsersTable = pgTable(
  'profiles', // Keeping the original table name as 'profiles' based on the sample
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    image: text('image').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (users) => {
    return {
      uniqueIdx: uniqueIndex('unique_idx').on(users.email),
    };
  }
);

export type SampleUser = InferSelectModel<typeof UsersTable>;
export type NewSampleUser = InferInsertModel<typeof UsersTable>;

// New 'users' table for signup information
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    username: text('username').notNull(),
    email: text('email').notNull(),
    password: text('password').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (users) => {
    return {
      uniqueEmailIdx: uniqueIndex('unique_email_idx').on(users.email),
      uniqueUsernameIdx: uniqueIndex('unique_username_idx').on(users.username),
    };
  }
);

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Connect to Postgres
export const db = drizzle(sql);