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

  const FetchParamsSchema = z.object({
      songId: z.string().min(1, "Song ID is required."),
      sortBy: z.enum(['top', 'recent']),
      limit: z.number().int().positive().default(10),
      offset: z.number().int().nonnegative().default(0),
  });

  export async function fetchComments(
      params: z.infer<typeof FetchParamsSchema>
  ): Promise<{ comments: CommentWithDetails[]; hasMore: boolean; totalCount: number }> {
      const validation = FetchParamsSchema.safeParse(params);
      if (!validation.success) {
          console.error("Invalid fetchComments parameters:", validation.error.flatten().fieldErrors);
          return { comments: [], hasMore: false, totalCount: 0 };
      }
      const { songId, sortBy, limit, offset } = validation.data;
      const session = await auth();
      const currentUserId = session?.user?.id;

      console.log(`Fetching comments page: songId=${songId}, sortBy=${sortBy}, limit=${limit}, offset=${offset}, userId=${currentUserId || 'None'}`);

      try {
          // 1. Get Total Count of Top-Level Comments
          const totalCountResult = await db
              .select({ count: count() })
              .from(comments)
              .where(and(
                  eq(comments.songId, songId),
                  isNull(comments.parentId)
              ));
          const totalCount = totalCountResult[0]?.count ?? 0;

          // 2. Fetch Paginated Top-Level Comments with Details
          const likesSubQuery = db.$with('likes_sq').as(
              db.select({
                  comment_id_likes: commentLikes.commentId,
                  likes_count: sql<number>`count(*)`.as('likes_count')
              })
              .from(commentLikes)
              .groupBy(commentLikes.commentId)
          );

          const topLevelCommentsQuery = db.with(likesSubQuery).select({
                  comment: comments,
                  user: { id: users.id, name: users.name, image: users.image },
                  likesCount: sql<number>`COALESCE(${likesSubQuery.likes_count}, 0)`.mapWith(Number).as('likes_count'),
                  currentUserLiked: currentUserId
                      ? sql<boolean>`EXISTS (SELECT 1 FROM ${commentLikes} WHERE ${commentLikes.commentId} = ${comments.id} AND ${commentLikes.userId} = ${currentUserId})`.mapWith(Boolean).as('current_user_liked')
                      : sql<boolean>`false`.as('current_user_liked'),
                  replyCount: sql<number>`(SELECT COUNT(*) FROM ${comments} AS r WHERE r.parent_id = ${comments.id})`.mapWith(Number).as('reply_count'),
              })
              .from(comments)
              .leftJoin(users, eq(comments.userId, users.id))
              .leftJoin(likesSubQuery, eq(comments.id, likesSubQuery.comment_id_likes))
              .where(and(
                  eq(comments.songId, songId),
                  isNull(comments.parentId)
              ))
              .orderBy(
                  sortBy === 'top' ? desc(sql`likes_count`) : desc(comments.createdAt)
              )
              .limit(limit)
              .offset(offset);

          const topLevelCommentsData = await topLevelCommentsQuery;

          // 3. Fetch Initial Replies
          const commentIds = topLevelCommentsData.map(c => c.comment.id);
          let initialRepliesData: CommentWithDetails[] = [];

          if (commentIds.length > 0) {
              const REPLIES_LIMIT = 2;

              // Use a CTE with ROW_NUMBER()
              const repliesSubQuery = db.$with('ranked_replies').as(
                  db.select({
                      id: comments.id, content: comments.content, createdAt: comments.createdAt,
                      parentId: comments.parentId, songId: comments.songId, userId: comments.userId,
                      userName: users.name, userImage: users.image,
                      // *** FIXED: Added .as('rn') here ***
                      rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${comments.parentId} ORDER BY ${comments.createdAt} ASC)`.as('rn'),
                  })
                  .from(comments)
                  .leftJoin(users, eq(comments.userId, users.id))
                  .where(sql`${comments.parentId} IN ${commentIds}`)
              );

              // Query using the CTE
              const initialRepliesResult = await db.with(repliesSubQuery).select({
                      comment: {
                          id: repliesSubQuery.id, content: repliesSubQuery.content, createdAt: repliesSubQuery.createdAt,
                          parentId: repliesSubQuery.parentId, songId: repliesSubQuery.songId, userId: repliesSubQuery.userId,
                      },
                      user: {
                          id: repliesSubQuery.userId, name: repliesSubQuery.userName, image: repliesSubQuery.userImage,
                      },
                       likesCount: sql<number>`(SELECT COUNT(*) FROM ${commentLikes} WHERE ${commentLikes.commentId} = ${repliesSubQuery.id})`.mapWith(Number).as('likes_count'),
                       currentUserLiked: currentUserId
                          ? sql<boolean>`EXISTS (SELECT 1 FROM ${commentLikes} WHERE ${commentLikes.commentId} = ${repliesSubQuery.id} AND ${commentLikes.userId} = ${currentUserId})`.mapWith(Boolean).as('current_user_liked')
                          : sql<boolean>`false`.as('current_user_liked'),
                      // We need rn to filter, but don't need it in the final select projection
                      // rn: repliesSubQuery.rn
                  })
                  .from(repliesSubQuery)
                  // *** FIXED: Reference the aliased field 'rn' from the CTE ***
                  .where(sql`${repliesSubQuery.rn} <= ${REPLIES_LIMIT}`)
                  .orderBy(repliesSubQuery.parentId, asc(repliesSubQuery.createdAt));

               // Format replies
               initialRepliesData = initialRepliesResult.map(({ comment, user, likesCount, currentUserLiked }) => ({
                  id: comment.id,
                  content: comment.content,
                  createdAt: comment.createdAt,
                  parentId: comment.parentId,
                  songId: comment.songId,
                  user: user ?? { id: 'unknown', name: 'Unknown User', image: null },
                  likes: likesCount ?? 0,
                  currentUserLiked: currentUserLiked ?? false,
                  replies: [],
                  replyCount: 0,
               }));
          }


          // 4. Combine Top-Level Comments with Their Initial Replies
          const finalComments = topLevelCommentsData.map(({ comment, user, likesCount, currentUserLiked, replyCount }) => {
               const userData = user ?? { id: 'unknown', name: 'Unknown User', image: null };
               const repliesForThisComment = initialRepliesData.filter(reply => reply.parentId === comment.id);
               return {
                  id: comment.id,
                  content: comment.content,
                  createdAt: comment.createdAt,
                  parentId: comment.parentId,
                  songId: comment.songId,
                  user: userData,
                  likes: likesCount ?? 0,
                  currentUserLiked: currentUserLiked ?? false,
                  replies: repliesForThisComment,
                  replyCount: replyCount ?? 0,
               };
          });

          // 5. Determine if More Comments Exist
          const hasMore = offset + finalComments.length < totalCount;

          return { comments: finalComments, hasMore, totalCount };

      } catch (error) {
          console.error('Database Error: Failed to fetch comments page.', error);
          return { comments: [], hasMore: false, totalCount: 0 };
      }
  }


  // --- Add Comment Action ---
  const CommentSchema = z.object({
      content: z.string().trim().min(1, { message: 'Comment cannot be empty.' }).max(1000, { message: 'Comment too long (max 1000 characters).' }),
      songId: z.string().min(1, "Song ID is required."),
      parentId: z.string().uuid().nullable(),
  });

  export async function addComment(formData: FormData): Promise<{ success: boolean; error?: string; newCommentId?: string }> {
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
          const result = await db.insert(comments).values({
              content, songId, userId: currentUserId, parentId,
          }).returning({ insertedId: comments.id });

          const newCommentId = result[0]?.insertedId;
          if (!newCommentId) throw new Error('Failed to insert comment, no ID returned.');

          console.log(`Comment added: ${newCommentId} for song ${songId} by user ${currentUserId}`);
          console.log(`Revalidating path: /musicgrid/${songId}/view`);
          revalidatePath(`/musicgrid/${songId}/view`);

          return { success: true, newCommentId };

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
                  where: and( eq(commentLikes.userId, currentUserId), eq(commentLikes.commentId, commentId)),
                  columns: { userId: true }
              });

              if (existingLike) {
                  await tx.delete(commentLikes).where(and( eq(commentLikes.userId, currentUserId), eq(commentLikes.commentId, commentId)));
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
           if(commentData?.songId) {
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
    // Optional: songId can be passed for more specific revalidation, but fetching it is safer
    // songId: z.string().optional(),
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