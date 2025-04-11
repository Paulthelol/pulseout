'use server';

import { signIn, signOut, auth } from '@/auth';
import { AuthError } from 'next-auth';
import { getSpotifyAccessToken, searchSpotifyTracks } from '@/lib/spotify';

export async function authenticateSpotify(
    prevState: string | undefined,
    formData: FormData
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
                throw error;
            }
          }
          throw error;
    }
}

export async function SignOut() {
    await signOut({ redirectTo: '/login' });
}



export async function searchSpotifyAction(query: string): Promise<{ data?: any; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: 'User not authenticated.' };
    }

    const accessToken = await getSpotifyAccessToken(session.user.id);
    if (!accessToken) {
         // Specific error from getSpotifyAccessToken might be more informative
        return { error: 'Could not retrieve Spotify access token.' };
    }

    const results = await searchSpotifyTracks(query, accessToken);

    // Check if results itself indicates an error (like token expiry from searchSpotifyTracks)
    if (results && results.error) {
        return { error: results.error };
    }

    // Assuming results is the array of tracks or an error object was returned
    return { data: results };
}
