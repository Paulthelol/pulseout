// lib/actions.ts
'use server';

import { signIn, signOut, auth } from '@/auth';
import { AuthError } from 'next-auth';
import { getSpotifyAccessToken, searchSpotifyTracks } from '@/lib/spotify';
import { db } from '@/src/db'; // Import your db instance
import { songs, song_likes, comments, commentLikes, users } from '@/src/db/schema'; // Import table schemas
import { eq, sql, and, desc, count, gt, asc, isNull } from 'drizzle-orm'; // Import eq, sql, and, desc, count
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

// --- Auth & Search Actions (Keep As Is) ---

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

export async function SignOut() {
  await signOut({ redirectTo: '/login' });
}

export async function searchSpotifyAction(query: string): Promise<{ data?: any; error?: string }> {
  noStore(); // Prevent caching of search results
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'User not authenticated.' };
  }

  const accessToken = await getSpotifyAccessToken(session.user.id);
  if (!accessToken) {
    return { error: 'Could not retrieve Spotify access token. Please try logging in again.' };
  }

  const results = await searchSpotifyTracks(query, accessToken);

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
    // Optional: Revalidate paths if needed
    // revalidatePath('/musicgrid/library');

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
    // --- Use the same subquery pattern as getTrendingSongsAction ---
    const userLikeSubquery = db.$with('user_like').as(
      db.select({
        songId: song_likes.songId,
        liked: sql<boolean>`true`.as('liked')
      })
        .from(song_likes)
        .where(eq(song_likes.userId, userId)) // Already filtering by user below, but keep for clarity
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

    // No need for final map as userHasLiked is handled in select for this specific query
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
        last_decayed_at: songs.last_decayed_at, // *** Added missing field ***
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
// It's recommended to move this type to a shared location (e.g., 'types/index.ts')
// if used by both client and server components/actions.
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
  replies?: CommentWithDetails[]; // Array of nested replies (initially loaded)
  replyCount?: number; // Total count of all replies (even unloaded ones)
};

// --- Fetch Comments Action (with Pagination) ---

// Zod schema to validate input parameters for fetching comments
const FetchParamsSchema = z.object({
  songId: z.string().min(1, "Song ID is required."), // Ensure songId is provided
  sortBy: z.enum(['top', 'recent']), // Allow sorting by 'top' (likes) or 'recent'
  limit: z.number().int().positive().default(10), // Number of comments per page
  offset: z.number().int().nonnegative().default(0), // Starting point for fetching comments
});

/**
 * Fetches a paginated list of comments for a specific song, including user details,
 * like counts, initial replies, and total reply counts.
 * @param params - Object containing songId, sortBy, limit, and offset.
 * @returns An object containing the fetched comments, a flag indicating if more comments exist,
 * and the total count of top-level comments.
 */
export async function fetchComments(
  params: z.infer<typeof FetchParamsSchema>
): Promise<{ comments: CommentWithDetails[]; hasMore: boolean; totalCount: number }> {
  // Validate input parameters
  const validation = FetchParamsSchema.safeParse(params);
  if (!validation.success) {
    console.error("Invalid fetchComments parameters:", validation.error.flatten().fieldErrors);
    // Return an empty state or throw an error for invalid input
    return { comments: [], hasMore: false, totalCount: 0 };
  }
  const { songId, sortBy, limit, offset } = validation.data;

  // Get current user session
  const session = await auth();
  const currentUserId = session?.user?.id; // Use optional chaining

  console.log(`Fetching comments page: songId=${songId}, sortBy=${sortBy}, limit=${limit}, offset=${offset}, userId=${currentUserId || 'None'}`);

  try {
    // 1. Get Total Count of Top-Level Comments
    // This is needed to calculate if there are more pages (`hasMore`).
    const totalCountResult = await db
      .select({ count: count() }) // Count all rows
      .from(comments)
      .where(and(
        eq(comments.songId, songId), // Filter by song ID
        isNull(comments.parentId) // Only count comments without a parent (top-level)
      ));
    const totalCount = totalCountResult[0]?.count ?? 0; // Extract count, default to 0

    // 2. Fetch Paginated Top-Level Comments with Details
    // Use Common Table Expressions (CTE) for better query structure, especially for likes count.
    const likesSubQuery = db.$with('likes_sq').as(
      db.select({
        // The key 'comment_id_likes' implicitly aliases commentLikes.commentId
        comment_id_likes: commentLikes.commentId,
        // Use .as() on the sql fragment for the count alias within the CTE
        likes_count: sql<number>`count(*)`.as('likes_count')
      })
        .from(commentLikes)
        .groupBy(commentLikes.commentId) // Group by the original column name
    );

    // Main query to fetch the batch of top-level comments
    const topLevelCommentsQuery = db.with(likesSubQuery).select({
      comment: comments, // Select all columns from the comments table
      user: { // Select specific user details
        id: users.id,
        name: users.name,
        image: users.image,
      },
      // Use COALESCE to ensure likesCount is 0 if no likes exist
      likesCount: sql<number>`COALESCE(${likesSubQuery.likes_count}, 0)`.mapWith(Number).as('likes_count'),
      // Check if the current user liked this comment (returns boolean)
      currentUserLiked: currentUserId
        ? sql<boolean>`EXISTS (SELECT 1 FROM ${commentLikes} WHERE ${commentLikes.commentId} = ${comments.id} AND ${commentLikes.userId} = ${currentUserId})`.mapWith(Boolean).as('current_user_liked')
        : sql<boolean>`false`.as('current_user_liked'), // False if no user logged in
      // Subquery to get the total count of direct replies for each top-level comment
      replyCount: sql<number>`(SELECT COUNT(*) FROM ${comments} AS r WHERE r.parent_id = ${comments.id})`.mapWith(Number).as('reply_count'),
    })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id)) // Join with users table
      .leftJoin(likesSubQuery, eq(comments.id, likesSubQuery.comment_id_likes)) // Join with likes CTE
      .where(and(
        eq(comments.songId, songId), // Filter by song ID
        isNull(comments.parentId) // Only top-level comments
      ))
      .orderBy(
        // Apply sorting based on input parameter
        sortBy === 'top'
          ? desc(sql`likes_count`) // Sort by calculated likes count (descending)
          : desc(comments.createdAt) // Sort by creation date (descending)
      )
      .limit(limit) // Apply pagination limit
      .offset(offset); // Apply pagination offset

    const topLevelCommentsData = await topLevelCommentsQuery;

    // 3. Fetch Initial Replies for the Fetched Top-Level Comments
    const commentIds = topLevelCommentsData.map(c => c.comment.id); // Get IDs of the fetched comments
    let initialRepliesData: CommentWithDetails[] = []; // Initialize array for replies

    if (commentIds.length > 0) {
      const REPLIES_LIMIT = 2; // Number of initial replies to fetch per comment

      // Use a CTE with ROW_NUMBER() for efficient fetching of top N replies per parent
      const repliesSubQuery = db.$with('ranked_replies').as(
        db.select({
          // Select all necessary columns from comments and users for replies
          id: comments.id, content: comments.content, createdAt: comments.createdAt,
          parentId: comments.parentId, songId: comments.songId, userId: comments.userId,
          userName: users.name, userImage: users.image,
          // Assign a rank to each reply within its parent group, ordered by creation date
          rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${comments.parentId} ORDER BY ${comments.createdAt} ASC)`.mapWith(Number),
        })
          .from(comments)
          .leftJoin(users, eq(comments.userId, users.id))
          // Filter for replies whose parent ID is in the list of fetched top-level comment IDs
          .where(sql`${comments.parentId} IN ${commentIds}`)
      );

      // Query to select the ranked replies and their like status/count
      const initialRepliesResult = await db.with(repliesSubQuery).select({
        comment: { // Reconstruct comment object structure
          id: repliesSubQuery.id, content: repliesSubQuery.content, createdAt: repliesSubQuery.createdAt,
          parentId: repliesSubQuery.parentId, songId: repliesSubQuery.songId, userId: repliesSubQuery.userId,
        },
        user: { // Reconstruct user object structure
          id: repliesSubQuery.userId, name: repliesSubQuery.userName, image: repliesSubQuery.userImage,
        },
        // Calculate likes and liked status for these replies (similar to top-level)
        likesCount: sql<number>`(SELECT COUNT(*) FROM ${commentLikes} WHERE ${commentLikes.commentId} = ${repliesSubQuery.id})`.mapWith(Number).as('likes_count'),
        currentUserLiked: currentUserId
          ? sql<boolean>`EXISTS (SELECT 1 FROM ${commentLikes} WHERE ${commentLikes.commentId} = ${repliesSubQuery.id} AND ${commentLikes.userId} = ${currentUserId})`.mapWith(Boolean).as('current_user_liked')
          : sql<boolean>`false`.as('current_user_liked'),
      })
        .from(repliesSubQuery)
        // Filter to get only the top N replies (e.g., rank <= 2)
        .where(sql`${repliesSubQuery.rn} <= ${REPLIES_LIMIT}`)
        .orderBy(repliesSubQuery.parentId, asc(repliesSubQuery.createdAt)); // Order for easier grouping later

      // Format the fetched replies into the CommentWithDetails structure
      initialRepliesData = initialRepliesResult.map(({ comment, user, likesCount, currentUserLiked }) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        parentId: comment.parentId,
        songId: comment.songId, // Include songId if needed
        user: user ?? { id: 'unknown', name: 'Unknown User', image: null }, // Handle potential null user
        likes: likesCount ?? 0, // Default likes to 0
        currentUserLiked: currentUserLiked ?? false, // Default liked status
        replies: [], // Replies fetched this way don't have further nested replies loaded initially
        replyCount: 0, // We don't calculate reply counts for replies in this initial fetch
      }));
    }


    // 4. Combine Top-Level Comments with Their Initial Replies
    const finalComments = topLevelCommentsData.map(({ comment, user, likesCount, currentUserLiked, replyCount }) => {
      const userData = user ?? { id: 'unknown', name: 'Unknown User', image: null }; // Handle potential null user
      // Filter the `initialRepliesData` to find replies belonging to this specific top-level comment
      const repliesForThisComment = initialRepliesData.filter(reply => reply.parentId === comment.id);

      // Return the final structure matching CommentWithDetails
      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        parentId: comment.parentId,
        songId: comment.songId,
        user: userData,
        likes: likesCount ?? 0,
        currentUserLiked: currentUserLiked ?? false,
        replies: repliesForThisComment, // Assign the fetched initial replies
        replyCount: replyCount ?? 0, // Assign the total reply count
      };
    });


    // 5. Determine if More Comments Exist
    // Compare the next potential offset with the total count
    const hasMore = offset + finalComments.length < totalCount;

    // Return the result
    return { comments: finalComments, hasMore, totalCount };

  } catch (error) {
    console.error('Database Error: Failed to fetch comments page.', error);
    // Return empty state in case of error
    return { comments: [], hasMore: false, totalCount: 0 };
  }
}


// --- Add Comment Action ---

// Zod schema for validating data when adding a comment
const CommentSchema = z.object({
  // Trim whitespace, ensure minimum length, set maximum length
  content: z.string().trim().min(1, { message: 'Comment cannot be empty.' }).max(1000, { message: 'Comment too long (max 1000 characters).' }),
  songId: z.string().min(1, "Song ID is required."), // Ensure songId is present
  parentId: z.string().uuid().nullable(), // Allow UUID for parent or null for top-level
  // userId is added internally from the session, not part of the form data schema
});

/**
 * Adds a new comment or reply to the database.
 * @param formData - The FormData object from the comment input form.
 * @returns An object indicating success status, potential error message, and the new comment's ID.
 */
export async function addComment(formData: FormData): Promise<{ success: boolean; error?: string; newCommentId?: string }> {
  // 1. Check Authentication
  const session = await auth();
  if (!session?.user?.id) {
    // If not authenticated, redirect to login page
    console.log("User not authenticated. Redirecting to signin.");
    redirect('/api/auth/signin'); // Adjust login path if needed
    // Note: Redirect throws an error, so execution stops here.
  }
  const currentUserId = session.user.id;

  // 2. Validate Form Data
  const validatedFields = CommentSchema.safeParse({
    content: formData.get('content'),
    songId: formData.get('songId'),
    // Get parentId, default to null if not present or empty
    parentId: formData.get('parentId') || null,
  });

  // Handle validation errors
  if (!validatedFields.success) {
    const errors = validatedFields.error.flatten().fieldErrors;
    console.error('Add comment validation Error:', errors);
    // Return the first validation error found
    return {
      success: false,
      error: errors.content?.[0] || errors.songId?.[0] || errors.parentId?.[0] || 'Invalid input.',
    };
  }

  // Destructure validated data
  const { content, songId, parentId } = validatedFields.data;

  // 3. Insert into Database
  try {
    const result = await db.insert(comments).values({
      content,
      songId,
      userId: currentUserId, // Use ID from session
      parentId: parentId, // Drizzle handles null correctly
    }).returning({ insertedId: comments.id }); // Return the ID of the newly inserted comment

    const newCommentId = result[0]?.insertedId;

    // Check if insertion was successful
    if (!newCommentId) {
      throw new Error('Failed to insert comment, no ID returned.');
    }

    console.log(`Comment added: ${newCommentId} for song ${songId} by user ${currentUserId}`);

    // 4. Revalidate Cache
    // Invalidate the cache for the specific song's view page.
    // This tells Next.js to refetch data for this page on the next request.
    console.log(`Revalidating path: /musicgrid/${songId}/view`);
    revalidatePath(`/musicgrid/${songId}/view`); // Adjust path pattern if needed

    // Return success status and the new comment ID
    return { success: true, newCommentId };

  } catch (error) {
    console.error('Database Error: Failed to add comment.', error);
    // Return error status
    return { success: false, error: 'Failed to add comment due to a database error. Please try again.' };
  }
}


// --- Toggle Comment Like Action ---

// Zod schema for validating the comment ID when liking/unliking
const LikeSchema = z.object({
  commentId: z.string().uuid({ message: "Invalid comment ID format." }), // Expecting a valid UUID
  // userId is added internally from session
});

/**
 * Likes or unlikes a comment for the currently logged-in user.
 * @param commentId - The UUID of the comment to like/unlike.
 * @returns An object indicating success, potential error, the new liked status, and the updated like count.
 */
export async function toggleCommentLike(
  commentId: string
): Promise<{ success: boolean; error?: string; liked?: boolean; newLikes?: number }> {
  // 1. Check Authentication
  const session = await auth();
  if (!session?.user?.id) {
    console.log("User not authenticated for like action. Redirecting to signin.");
    redirect('/api/auth/signin'); // Adjust login path if needed
  }
  const currentUserId = session.user.id;

  // 2. Validate Input (Comment ID)
  const validatedFields = LikeSchema.safeParse({ commentId });
  if (!validatedFields.success) {
    console.error("Toggle like validation error:", validatedFields.error.flatten().fieldErrors);
    return { success: false, error: validatedFields.error.flatten().fieldErrors.commentId?.[0] || 'Invalid comment ID.' };
  }

  // 3. Perform Like/Unlike Logic within a Transaction
  try {
    let liked = false; // Final liked status
    let newLikes = 0; // Final like count

    // Use a database transaction to ensure atomicity (all or nothing)
    await db.transaction(async (tx) => {
      // a. Check if the user already likes this comment
      const existingLike = await tx.select({ userId: commentLikes.userId })
        .from(commentLikes)
        .where(and(
          eq(commentLikes.userId, currentUserId),
          eq(commentLikes.commentId, commentId)
        ))
        .limit(1);

      if (existingLike) {
        // b. Unlike: Delete the existing like record
        await tx.delete(commentLikes)
          .where(and(
            eq(commentLikes.userId, currentUserId),
            eq(commentLikes.commentId, commentId)
          ));
        liked = false; // Set final status to unliked
        console.log(`User ${currentUserId} unliked comment ${commentId}`);
      } else {
        // c. Like: Insert a new like record
        await tx.insert(commentLikes).values({
          userId: currentUserId,
          commentId: commentId,
        });
        liked = true; // Set final status to liked
        console.log(`User ${currentUserId} liked comment ${commentId}`);
      }

      // d. Get the updated total like count for the comment
      const result = await tx
        .select({ count: count() })
        .from(commentLikes)
        .where(eq(commentLikes.commentId, commentId));
      newLikes = result[0]?.count ?? 0; // Update the like count

      // Optional: Update a denormalized 'likesCount' field on the comments table itself
      // This can improve read performance but adds complexity to writes.
      // await tx.update(comments)
      //    .set({ likesCount: newLikes })
      //    .where(eq(comments.id, commentId));
    }); // Transaction commits automatically if no errors

    // 4. Revalidate Cache
    // Fetch the songId associated with the comment to revalidate the correct page
    // Fetch the songId associated with the comment to revalidate the correct page
    const commentData = await db
      .select({ songId: comments.songId })
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (commentData[0]?.songId) {
      console.log(`Revalidating path after like toggle: /musicgrid/${commentData[0].songId}/view`);
      revalidatePath(`/musicgrid/${commentData[0].songId}/view`);
    } else {
      // Fallback or broader revalidation if songId cannot be determined
      revalidatePath('/');
      console.warn(`Could not determine songId for comment ${commentId} for path revalidation.`);
    }

    // 5. Return Success Response
    return { success: true, liked, newLikes };

  } catch (error) {
    console.error('Database Error: Failed to toggle comment like.', error);
    // Return error status
    return { success: false, error: 'Failed to update like status due to a database error.' };
  }
}