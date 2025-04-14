// lib/actions.ts
'use server';

import { signIn, signOut, auth } from '@/auth';
import { AuthError } from 'next-auth';
import { getSpotifyAccessToken, searchSpotifyTracks } from '@/lib/spotify';
import { db } from '@/src/db'; // Import your db instance
import { songs, song_likes, song_comments } from '@/src/db/schema'; // Import table schemas
import { eq, sql, and, desc, count, gt } from 'drizzle-orm'; // Import eq, sql, and, desc, count
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache'; // Import noStore

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
                songId: song_comments.songId,
                count: sql<number>`count(${song_comments.id})::int`.as('comment_count')
            })
            .from(song_comments)
            .groupBy(song_comments.songId)
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
                songId: song_comments.songId,
                count: sql<number>`count(${song_comments.id})::int`.as('comment_count')
            })
            .from(song_comments)
            .groupBy(song_comments.songId)
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