import { searchSpotifyTracks } from '@/lib/spotify';
import TrackCard from '@/app/ui/track-card';
import { Suspense } from 'react';
import { SearchBarSkeleton, SearchResultsSkeleton } from '@/app/ui/skeleton';
import { auth } from '@/auth'; // Import the auth function from NextAuth.js

// Extend the Session type to include accessToken
declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

// Define the structure of a track item (adjust based on your actual data from searchSpotifyTracks)
interface TrackItem {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    images: { url: string }[];
  };
  external_urls: {
    spotify: string;
  };
}

// Define the expected structure of the search results from searchSpotifyTracks
// Ensure this matches the actual return type of searchSpotifyTracks
interface SearchResultsData {
    tracks: {
        items: TrackItem[];
    }
}


// Main component to fetch and display results
async function Results({ query }: { query: string }) {
    // Get the server-side session using NextAuth.js auth() helper
    const session = await auth();

    // Extract the access token (adjust 'accessToken' if stored differently in your session)
    const accessToken = session?.accessToken; // Using optional chaining

    // Check if the access token is available
    if (!accessToken) {
        // Handle missing access token - user might not be logged in or token expired
        console.error("Search failed: Spotify access token is missing from session.");
        // You might want to redirect to login or show a specific message
        return <p className="text-orange-500 p-4">Could not perform search. Please ensure you are logged in.</p>;
    }

    // Fetch search results from Spotify API using searchSpotifyTracks
    let searchResults: SearchResultsData | null = null;
    try {
        // Pass both the query and the access token
        searchResults = await searchSpotifyTracks(query, accessToken as string); // Cast accessToken as string after check
    } catch (error) {
        console.error("Failed to fetch search results:", error);
        // Handle API errors (e.g., token invalid, rate limits)
        return <p className="text-red-500 p-4">Failed to load search results. Please try again later.</p>;
    }

    // Extract track items
    const tracks = searchResults?.tracks?.items ?? [];

    if (tracks.length === 0) {
        return <p className="text-center text-gray-500 dark:text-gray-400 p-4">No results found for "{query}".</p>;
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
            {/* Map over the track items and render a TrackCard for each */}
            {tracks.map((track) => (
                <TrackCard
                    key={track.id}
                    imageUrl={track.album?.images?.[0]?.url ?? 'https://placehold.co/150x150/222/eee?text=?'}
                    title={track.name}
                    artist={track.artists?.map(a => a.name).join(', ') ?? 'Unknown Artist'}
                    spotifyUrl={track.external_urls?.spotify}
                />
            ))}
        </div>
    );
}


// Exported component that uses Suspense for loading state
export default function SearchResults({ query }: { query: string }) {
    return (
        <div>
            <h2 className="text-2xl font-semibold mb-4 px-4 pt-4 dark:text-white">Search Results for "{query}"</h2>
            {/* Use Suspense to show a skeleton loader while fetching data */}
            {/* The key ensures Suspense re-triggers when the query changes */}
            <Suspense key={query} fallback={<SearchResultsSkeleton />}>
                {/* Render the actual results once data is fetched */}
                <Results query={query} />
            </Suspense>
        </div>
    );
}
