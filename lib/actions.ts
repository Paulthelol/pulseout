// written by: Paul
  // tested by: Paul, Andrew, Jordan, Others...
'use server';

import { signIn, signOut, auth } from '@/auth';
import { AuthError } from 'next-auth';
import { searchSpotifyTracks } from '@/lib/spotify';
import { db } from '@/src/db'; // Import your db instance
import { songs, song_likes, comments, commentLikes, users } from '@/src/db/schema'; // Import table schemas
import { eq, sql, and, desc, count, gt, asc, isNull, inArray } from 'drizzle-orm'; // Import eq, sql, and, desc, count
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache'; // Import noStore
import { z } from "zod";
import { TicketX } from 'lucide-react';

// --- Types ---
interface SongData {
  id: string;
  name: string;
  artist: string | null;
  album: string | null;
  coverUrl: string | null;
  spotifyUrl: string | null;
}
type Song = typeof songs.$inferSelect;
// Add type for song with like info
interface SongWithLikeInfo extends Song {
  likeCount: number;
  userHasLiked: boolean;
}


export async function authenticateSpotify(
  prevState: string | undefined,
  formData: FormData,
) {
  console.log('authenticateSpotify Server Action called!');
  try {
    await signIn('spotify', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      console.error('Error during signIn:', error);
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          throw error; // Rethrow other auth errors
      }
    }
    console.error('Non-AuthError during signIn:', error);
    throw error; // Rethrow non-AuthError errors
  }
}

export async function authenticateGoogle() {
  console.log('authenticateGoogle Server Action called!');
  try {
    await signIn('google');
  } catch (error) {
    if (error instanceof AuthError) {
      console.error('Error during signIn:', error);
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          throw error; // Rethrow other auth errors
      }
    }
    console.error('Non-AuthError during signIn:', error);
    throw error; // Rethrow non-AuthError errors
  }
}

export async function SignOut() {
  await signOut({ redirectTo: '/login' });
}

export async function searchSpotifyAction(query: string): Promise<{ data?: any; error?: string }> {
  noStore(); // Prevent caching of search results

  const results = await searchSpotifyTracks(query);

  if (results && results.error) {
    return { error: results.error };
  }

  return { data: results };
}


// --- Action: Save Song to Database ---

/**
 * Saves song data to the database if it doesn't already exist.
 * Uses ON CONFLICT DO NOTHING to handle existing entries gracefully.
 * @param songData - The data for the song to save.
 * @returns Object indicating success or error.
 */
export async function saveSongAction(songData: SongData): Promise<{ success: boolean; error?: string; songId?: string }> {
  if (!songData || !songData.id || !songData.name) {
    return { success: false, error: 'Invalid song data provided.' };
  }

  try {
    console.log(`Attempting to save song: ${songData.name} (${songData.id})`);
    const dataToInsert = {
      id: songData.id,
      name: songData.name,
      artist: songData.artist,
      album: songData.album,
      coverUrl: songData.coverUrl,
      spotifyUrl: songData.spotifyUrl,
    };
    await db
      .insert(songs)
      .values(dataToInsert)
      .onConflictDoNothing({ target: songs.id });

    console.log(`Song saved or already exists: ${songData.id}`);

    return { success: true, songId: songData.id };

  } catch (error) {
    console.error(`Error saving song ${songData.id}:`, error);
    return { success: false, error: 'Database error saving song.' };
  }
}

// --- ACTION: Get Song By ID with Like Info ---

/**
 * Fetches a single song from the database by its ID, including like count
 * and whether the current user has liked it.
 * @param songId - The Spotify ID of the song.
 * @returns Object containing the song data or an error.
 */
export async function getSongWithLikeInfoAction(songId: string): Promise<{ data?: SongWithLikeInfo | null; error?: string }> {
  noStore();
  if (!songId) {
    return { error: 'Song ID is required.' };
  }

  const session = await auth(); // Get current session/user
  const userId = session?.user?.id; // Get user ID, might be undefined if not logged in

  try {
    // Query to get the song details and the like count separately for clarity
    // Fetch Song Details
    const songResult = await db.select()
      .from(songs)
      .where(eq(songs.id, songId))
      .limit(1);

    const songDetails = songResult[0];

    if (!songDetails) {
      return { error: 'Song not found in database.' };
    }

    // Fetch Like Count
    const likeCountResult = await db.select({
      count: count(song_likes.userId) // Use Drizzle's count
    })
      .from(song_likes)
      .where(eq(song_likes.songId, songId));

    const likeCount = likeCountResult[0]?.count ?? 0;

    // Check if the current user has liked the song
    let userHasLiked = false;
    if (userId) {
      const userLikeResult = await db.select({ id: song_likes.userId })
        .from(song_likes)
        .where(and(eq(song_likes.songId, songId), eq(song_likes.userId, userId)))
        .limit(1);
      userHasLiked = userLikeResult.length > 0;
    }

    // Construct the final object matching SongWithLikeInfo
    const songData: SongWithLikeInfo = {
      ...songDetails, // Spread the fetched song details
      likeCount: likeCount,
      userHasLiked: userHasLiked,
    };

    return { data: songData }; // Return the correctly typed object

  } catch (error) {
    console.error(`Error fetching song ${songId} with like info:`, error);
    return { error: 'Database error fetching song details.' };
  }
}


// --- ACTION: Toggle Like on a Song ---

/**
 * Adds or removes a like for a given song by the current user.
 * @param songId - The ID of the song to like/unlike.
 * @returns Object indicating the new like status and count, or an error.
 */
export async function toggleLikeSongAction(songId: string): Promise<{ liked?: boolean; likeCount?: number; error?: string }> {
  noStore();
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { error: 'Authentication required to like songs.' };
  }
  if (!songId) {
    return { error: 'Song ID is required.' };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const existingLike = await tx.select({ id: song_likes.userId })
        .from(song_likes)
        .where(and(eq(song_likes.userId, userId), eq(song_likes.songId, songId)))
        .limit(1);

      let currentlyLiked: boolean;

      if (existingLike.length > 0) {
        // --- Unlike ---
        await tx.delete(song_likes)
          .where(and(eq(song_likes.userId, userId), eq(song_likes.songId, songId)));
        currentlyLiked = false;
        console.log(`User ${userId} unliked song ${songId}`);

        // Decrement trending_score, ensuring it doesn't go below 0
        await tx.update(songs)
          .set({ trending_score: sql`${songs.trending_score} - 1` })
          .where(and(
            eq(songs.id, songId),
            gt(songs.trending_score, 0) // Only decrement if score > 0
          ));

      } else {
        // --- Like ---
        await tx.insert(song_likes)
          .values({ userId: userId, songId: songId })
          .onConflictDoNothing();
        currentlyLiked = true;
        console.log(`User ${userId} liked song ${songId}`);

        // Increment trending_score
        await tx.update(songs)
          .set({ trending_score: sql`${songs.trending_score} + 1` })
          .where(eq(songs.id, songId));
      }

      // Get the new like count
      const countResult = await tx.select({
        count: count(song_likes.userId)
      })
        .from(song_likes)
        .where(eq(song_likes.songId, songId));
      const newLikeCount = countResult[0]?.count ?? 0;

      return { liked: currentlyLiked, likeCount: newLikeCount };
    }); // End transaction

    // Revalidate paths after successful transaction
    revalidatePath(`/musicgrid/${songId}/view`);
    revalidatePath(`/musicgrid/search`);
    revalidatePath(`/musicgrid/trending`);

    return result;

  } catch (error) {
    console.error(`Error toggling like for song ${songId} by user ${userId}:`, error);
    return { error: 'Database error updating like status.' };
  }
}

interface SongWithCountsAndLikeInfo extends Song {
  likeCount: number;
  commentCount: number;
  userHasLiked: boolean;
}

export async function getLikedSongsAction(
  limit: number,
  offset: number
  // --- Return the richer type ---
): Promise<{ data?: SongWithCountsAndLikeInfo[]; error?: string }> {
  noStore();

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { error: 'Authentication required to view liked songs.' };
  }

  if (limit <= 0 || offset < 0) {
    return { error: 'Invalid limit or offset.' };
  }

  try {
    const userLikeSubquery = db.$with('user_like').as(
      db.select({
        songId: song_likes.songId,
        liked: sql<boolean>`true`.as('liked')
      })
        .from(song_likes)
        .where(eq(song_likes.userId, userId))
    );

    const commentCountSubquery = db.$with('comment_count').as(
      db.select({
        songId: comments.songId,
        count: sql<number>`count(${comments.id})::int`.as('comment_count')
      })
        .from(comments)
        .groupBy(comments.songId)
    );

    const likeCountSubquery = db.$with('like_count').as(
      db.select({
        songId: song_likes.songId,
        count: sql<number>`count(${song_likes.userId})::int`.as('like_count')
      })
        .from(song_likes)
        .groupBy(song_likes.songId)
    );

    // Main query: Select from song_likes first, then join songs and counts
    const likedSongsData = await db.with(userLikeSubquery, commentCountSubquery, likeCountSubquery)
      .select({
        // Select all necessary fields from the songs table
        id: songs.id,
        name: songs.name,
        artist: songs.artist,
        album: songs.album,
        coverUrl: songs.coverUrl,
        spotifyUrl: songs.spotifyUrl,
        addedAt: songs.addedAt,
        trending_score: songs.trending_score, // Include if needed by SongCard, though unlikely
        last_decayed_at: songs.last_decayed_at, // Include if needed by SongCard
        // Add calculated fields
        likeCount: sql<number>`coalesce(${likeCountSubquery.count}, 0)`.as('like_count'),
        commentCount: sql<number>`coalesce(${commentCountSubquery.count}, 0)`.as('comment_count'),
        // For liked songs page, userHasLiked is always true for the current user
        userHasLiked: sql<boolean>`true`.as('user_has_liked'),
        // Keep likedAt from the base table for ordering
        likedAt: song_likes.likedAt
      })
      .from(song_likes)
      // Must join songs table to get song details
      .innerJoin(songs, eq(song_likes.songId, songs.id))
      // Join subqueries for counts
      .leftJoin(commentCountSubquery, eq(songs.id, commentCountSubquery.songId))
      .leftJoin(likeCountSubquery, eq(songs.id, likeCountSubquery.songId))
      // Filter by the current user's ID (primary filter)
      .where(eq(song_likes.userId, userId))
      // Order by when the song was liked (most recent first)
      .orderBy(desc(song_likes.likedAt))
      .limit(limit)
      .offset(offset);

    return { data: likedSongsData };

  } catch (error) {
    console.error(`Error fetching liked songs for user ${userId}:`, error);
    return { error: 'Database error fetching liked songs.' };
  }
}

/**
 * Fetches a paginated list of trending songs, ordered by trending_score.
 * Includes like count, comment count, and user's like status for each song.
 * @param limit - The maximum number of songs to return.
 * @param offset - The number of songs to skip (for pagination).
 * @returns Object containing an array of song data or an error.
 */
export async function getTrendingSongsAction(
  limit: number,
  offset: number
): Promise<{ data?: SongWithCountsAndLikeInfo[]; error?: string }> {
  noStore();

  const session = await auth();
  const userId = session?.user?.id;

  if (limit <= 0 || offset < 0) {
    return { error: 'Invalid limit or offset.' };
  }

  try {
    // Subquery to check if the current user liked the song
    const userLikeSubquery = db.$with('user_like').as(
      db.select({
        songId: song_likes.songId,
        liked: sql<boolean>`true`.as('liked')
      })
        .from(song_likes)
        .where(eq(song_likes.userId, userId ?? ''))
    );

    // Subquery to count comments per song
    const commentCountSubquery = db.$with('comment_count').as(
      db.select({
        songId: comments.songId,
        count: sql<number>`count(${comments.id})::int`.as('comment_count')
      })
        .from(comments)
        .groupBy(comments.songId)
    );

    // Subquery to count likes per song
    const likeCountSubquery = db.$with('like_count').as(
      db.select({
        songId: song_likes.songId,
        count: sql<number>`count(${song_likes.userId})::int`.as('like_count')
      })
        .from(song_likes)
        .groupBy(song_likes.songId)
    );

    // Main query combining song info with counts and user like status
    const trendingSongsData = await db.with(userLikeSubquery, commentCountSubquery, likeCountSubquery)
      .select({
        // Select all necessary fields from the songs table explicitly
        id: songs.id,
        name: songs.name,
        artist: songs.artist,
        album: songs.album,
        coverUrl: songs.coverUrl,
        spotifyUrl: songs.spotifyUrl,
        addedAt: songs.addedAt,
        trending_score: songs.trending_score,
        last_decayed_at: songs.last_decayed_at,
        // Add calculated fields
        likeCount: sql<number>`coalesce(${likeCountSubquery.count}, 0)`.as('like_count'),
        commentCount: sql<number>`coalesce(${commentCountSubquery.count}, 0)`.as('comment_count'),
        userHasLiked: sql<boolean>`coalesce(${userLikeSubquery.liked}, false)`.as('user_has_liked'),
      })
      .from(songs)
      .leftJoin(userLikeSubquery, eq(songs.id, userLikeSubquery.songId))
      .leftJoin(commentCountSubquery, eq(songs.id, commentCountSubquery.songId))
      .leftJoin(likeCountSubquery, eq(songs.id, likeCountSubquery.songId))
      .orderBy(desc(songs.trending_score), desc(songs.addedAt))
      .limit(limit)
      .offset(offset);

    // Ensure userHasLiked is false if no user is logged in
    const finalData = trendingSongsData.map(song => ({
      ...song,
      userHasLiked: userId ? song.userHasLiked : false,
    }));

    // The type of finalData should now correctly match SongWithCountsAndLikeInfo[]
    return { data: finalData };

  } catch (error) {
    console.error("Error fetching trending songs:", error);
    return { error: "Database error fetching trending songs." };
  }
}


// --- Shared Type Definition ---
export type CommentWithDetails = {
  id: string; // Comment UUID
  content: string; // Comment text
  createdAt: Date; // Timestamp of creation
  parentId: string | null; // ID of parent comment if it's a reply
  songId: string; // ID of the song this comment belongs to
  user: { // Information about the user who posted
    id: string;
    name: string | null;
    image: string | null;
  };
  likes: number; // Total number of likes
  currentUserLiked: boolean; // Whether the currently logged-in user liked this comment
  replies: CommentWithDetails[]; // Array of nested replies (will be populated)
  replyCount?: number; // Total count of all replies (even unloaded ones)
};

// --- Fetch Comments Action (REVISED for Nested Replies) ---

const FetchParamsSchema = z.object({
  songId: z.string().min(1, "Song ID is required."),
  sortBy: z.enum(['top', 'recent']),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
});

// Helper type for the flat structure returned by the recursive CTE
type FlatComment = {
  id: string;
  content: string;
  createdAt: Date | string; // Allow string initially from raw query
  parentId: string | null;
  songId: string;
  userId: string;
  userName: string | null;
  userImage: string | null;
  likesCount: number;
  currentUserLiked: boolean;
};

export async function fetchComments(
  params: z.infer<typeof FetchParamsSchema>
): Promise<{ comments: CommentWithDetails[]; hasMore: boolean; totalCount: number }> {
  noStore(); // Ensure fresh data
  const validation = FetchParamsSchema.safeParse(params);
  if (!validation.success) {
    console.error("Invalid fetchComments parameters:", validation.error.flatten().fieldErrors);
    return { comments: [], hasMore: false, totalCount: 0 };
  }
  const { songId, sortBy, limit, offset } = validation.data;
  const session = await auth();
  const currentUserId = session?.user?.id;

  console.log(`Fetching comments: songId=${songId}, sortBy=${sortBy}, limit=${limit}, offset=${offset}, userId=${currentUserId || 'None'}`);

  try {
    // 1. Get Total Count of Top-Level Comments (for pagination metadata)
    const totalCountResult = await db
      .select({ count: count() })
      .from(comments)
      .where(and(
        eq(comments.songId, songId),
        isNull(comments.parentId)
      ));
    const totalCount = totalCountResult[0]?.count ?? 0;

    // Determine if there are more top-level comments to load
    const hasMore = offset + limit < totalCount;

    // 2. Fetch Paginated Top-Level Comment IDs
    // Define the sort expression based on sortBy
    const sortExpression = sortBy === 'top'
      ? sql<number>`(SELECT COUNT(*) FROM ${commentLikes} WHERE ${commentLikes.commentId} = ${comments.id})`
      : comments.createdAt;

    const topLevelCommentsIdsQuery = db
      .select({
        id: comments.id,
      })
      .from(comments)
      .where(and(
        eq(comments.songId, songId),
        isNull(comments.parentId)
      ))
      .orderBy(
        // Use the sort expression directly in orderBy
        sortBy === 'top' ? desc(sortExpression) : desc(sortExpression),
        desc(comments.createdAt) // Secondary sort by date
      )
      .limit(limit)
      .offset(offset);

    const topLevelCommentIdsResult = await topLevelCommentsIdsQuery;
    const topLevelIds = topLevelCommentIdsResult.map(c => c.id);

    // If no top-level comments on this page, return early
    if (topLevelIds.length === 0) {
      console.log("No top-level comments found for this page.");
      return { comments: [], hasMore: false, totalCount };
    }

    // 3. Fetch All Comments in the Threads using Raw SQL Recursive CTE
    const recursiveQuery = sql`
          WITH RECURSIVE comment_thread AS (
              -- Anchor Member: Select the specific top-level comments for this page
              SELECT
                  c.id,
                  c.content,
                  c.created_at AS "createdAt",
                  c.parent_id AS "parentId",
                  c.song_id AS "songId",
                  c.user_id AS "userId",
                  u.name AS "userName",
                  u.image AS "userImage",
                  (SELECT COUNT(*) FROM ${commentLikes} cl WHERE cl.comment_id = c.id)::int AS "likesCount",
                  EXISTS (SELECT 1 FROM ${commentLikes} cl WHERE cl.comment_id = c.id AND cl.user_id = ${currentUserId ?? ''})::boolean AS "currentUserLiked",
                  1 AS depth
              FROM ${comments} c -- Use Drizzle object
              LEFT JOIN ${users} u ON c.user_id = u.id -- Use Drizzle object
              WHERE c.id IN ${topLevelIds}

              UNION ALL

              -- Recursive Member: Select replies
              SELECT
                  c.id,
                  c.content,
                  c.created_at AS "createdAt",
                  c.parent_id AS "parentId",
                  c.song_id AS "songId",
                  c.user_id AS "userId",
                  u.name AS "userName",
                  u.image AS "userImage",
                  (SELECT COUNT(*) FROM ${commentLikes} cl WHERE cl.comment_id = c.id)::int AS "likesCount",
                  EXISTS (SELECT 1 FROM ${commentLikes} cl WHERE cl.comment_id = c.id AND cl.user_id = ${currentUserId ?? ''})::boolean AS "currentUserLiked",
                  ct.depth + 1
              FROM ${comments} c -- Use Drizzle object
              INNER JOIN comment_thread ct ON c.parent_id = ct.id
              LEFT JOIN ${users} u ON c.user_id = u.id -- Use Drizzle object
              -- Optional depth limit: WHERE ct.depth < 10
          )
          -- Final Selection from CTE
          SELECT * FROM comment_thread;
      `;

    // Execute the raw query
    const result = await db.execute<FlatComment>(recursiveQuery);
    const flatCommentsList = Array.isArray(result) ? result : (result as any).rows || [];


    // 4. Build the Nested Tree Structure in JavaScript (Same as before)
    const commentsMap = new Map<string, CommentWithDetails>();
    const rootComments: CommentWithDetails[] = [];

    // First pass: Create nodes for all comments
    for (const flatComment of flatCommentsList) {
      const createdAtDate = typeof flatComment.createdAt === 'string'
        ? new Date(flatComment.createdAt)
        : flatComment.createdAt;

      commentsMap.set(flatComment.id, {
        id: flatComment.id,
        content: flatComment.content,
        createdAt: createdAtDate,
        parentId: flatComment.parentId,
        songId: flatComment.songId,
        user: {
          id: flatComment.userId,
          name: flatComment.userName,
          image: flatComment.userImage,
        },
        likes: flatComment.likesCount ?? 0,
        currentUserLiked: flatComment.currentUserLiked ?? false,
        replies: [],
      });
    }

    // Second pass: Link children to their parents
    for (const flatComment of flatCommentsList) {
      const createdAtDate = typeof flatComment.createdAt === 'string'
        ? new Date(flatComment.createdAt)
        : flatComment.createdAt;

      if (flatComment.parentId && commentsMap.has(flatComment.parentId)) {
        const parentNode = commentsMap.get(flatComment.parentId);
        const childNode = commentsMap.get(flatComment.id);
        if (parentNode && childNode) {
          childNode.createdAt = createdAtDate;
          parentNode.replies.push(childNode);
          parentNode.replies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }
      } else if (topLevelIds.includes(flatComment.id)) {
        const rootNode = commentsMap.get(flatComment.id);
        if (rootNode) {
          rootNode.createdAt = createdAtDate;
          rootComments.push(rootNode);
        }
      }
    }

    // 5. Sort the final list of root comments according to the original sort order
    const finalSortedComments = topLevelIds
      .map(id => commentsMap.get(id))
      .filter((comment): comment is CommentWithDetails => comment !== undefined);


    console.log(`Returning ${finalSortedComments.length} top-level comments with nested replies. HasMore: ${hasMore}`);
    return { comments: finalSortedComments, hasMore, totalCount };

  } catch (error) {
    console.error('Database Error: Failed to fetch comments.', error);
    return { comments: [], hasMore: false, totalCount: 0 };
  }
}



// --- Add Comment Action ---
const CommentSchema = z.object({
  content: z.string().trim().min(1, { message: 'Comment cannot be empty.' }).max(1000, { message: 'Comment too long (max 1000 characters).' }),
  songId: z.string().min(1, "Song ID is required."),
  parentId: z.string().uuid().nullable(),
});

// Modify return type to include the new comment data
export async function addComment(formData: FormData): Promise<{ success: boolean; error?: string; newComment?: CommentWithDetails }> {
  const session = await auth();
  if (!session?.user?.id) {
    console.log("User not authenticated. Redirecting to signin.");
    redirect('/api/auth/signin');
  }
  const currentUserId = session.user.id;
  const validatedFields = CommentSchema.safeParse({
    content: formData.get('content'),
    songId: formData.get('songId'),
    parentId: formData.get('parentId') || null,
  });

  if (!validatedFields.success) {
    const errors = validatedFields.error.flatten().fieldErrors;
    console.error('Add comment validation Error:', errors);
    return {
      success: false,
      error: errors.content?.[0] || errors.songId?.[0] || errors.parentId?.[0] || 'Invalid input.',
    };
  }
  const { content, songId, parentId } = validatedFields.data;

  try {
    // Insert the comment and get its ID
    const insertResult = await db.insert(comments).values({
      content, songId, userId: currentUserId, parentId,
    }).returning({ insertedId: comments.id });

    const newCommentId = insertResult[0]?.insertedId;
    if (!newCommentId) throw new Error('Failed to insert comment, no ID returned.');

    console.log(`Comment added: ${newCommentId} for song ${songId} by user ${currentUserId}`);

    await db.update(songs)
      .set({ trending_score: sql`${songs.trending_score} + 0.1` })
      .where(eq(songs.id, songId));
    console.log(`Incremented trending_score for song ${songId}`);

    // --- Fetch the newly created comment with necessary details ---
    const newCommentData = await db.select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
      songId: comments.songId,
      user: { // Select user details directly
        id: users.id,
        name: users.name,
        image: users.image,
      },
      likes: sql<number>`(SELECT COUNT(*) FROM ${commentLikes} WHERE ${commentLikes.commentId} = ${comments.id})`.mapWith(Number).as('likes_count'),
      // New comment won't be liked by the current user initially
      currentUserLiked: sql<boolean>`false`.as('current_user_liked'),
    })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id)) // Join users table
      .where(eq(comments.id, newCommentId))
      .limit(1);

    if (!newCommentData || newCommentData.length === 0) {
      throw new Error('Failed to fetch newly created comment.');
    }

    const fetchedComment = newCommentData[0];

    // Construct the final object matching CommentWithDetails
    const finalNewComment: CommentWithDetails = {
      id: fetchedComment.id,
      content: fetchedComment.content,
      createdAt: fetchedComment.createdAt,
      parentId: fetchedComment.parentId,
      songId: fetchedComment.songId,
      user: fetchedComment.user ?? { id: 'unknown', name: 'Unknown User', image: null }, // Handle potential null user join
      likes: fetchedComment.likes ?? 0,
      currentUserLiked: fetchedComment.currentUserLiked ?? false,
      replies: [], // New comments have no replies initially
    };
    // --- End Fetch ---


    console.log(`Revalidating path: /musicgrid/${songId}/view`);
    revalidatePath(`/musicgrid/${songId}/view`); // Keep revalidation

    // Return success and the newly created comment data
    return { success: true, newComment: finalNewComment };

  } catch (error) {
    console.error('Database Error: Failed to add comment.', error);
    return { success: false, error: 'Failed to add comment due to a database error. Please try again.' };
  }
}


// --- Toggle Comment Like Action ---
const LikeSchema = z.object({
  commentId: z.string().uuid({ message: "Invalid comment ID format." }),
});

export async function toggleCommentLike(
  commentId: string
): Promise<{ success: boolean; error?: string; liked?: boolean; newLikes?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    console.log("User not authenticated for like action. Redirecting to signin.");
    redirect('/api/auth/signin');
  }
  const currentUserId = session.user.id;
  const validatedFields = LikeSchema.safeParse({ commentId });
  if (!validatedFields.success) {
    console.error("Toggle like validation error:", validatedFields.error.flatten().fieldErrors);
    return { success: false, error: validatedFields.error.flatten().fieldErrors.commentId?.[0] || 'Invalid comment ID.' };
  }

  try {
    let liked = false;
    let newLikes = 0;

    await db.transaction(async (tx) => {
      const existingLike = await tx.query.commentLikes.findFirst({
        where: and(eq(commentLikes.userId, currentUserId), eq(commentLikes.commentId, commentId)),
        columns: { userId: true }
      });

      if (existingLike) {
        await tx.delete(commentLikes).where(and(eq(commentLikes.userId, currentUserId), eq(commentLikes.commentId, commentId)));
        liked = false;
        console.log(`User ${currentUserId} unliked comment ${commentId}`);
      } else {
        await tx.insert(commentLikes).values({ userId: currentUserId, commentId: commentId });
        liked = true;
        console.log(`User ${currentUserId} liked comment ${commentId}`);
      }

      const result = await tx.select({ count: count() }).from(commentLikes).where(eq(commentLikes.commentId, commentId));
      newLikes = result[0]?.count ?? 0;
    });

    const commentData = await db.query.comments.findFirst({
      columns: { songId: true }, where: eq(comments.id, commentId),
    });
    if (commentData?.songId) {
      console.log(`Revalidating path after like toggle: /musicgrid/${commentData.songId}/view`);
      revalidatePath(`/musicgrid/${commentData.songId}/view`);
    } else {
      revalidatePath('/');
      console.warn(`Could not determine songId for comment ${commentId} for path revalidation.`);
    }

    return { success: true, liked, newLikes };

  } catch (error) {
    console.error('Database Error: Failed to toggle comment like.', error);
    return { success: false, error: 'Failed to update like status due to a database error.' };
  }
}

const DeleteSchema = z.object({
  commentId: z.string().uuid({ message: "Invalid comment ID format." }),
});

/**
 * Deletes a comment if the current user is the owner.
 * Handles cascading deletes for replies and likes based on schema setup.
 * @param commentId - The UUID of the comment to delete.
 * @returns An object indicating success or error status.
 */
export async function deleteComment(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Check Authentication
  const session = await auth();
  if (!session?.user?.id) {
    console.log("User not authenticated for delete action. Redirecting to signin.");
    redirect('/api/auth/signin'); // Or return { success: false, error: "Authentication required." };
  }
  const currentUserId = session.user.id;

  // 2. Validate Input
  const validatedFields = DeleteSchema.safeParse({ commentId });
  if (!validatedFields.success) {
    console.error("Delete comment validation error:", validatedFields.error.flatten().fieldErrors);
    return { success: false, error: validatedFields.error.flatten().fieldErrors.commentId?.[0] || 'Invalid comment ID.' };
  }

  // 3. Fetch Comment and Authorize Deletion
  try {
    // Fetch the comment including its userId and songId
    const commentToDelete = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
      columns: {
        id: true,
        userId: true, // Need userId for authorization check
        songId: true, // Need songId for revalidation
      }
    });

    // Check if comment exists
    if (!commentToDelete) {
      return { success: false, error: "Comment not found." };
    }

    // Authorization: Check if the current user owns the comment
    if (commentToDelete.userId !== currentUserId) {
      console.warn(`Authorization failed: User ${currentUserId} attempted to delete comment ${commentId} owned by ${commentToDelete.userId}`);
      return { success: false, error: "You are not authorized to delete this comment." };
    }

    // 4. Delete Comment from Database
    await db.delete(comments).where(eq(comments.id, commentId));
    console.log(`Comment ${commentId} deleted successfully by user ${currentUserId}.`);

    if (commentToDelete.songId) {
      await db.update(songs)
        // Use GREATEST to prevent score going below 0
        .set({ trending_score: sql`GREATEST(0, ${songs.trending_score} - 0.1)` })
        .where(eq(songs.id, commentToDelete.songId));
      console.log(`Decremented trending_score for song ${commentToDelete.songId}`);
    } else {
      console.warn(`Could not decrement score for deleted comment ${commentId} as songId was missing.`);
    }
    
    // 5. Revalidate Cache
    // Use the songId fetched from the comment for accurate path revalidation
    if (commentToDelete.songId) {
      console.log(`Revalidating path after delete: /musicgrid/${commentToDelete.songId}/view`);
      revalidatePath(`/musicgrid/${commentToDelete.songId}/view`);
    } else {
      // Fallback if somehow songId was missing (shouldn't happen with schema constraints)
      revalidatePath('/');
      console.warn(`Could not determine songId for deleted comment ${commentId} for path revalidation.`);
    }

    // 6. Return Success
    return { success: true };

  } catch (error) {
    console.error('Database Error: Failed to delete comment.', error);
    return { success: false, error: 'Failed to delete comment due to a database error.' };
  }
}

/**
 * Fetches songs liked by a specific user (profile owner), including like/comment counts
 * and whether the *viewing* user has liked each song.
 * @param profileUserId - The ID of the user whose liked songs are being displayed.
 * @param viewingUserId - The ID of the user currently viewing the profile (or null/undefined if not logged in).
 * @returns Object containing an array of song data or an error.
 */
export async function getLikedSongsForUserAction(
  profileUserId: string,
  viewingUserId: string | null | undefined
): Promise<{ data?: SongWithCountsAndLikeInfo[]; error?: string }> {
  noStore(); // Ensure fresh data on each request

  if (!profileUserId) {
    return { error: 'Profile user ID is required.' };
  }

  try {
    // 1. Get the IDs of songs liked by the profile user (needed for subquery optimization)
    // This step is primarily for optimizing the subqueries below.
    const likedSongIdsResult = await db.selectDistinct({ songId: song_likes.songId })
      .from(song_likes)
      .where(eq(song_likes.userId, profileUserId));

    const likedSongIds = likedSongIdsResult.map(item => item.songId);

    // If the profile user hasn't liked any songs, return early.
    if (likedSongIds.length === 0) {
      console.log(`User ${profileUserId} has no liked songs.`);
      return { data: [] };
    }

    // 2. Define Subqueries for Counts and Viewing User's Like Status
    //    These subqueries are optimized to only consider the relevant songs.

    // Subquery to check if the *viewing* user liked the song
    const viewerLikeSubquery = db.$with('viewer_like').as(
      db.select({
        songId: song_likes.songId,
        liked: sql<boolean>`true`.as('liked')
      })
        .from(song_likes)
        // Only check if viewingUserId is provided and the song is one liked by the profile user
        .where(and(
            eq(song_likes.userId, viewingUserId ?? ''), // Use '' or a non-matching value if null/undefined
            inArray(song_likes.songId, likedSongIds)
         ))
    );

    // Subquery to count comments per song
    const commentCountSubquery = db.$with('comment_count').as(
      db.select({
        songId: comments.songId,
        count: sql<number>`count(${comments.id})::int`.as('comment_count')
      })
        .from(comments)
        .where(inArray(comments.songId, likedSongIds)) // Optimize: Only count comments for relevant songs
        .groupBy(comments.songId)
    );

    // Subquery to count total likes per song
    const likeCountSubquery = db.$with('like_count').as(
      db.select({
        songId: song_likes.songId,
        count: sql<number>`count(${song_likes.userId})::int`.as('like_count')
      })
        .from(song_likes)
        .where(inArray(song_likes.songId, likedSongIds)) // Optimize: Only count likes for relevant songs
        .groupBy(song_likes.songId)
    );

    // 3. Main Query: Fetch song details and join with subqueries, ordered by likedAt
    const likedSongsData = await db.with(viewerLikeSubquery, commentCountSubquery, likeCountSubquery)
      .select({
        // Select fields from songs table
        id: songs.id,
        name: songs.name,
        artist: songs.artist,
        album: songs.album,
        coverUrl: songs.coverUrl,
        spotifyUrl: songs.spotifyUrl,
        addedAt: songs.addedAt,
        trending_score: songs.trending_score,
        last_decayed_at: songs.last_decayed_at,
        // Select calculated fields from subqueries
        likeCount: sql<number>`coalesce(${likeCountSubquery.count}, 0)`.as('like_count'),
        commentCount: sql<number>`coalesce(${commentCountSubquery.count}, 0)`.as('comment_count'),
        userHasLiked: sql<boolean>`coalesce(${viewerLikeSubquery.liked}, false)`.as('user_has_liked'),
        // Select likedAt from the main song_likes table for ordering
        likedAt: song_likes.likedAt
      })
      .from(song_likes) // Start query from song_likes to filter by profileUserId and get likedAt
      .innerJoin(songs, eq(song_likes.songId, songs.id)) // Join to get song details
      // Left join subqueries to get counts and viewer's like status
      .leftJoin(viewerLikeSubquery, eq(songs.id, viewerLikeSubquery.songId))
      .leftJoin(commentCountSubquery, eq(songs.id, commentCountSubquery.songId))
      .leftJoin(likeCountSubquery, eq(songs.id, likeCountSubquery.songId))
      // Filter for the specific profile user whose likes we are fetching
      .where(eq(song_likes.userId, profileUserId))
      // Order the results by when the profile user liked the song (most recent first)
      .orderBy(desc(song_likes.likedAt));

    // 4. Final Mapping (Adjust userHasLiked based on viewing user)
    const finalData = likedSongsData.map(song => ({
      // Spread all selected fields
      ...song,
      // Ensure userHasLiked is false if no viewing user is logged in.
      // The SQL coalesce handles the case where the viewing user exists but didn't like the song.
      userHasLiked: viewingUserId ? song.userHasLiked : false,
    }));

    // Type assertion to match the expected return type
    const resultData: SongWithCountsAndLikeInfo[] = finalData;

    console.log(`Fetched ${resultData.length} liked songs for user ${profileUserId}`);
    return { data: resultData };

  } catch (error) {
    console.error(`Database Error: Failed to fetch liked songs for profile user ${profileUserId}:`, error);
    // Consider more specific error logging or handling if needed
    return { error: "Database error fetching liked songs. Please try again later." };
  }
}