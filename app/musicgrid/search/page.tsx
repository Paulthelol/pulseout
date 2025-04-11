// app/musicgrid/search/page.tsx
import { auth } from "@/auth"; // Import auth function from your auth.ts file
import SearchComponent from '@/components/search-component'; // Client component for handling search interaction
import { getSpotifyAccessToken } from '@/lib/spotify'; // Helper function to get token (implement below)

export default async function MusicSearchPage() {
  const session = await auth(); // Get the server-side session

  if (!session?.user) {
    // Should be handled by middleware, but good practice to check
    return <p>Please log in to search music.</p>;
  }

  // Attempt to get the access token (implement getSpotifyAccessToken)
  const accessToken = await getSpotifyAccessToken(session.user.id!);

  if (!accessToken) {
    return <p>Could not retrieve Spotify access token. Please re-authenticate if the issue persists.</p>;
  }

  // Pass the access token to a Client Component that handles the search bar and API calls
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-white">Search Spotify Songs</h1>
      {/*
        Pass the token to a client component.
        Directly using the token in client-side fetch calls is insecure.
        Instead, the SearchComponent will call a Server Action or API Route.
      */}
      <SearchComponent />
    </div>
  );
}