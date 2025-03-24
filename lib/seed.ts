'use server';

import postgres from 'postgres';
import {hash} from 'bcrypt';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function seed() {
  try {
    console.log('Starting database seeding...');

    // Create 'profiles' table (original UsersTable)
    await sql.begin(async (tx) => { // tx is the transaction context from 'postgres'
      await sql`
        CREATE TABLE IF NOT EXISTS profiles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          image VARCHAR(255),
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `; // Use 'sql' to execute the query
    });
    console.log(`Created "profiles" table`);

    const profilesData = await Promise.all([
      sql`
        INSERT INTO profiles (name, email, image)
        VALUES ('Guillermo Rauch', 'rauchg@vercel.com', 'https://images.ctfassets.net/e5382hct74si/2P1iOve0LZJRZWUzfXpi9r/9d4d27765764fb1ad7379d7cbe5f1043/ucxb4lHy_400x400.jpg')
        ON CONFLICT (email) DO NOTHING;
      `,
      sql`
        INSERT INTO profiles (name, email, image)
        VALUES ('Lee Robinson', 'lee@vercel.com', 'https://images.ctfassets.net/e5382hct74si/4BtM41PDNrx4z1ml643tdc/7aa88bdde8b5b7809174ea5b764c80fa/adWRdqQ6_400x400.jpg')
        ON CONFLICT (email) DO NOTHING;
      `,
      sql`
        INSERT INTO profiles (name, email, image)
        VALUES ('Steven Tey', 'stey@vercel.com', 'https://images.ctfassets.net/e5382hct74si/4QEuVLNyZUg5X6X4cW4pVH/eb7cd219e21b29ae976277871cd5ca4b/profile.jpg')
        ON CONFLICT (email) DO NOTHING;
      `,
    ]);
    console.log(`Seeded ${profilesData.length} users in "profiles"`);

    // Create new 'users' table
    await sql.begin(async (tx) => { // tx is the transaction context from 'postgres'
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `; // Use 'sql' to execute the query
    });
    console.log(`Created "users" table`);

    // Seed initial users for the new 'users' table with hashed passwords
    const initialNewUsers = [
      { username: 'john_doe', email: 'john.doe@example.com', password: await hash('password123', 10) },
      { username: 'jane_smith', email: 'jane.smith@example.com', password: await hash('secure_pass', 10) },
      { username: 'peter_pan', email: 'peter.pan@neverland.com', password: await hash('flyinghigh', 10) },
    ];

    const insertedNewUsers = await Promise.all(
      initialNewUsers.map(async (user) => {
        return sql`
          INSERT INTO users (username, email, password)
          VALUES (${user.username}, ${user.email}, ${user.password})
          ON CONFLICT (email) DO NOTHING;
        `;
      })
    );
    console.log(`Seeded ${insertedNewUsers.length} users in "users"`);

    return {
      insertedProfiles: profilesData,
      insertedNewUsers,
    };
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await sql.end();
  }
}