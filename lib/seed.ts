'use server';

import { db, UsersTable, users } from './drizzle'; // Import your Drizzle setup
import { hash } from 'bcrypt';
import { sql } from 'drizzle-orm'; // Import the 'sql' tagged template literal

export async function seed() {
  try {
    console.log('Starting database seeding with Drizzle...');

    // Create 'profiles' table if it doesn't exist (using Drizzle's schema)
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS profiles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          image VARCHAR(255),
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log(`Created "profiles" table`);
    } catch (error) {
      console.warn(`Error creating "profiles" table (it might already exist):`, error);
    }

    const profilesDataToInsert = [
      { name: 'Guillermo Rauch', email: 'rauchg@vercel.com', image: 'https://images.ctfassets.net/e5382hct74si/2P1iOve0LZJRZWUzfXpi9r/9d4d27765764fb1ad7379d7cbe5f1043/ucxb4lHy_400x400.jpg' },
      { name: 'Lee Robinson', email: 'lee@vercel.com', image: 'https://images.ctfassets.net/e5382hct74si/4BtM41PDNrx4z1ml643tdc/7aa88bdde8b5b7809174ea5b764c80fa/adWRdqQ6_400x400.jpg' },
      { name: 'Steven Tey', email: 'stey@vercel.com', image: 'https://images.ctfassets.net/e5382hct74si/4QEuVLNyZUg5X6X4cW4pVH/eb7cd219e21b29ae976277871cd5ca4b/profile.jpg' },
    ];

    const insertedProfiles = await Promise.all(
      profilesDataToInsert.map(async (profile) => {
        try {
          return await db.insert(UsersTable).values(profile).onConflictDoNothing().returning();
        } catch (error) {
          console.error(`Error inserting profile ${profile.email}:`, error);
          return;
        }
      })
    ).then(results => results.flat());
    console.log(`Seeded ${insertedProfiles.length} users in "profiles"`);

    // Create new 'users' table if it doesn't exist (using Drizzle's schema)
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log(`Created "users" table`);
    } catch (error) {
      console.warn(`Error creating "users" table (it might already exist):`, error);
    }

    // Seed initial users for the new 'users' table with hashed passwords
    const initialNewUsers = [
      { username: 'john_doe', email: 'john.doe@example.com', password: await hash('password123', 10) },
      { username: 'jane_smith', email: 'jane.smith@example.com', password: await hash('secure_pass', 10) },
      { username: 'peter_pan', email: 'peter.pan@neverland.com', password: await hash('flyinghigh', 10) },
    ];

    const insertedNewUsersResults = await Promise.all(
      initialNewUsers.map(async (user) => {
        try {
          return await db.insert(users).values(user).onConflictDoNothing().returning();
        } catch (error) {
          console.error(`Error inserting user ${user.email}:`, error);
          return;
        }
      })
    ).then(results => results.flat());
    console.log(`Seeded ${insertedNewUsersResults.length} users in "users"`);

    return {
      insertedProfiles,
      insertedNewUsers: insertedNewUsersResults,
    };
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    // Drizzle manages the connection pool, so you typically don't need to explicitly end the connection here.
    // The postgres client will handle connection management.
    // If you need to close the connection explicitly for some reason, you can do:
    // await (db as any).client.end();
  }
}