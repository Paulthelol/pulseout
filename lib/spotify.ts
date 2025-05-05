// written by: Paul
  // tested by: Paul, Andrew, Jordan, Others...

import { unstable_noStore as noStore } from 'next/cache';

// --- Interfaces ---
interface SpotifyClientCredentialsTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

// --- In-Memory Cache for Application Token ---
// NOTE: In serverless environments, each instance might get its own token.
// Consider a more persistent cache (e.g., Redis, database) for better scalability.
let appAccessToken: string | null = null;
let appTokenExpiry: number | null = null; // Store expiry time (Unix timestamp in seconds)

// --- Function to get Application Access Token (Client Credentials) ---
async function getSpotifyAppAccessToken(): Promise<string | null> {
    noStore(); // Ensure this function re-evaluates cache status

    const nowInSeconds = Math.floor(Date.now() / 1000);

    // Check cache first (with a 60-second buffer before expiry)
    if (appAccessToken && appTokenExpiry && nowInSeconds < (appTokenExpiry - 60)) {
        console.log("Using cached Spotify app access token.");
        return appAccessToken;
    }

    console.log("Fetching new Spotify app access token (Client Credentials)...");
    const clientId = process.env.AUTH_SPOTIFY_ID;
    const clientSecret = process.env.AUTH_SPOTIFY_SECRET;

    if (!clientId || !clientSecret) {
        console.error("Spotify client ID or secret is missing in environment variables for app token.");
        return null;
    }

    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: "client_credentials",
            }),
            cache: 'no-store' // Don't cache the token request itself
        });

        const tokenData = await response.json() as SpotifyClientCredentialsTokenResponse;

        if (!response.ok) {
            console.error(`Failed to fetch Spotify app token. Status: ${response.status}`, tokenData);
            // Clear potentially invalid cached token on failure
            appAccessToken = null;
            appTokenExpiry = null;
            return null;
        }

        // Cache the new token and calculate expiry time
        appAccessToken = tokenData.access_token;
        appTokenExpiry = Math.floor(Date.now() / 1000) + tokenData.expires_in;

        console.log("Successfully fetched and cached new Spotify app access token.");
        return appAccessToken;

    } catch (error) {
        console.error("Error during Spotify app token fetch:", error);
        // Clear cache on error
        appAccessToken = null;
        appTokenExpiry = null;
        return null;
    }
}


// --- Spotify API Search Function ---
// Uses the application access token
export async function searchSpotifyTracks(query: string): Promise<any> {
    noStore();

    // Fetch the application access token
    const accessToken = await getSpotifyAppAccessToken();

    if (!query) {
        return { error: 'Search query is required.' };
    }
    if (!accessToken) {
        return { error: 'Could not retrieve Spotify application access token.' };
    }

    const searchParams = new URLSearchParams({
        q: query,
        type: 'track',
        limit: '12' // Adjust limit as needed
    });

    const searchUrl = `https://api.spotify.com/v1/search?${searchParams.toString()}`;

    try {
        const response = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            cache: 'no-store' // Don't cache search results by default
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Spotify API Search Error:', errorData);
            // Handle specific errors like 401 Unauthorized (app token might be invalid/revoked)
             if (response.status === 401) {
                 // Clear the cached app token if it was invalid
                 appAccessToken = null;
                 appTokenExpiry = null;
                 return { error: 'Spotify app token was invalid. Please try again shortly.' };
             }
            return { error: `Spotify API error: ${response.statusText}` };
        }

        const data = await response.json();
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


// --- User-Specific Token Functions (Keep if needed elsewhere) ---

/*
interface SpotifyUserTokenResponse {
    access_token: string;
    token_type: string;
    scope: string;
    expires_in: number;
    refresh_token?: string;
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
    noStore();
    console.log(`Attempting to refresh token for user ID: ${userId}`);
    const clientId = process.env.AUTH_SPOTIFY_ID;
    const clientSecret = process.env.AUTH_SPOTIFY_SECRET;

    if (!clientId || !clientSecret) {
        console.error("Spotify client ID or secret is missing in environment variables.");
        return null;
    }
    if (!refreshToken) {
        console.error(`Missing refresh token for user ID: ${userId}. Cannot refresh.`);
        return null;
    }

    try {
        const response = await fetch("https://accounts.spotify.com/api/token", { // Correct URL
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
            }),
            cache: 'no-store'
        });

        const tokenData = await response.json() as SpotifyUserTokenResponse;

        if (!response.ok) {
            console.error(`Failed to refresh Spotify token for user ${userId}. Status: ${response.status}`, tokenData);
             await db.update(accounts)
               .set({ access_token: null, refresh_token: null, expires_at: null })
               .where(eq(accounts.userId, userId) && eq(accounts.provider, 'spotify'));
             console.warn(`Cleared potentially invalid Spotify tokens for user ID: ${userId} after refresh failure.`);
            return null;
        }

        const newExpiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;

        await db.update(accounts)
            .set({
                access_token: tokenData.access_token,
                expires_at: newExpiresAt,
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

export async function getSpotifyAccessToken(userId: string): Promise<string | null> {
    noStore();
     if (!userId) {
         console.error("User ID is required to fetch Spotify token.");
         return null;
     }

    try {
        const userAccounts = await db.select()
            .from(accounts)
            .where(eq(accounts.userId, userId))
            .limit(1);

        const spotifyAccount = userAccounts.find(acc => acc.provider === 'spotify');

        if (!spotifyAccount) {
            console.log(`No spotify account found for user ID: ${userId}`);
            return null;
        }
        if (!spotifyAccount.access_token || !spotifyAccount.refresh_token) {
             console.log(`Access or refresh token missing for Spotify account of user ID: ${userId}`);
             return null;
        }

        const nowInSeconds = Math.floor(Date.now() / 1000);
        const expiresAt = spotifyAccount.expires_at;

        if (expiresAt && nowInSeconds >= (expiresAt - 60)) {
            console.log(`Token for user ID ${userId} expired or expiring soon. Attempting refresh.`);
            return await refreshAccessToken(userId, spotifyAccount.refresh_token);
        } else if (!expiresAt) {
             console.warn(`Expires_at not set for user ID ${userId}. Assuming token is valid, but refresh might be needed.`);
             return spotifyAccount.access_token;
        } else {
             console.log(`Token for user ID ${userId} is still valid.`);
             return spotifyAccount.access_token;
        }

    } catch (error) {
        console.error(`Error retrieving/checking Spotify access token for user ID ${userId}:`, error);
        return null;
    }
}
*/
