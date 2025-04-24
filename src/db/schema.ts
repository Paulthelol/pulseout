import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  uuid,
  integer,
  varchar,
  index, // Import index
  serial, // Import serial for auto-incrementing IDs if preferred for comments
  uniqueIndex,
  doublePrecision
  // Import uniqueIndex for ensuring one like per user/song
  // import { jsonb } from "drizzle-orm/pg-core"; // Keep if needed elsewhere
} from "drizzle-orm/pg-core"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import type { AdapterAccountType } from "next-auth/adapters"
import {relations} from "drizzle-orm"



//const connectionString = "postgres://postgres:postgres@localhost:5432/drizzle"
// const pool = postgres(process.env.POSTGRES_URL!, { max: 1 })

// export const db = drizzle(pool)

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
    trending_score: doublePrecision("trending_score").default(0.0).notNull(), // Score that decays
    last_decayed_at: timestamp("last_decayed_at", { mode: "date" }), // Optional: Track last decay time
    // Note: likeCount and commentCount are omitted here for simplicity.
    // You would typically calculate these with queries when needed.
    // likeCount: integer("likeCount").default(0).notNull(),
    // commentCount: integer("commentCount").default(0).notNull(),
  }, (song) => ({
     nameIdx: index("song_name_idx").on(song.name),
     artistIdx: index("song_artist_idx").on(song.artist),
     albumIdx: index("song_album_idx").on(song.album),
     trendingScoreIdx: index("song_trending_score_idx").on(song.trending_score), // For ordering trending songs
  }));


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

    // --- NEW: Comments Table ---
    export const comments = pgTable('comment', {
      // Use defaultRandom() to generate UUIDs automatically on insertion
      id: uuid('id').defaultRandom().primaryKey(),
      content: text('content').notNull(),
      // Assuming song IDs are strings (like Spotify IDs). Adjust length as needed.
      songId: varchar('song_id', { length: 255 }).notNull(),
      // Foreign key linking to the user who posted the comment
      userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // Cascade delete comments if user is deleted
      // Self-referencing foreign key for replies (links to another comment's ID)
      parentId: uuid('parent_id').references((): any => comments.id, { onDelete: 'cascade' }), // Cascade delete replies if parent comment is deleted
      // Timestamp automatically set to the time of creation
      createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
      // Optional: Denormalized like count for quicker reads.
      // You would need to update this via triggers or within your like/unlike actions.
      // likesCount: integer('likes_count').default(0).notNull(),
  }, (table) => {
      // Indexes to speed up common queries
      return {
          songIdIdx: index('comment_song_id_idx').on(table.songId), // Index on songId
          userIdx: index('comment_user_id_idx').on(table.userId), // Index on userId
          parentIdIdx: index('comment_parent_id_idx').on(table.parentId), // Index on parentId (for fetching replies)
      };
  });

  // --- NEW: Comment Likes Table ---
  // Junction table to track which user liked which comment
  export const commentLikes = pgTable('comment_like', {
      // Foreign key linking to the user who liked the comment
      userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
      // Foreign key linking to the comment that was liked
      commentId: uuid('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
      // Timestamp automatically set to the time the like was created
      createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  }, (table) => {
      // Define a composite primary key to ensure a user can only like a specific comment once.
      return {
          pk: primaryKey({ columns: [table.userId, table.commentId] }),
          // Optional index for querying likes by commentId if needed frequently
          commentIdIdx: index('comment_like_comment_id_idx').on(table.commentId),
      };
  });


  // --- Relations Definitions ---
  // Define how tables relate to each other for easier querying with Drizzle ORM.

  // Relations for the users table
  export const usersRelations = relations(users, ({ many }) => ({
      // One user can have many accounts (OAuth providers)
      accounts: many(accounts),
      // One user can have many active sessions
      sessions: many(sessions),
      // One user can post many comments
      comments: many(comments),
      // One user can like many comments
      commentLikes: many(commentLikes),
  }));

  // Relations for the accounts table
  export const accountsRelations = relations(accounts, ({ one }) => ({
      // Each account belongs to one user
      user: one(users, {
          fields: [accounts.userId],
          references: [users.id],
      }),
  }));

  // Relations for the sessions table
  export const sessionsRelations = relations(sessions, ({ one }) => ({
      // Each session belongs to one user
      user: one(users, {
          fields: [sessions.userId],
          references: [users.id],
      }),
  }));

  // Relations for the comments table
  export const commentsRelations = relations(comments, ({ one, many }) => ({
      // Each comment belongs to one user
      user: one(users, {
          fields: [comments.userId],
          references: [users.id],
      }),
      // Each comment (reply) can have one parent comment
      parent: one(comments, {
          fields: [comments.parentId], // The column in this table (comments) that holds the foreign key
          references: [comments.id],   // The column in the related table (comments) that it references
          relationName: 'comment_replies', // Explicit name for the self-referencing relation
      }),
      // Each comment can have many replies (other comments referencing it as parent)
      replies: many(comments, {
          relationName: 'comment_replies', // Must match the 'one' side's relationName
      }),
      // Each comment can have many likes
      likes: many(commentLikes),
  }));

  // Relations for the commentLikes table
  export const commentLikesRelations = relations(commentLikes, ({ one }) => ({
      // Each like record belongs to one comment
      comment: one(comments, {
          fields: [commentLikes.commentId],
          references: [comments.id],
      }),
      // Each like record belongs to one user
      user: one(users, {
          fields: [commentLikes.userId],
          references: [users.id],
      }),
  }));