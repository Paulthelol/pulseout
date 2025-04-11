// src/db/schema.ts
import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  index, // Import index
  serial, // Import serial for auto-incrementing IDs if preferred for comments
  uniqueIndex, // Import uniqueIndex for ensuring one like per user/song
  // import { jsonb } from "drizzle-orm/pg-core"; // Keep if needed elsewhere
} from "drizzle-orm/pg-core"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import type { AdapterAccountType } from "next-auth/adapters"



//const connectionString = "postgres://postgres:postgres@localhost:5432/drizzle"
// const pool = postgres(process.env.POSTGRES_URL!, { max: 1 })

// export const db = drizzle(pool)

// --- Existing Tables (Keep As Is) ---

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
})

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index("account_userId_idx").on(account.userId),
  })
)

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (session) => ({
   userIdIdx: index("session_userId_idx").on(session.userId),
}))

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
)

export const authenticators = pgTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: boolean("credentialBackedUp").notNull(),
    transports: text("transports"),
  },
  (authenticator) => ({
    compositePK: primaryKey({
      columns: [authenticator.userId, authenticator.credentialID],
    }),
     userIdIdx: index("authenticator_userId_idx").on(authenticator.userId),
  })
)

export const songs = pgTable("song", {
    id: text("id").primaryKey(), // Spotify's track ID
    name: text("name").notNull(),
    artist: text("artist"),
    album: text("album"),
    coverUrl: text("coverUrl"),
    spotifyUrl: text("spotifyUrl"),
    addedAt: timestamp("addedAt").defaultNow(),
    // Note: likeCount and commentCount are omitted here for simplicity.
    // You would typically calculate these with queries when needed.
    // likeCount: integer("likeCount").default(0).notNull(),
    // commentCount: integer("commentCount").default(0).notNull(),
  }, (song) => ({
     nameIdx: index("song_name_idx").on(song.name),
     artistIdx: index("song_artist_idx").on(song.artist),
     albumIdx: index("song_album_idx").on(song.album),
  }));

// --- NEW LIKES TABLE SCHEMA ---
export const song_likes = pgTable("song_like", {
    // Foreign key referencing the users table
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Foreign key referencing the songs table
    songId: text("songId")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    // Timestamp when the like was created
    likedAt: timestamp("likedAt", { mode: "date" }).defaultNow().notNull(),
  }, (like) => ({
    // Composite primary key to ensure a user can only like a song once
    compoundKey: primaryKey({ columns: [like.userId, like.songId] }),
    // Indexes for efficient querying
    songIdIdx: index("like_songId_idx").on(like.songId), // Good for counting likes on a song
    userIdIdx: index("like_userId_idx").on(like.userId), // Good for finding songs a user liked
  })
);

// --- NEW COMMENTS TABLE SCHEMA ---
export const song_comments = pgTable("song_comment", {
    // Auto-incrementing integer primary key for each comment
    id: serial("id").primaryKey(),
    // Foreign key referencing the users table
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Foreign key referencing the songs table
    songId: text("songId")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    // The actual text content of the comment
    commentText: text("commentText").notNull(),
    // Timestamp when the comment was created
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    // Optional: Timestamp for when the comment was last updated
    // updatedAt: timestamp("updatedAt", { mode: "date" }),
  }, (comment) => ({
    // Indexes for efficient querying
    songIdIdx: index("comment_songId_idx").on(comment.songId), // Good for finding comments for a song
    userIdIdx: index("comment_userId_idx").on(comment.userId), // Good for finding comments by a user
  })
);

// Optional: Define types for selecting/inserting likes and comments if needed elsewhere
// export type SongLike = typeof song_likes.$inferSelect;
// export type NewSongLike = typeof song_likes.$inferInsert;
// export type SongComment = typeof song_comments.$inferSelect;
// export type NewSongComment = typeof song_comments.$inferInsert;