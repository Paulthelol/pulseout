// lib/spotify.ts
import { db } from "@/src/db"; // Your drizzle instance
import { accounts } from "@/src/db/schema"; // Your accounts schema
import { eq } from "drizzle-orm";
import { unstable_noStore as noStore } from 'next/cache';

// Define the expected shape of the Spotify refresh token response
interface SpotifyTokenResponse {
    access_token: string;
    token_type: string;
    scope: string;
    expires_in: number;
    // Note: Spotify often doesn't return a new refresh_token unless specifically configured
    refresh_token?: string;
}


// Helper function to refresh the Spotify access token
async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
    noStore();
    console.log(`Attempting to refresh token for user ID: ${userId}`);
    const clientId = process.env.AUTH_SPOTIFY_ID; // Ensure these are set in your .env
    const clientSecret = process.env.AUTH_SPOTIFY_SECRET;

    if (!clientId || !clientSecret) {
        console.error("Spotify client ID or secret is missing in environment variables.");
        return null;
    }

    if (!refreshToken) {
        console.error(`Missing refresh token for user ID: ${userId}. Cannot refresh.`);
        return null; // Cannot refresh without a refresh token
    }


    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                // Basic Authentication: base64 encode "client_id:client_secret"
                "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
            }),
            // Don't cache the token refresh request itself
            cache: 'no-store'
        });

        const tokenData = await response.json() as SpotifyTokenResponse;

        if (!response.ok) {
            console.error(`Failed to refresh Spotify token for user ${userId}. Status: ${response.status}`, tokenData);
            // If refresh fails (e.g., invalid refresh token), clear stored tokens? Or just return null?
            // Returning null forces re-login which is safer.
            // Optionally: Update DB to clear tokens if refresh permanently fails.
             await db.update(accounts)
               .set({ access_token: null, refresh_token: null, expires_at: null })
               .where(eq(accounts.userId, userId) && eq(accounts.provider, 'spotify'));
             console.warn(`Cleared potentially invalid Spotify tokens for user ID: ${userId} after refresh failure.`);
            return null;
        }

        // Calculate new expiry time (response gives seconds_in, convert to timestamp)
        const newExpiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;

        // Update the database with the new token and expiry
        await db.update(accounts)
            .set({
                access_token: tokenData.access_token,
                expires_at: newExpiresAt,
                // Update refresh token only if Spotify sends a new one (uncommon)
                ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
                token_type: tokenData.token_type,
                scope: tokenData.scope,
            })
            .where(eq(accounts.userId, userId) && eq(accounts.provider, 'spotify'));

        console.log(`Successfully refreshed and updated token for user ID: ${userId}`);
        return tokenData.access_token;

    } catch (error) {
        console.error(`Error during token refresh for user ID ${userId}:`, error);
        return null;
    }
}


// --- Updated function to get access token, including refresh logic ---
export async function getSpotifyAccessToken(userId: string): Promise<string | null> {
    noStore(); // Prevent caching of this function's result
     if (!userId) {
        console.error("User ID is required to fetch Spotify token.");
        return null;
      }

    try {
        const userAccounts = await db.select()
            .from(accounts)
            .where(eq(accounts.userId, userId))
            .limit(1); // Assuming one Spotify account per user

        const spotifyAccount = userAccounts.find(acc => acc.provider === 'spotify');

        if (!spotifyAccount) {
            console.log(`No spotify account found for user ID: ${userId}`);
            return null;
        }

        if (!spotifyAccount.access_token || !spotifyAccount.refresh_token) {
             console.log(`Access or refresh token missing for Spotify account of user ID: ${userId}`);
             return null; // Need both for potential refresh
        }

        // Check if the token is expired or close to expiring (e.g., within the next 60 seconds)
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const expiresAt = spotifyAccount.expires_at; // This should be a Unix timestamp in seconds

        if (expiresAt && nowInSeconds >= (expiresAt - 60)) {
            console.log(`Token for user ID ${userId} expired or expiring soon. Attempting refresh.`);
            // Token expired or needs refresh
            return await refreshAccessToken(userId, spotifyAccount.refresh_token);
        } else if (!expiresAt) {
             console.warn(`Expires_at not set for user ID ${userId}. Assuming token is valid, but refresh might be needed.`);
             // If expires_at isn't set, maybe try refreshing just in case, or return current token?
             // Returning current token for now, but this indicates an issue during initial auth save.
             return spotifyAccount.access_token;
        } else {
             console.log(`Token for user ID ${userId} is still valid.`);
             // Token is still valid
             return spotifyAccount.access_token;
        }

    } catch (error) {
        console.error(`Error retrieving/checking Spotify access token for user ID ${userId}:`, error);
        return null;
    }
}

// --- Spotify API Interaction (Example within Server Action or API Route) ---
// This function remains the same, it uses the token provided by getSpotifyAccessToken
export async function searchSpotifyTracks(query: string, accessToken: string): Promise<any> {
    noStore();
    if (!query || !accessToken) {
        return { error: 'Search query and access token are required.' };
    }

    const searchParams = new URLSearchParams({
        q: query,
        type: 'track',
        limit: '10' // Adjust limit as needed
    });

    // Construct the Spotify API search URL
    // NOTE: The previous URL was incorrect. Using the correct base URL.
    const searchUrl = `https://api.spotify.com/v1/search?${searchParams.toString()}`;


    try {
        const response = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
             // Don't cache search results between requests by default
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Spotify API Error:', errorData);
            // Handle specific errors like 401 Unauthorized (token expired/invalid)
            if (response.status === 401) {
                 // The refresh logic should handle this before calling searchSpotifyTracks,
                 // but if it somehow gets here, guide the user.
                return { error: 'Spotify token seems invalid or expired. Please try logging out and back in.' };
            }
            return { error: `Spotify API error: ${response.statusText}` };
        }

        const data = await response.json();
        // Check if tracks and items exist before returning
        if (data && data.tracks && Array.isArray(data.tracks.items)) {
           return data.tracks.items; // Return track items
        } else {
            console.warn("Spotify search response did not contain tracks.items array:", data);
            return []; // Return empty array if structure is unexpected
        }
    } catch (error) {
        console.error('Error searching Spotify:', error);
        return { error: 'Failed to fetch from Spotify API.' };
    }
}