// app/musicgrid/search/page.tsx
'use client'; // This page needs client-side hooks for search params and state

import React, { useState, useEffect, Suspense, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Added useRouter
import { searchSpotifyAction, saveSongAction } from '@/lib/actions'; // Import BOTH actions

// Define a basic type for the track data
interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  external_urls: {
    spotify: string;
  };
}

// --- Component to display search results ---
function SearchResultsDisplay({ results, query }: { results: SpotifyTrack[], query: string }) {
  const router = useRouter(); // Get router for navigation
  const [isSavingId, setIsSavingId] = useState<string | null>(null); // Track which item is being saved/redirected
  const [saveError, setSaveError] = useState<string | null>(null); // Track save errors
  const [isPending, startTransition] = useTransition(); // For smoother UI updates during navigation

  const handleResultClick = async (track: SpotifyTrack) => {
    if (isSavingId) return; // Prevent double clicks while saving

    setIsSavingId(track.id);
    setSaveError(null);

    // Prepare data for the save action
    const songDataToSave = {
      id: track.id,
      name: track.name,
      artist: track.artists?.map(a => a.name).join(', ') || null, // Combine artist names
      album: track.album?.name || null,
      coverUrl: track.album?.images?.[0]?.url || null, // Get first image URL
      spotifyUrl: track.external_urls?.spotify || null,
    };

    try {
      const saveResult = await saveSongAction(songDataToSave);

      if (saveResult.success && saveResult.songId) {
        console.log(`Saved song ${saveResult.songId}, navigating...`);
        // Use startTransition for smoother navigation potentially
        startTransition(() => {
           router.push(`/musicgrid/${saveResult.songId}/view`);
        });
      } else {
        console.error('Failed to save song:', saveResult.error);
        setSaveError(saveResult.error || 'Failed to save song before navigating.');
        setIsSavingId(null); // Clear saving state on error
      }
    } catch (error) {
      console.error('Error during save/navigation:', error);
      setSaveError('An unexpected error occurred.');
      setIsSavingId(null); // Clear saving state on error
    }
    // Don't clear isSavingId on success, as navigation will unmount this state
  };


  if (results.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-6">
        No results found for &quot;{query}&quot;.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Search Results for &quot;{query}&quot;</h2>
      {/* Display save error if any */}
      {saveError && <p className="text-red-500 text-center mb-4">Error: {saveError}</p>}

      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {results.map((track) => (
          <li
            key={track.id}
            className="bg-card p-3 rounded-lg shadow hover:shadow-md transition-shadow flex flex-col justify-between" // Use flex for button positioning
          >
            {/* Keep track info clickable for external link */}
             <a
              href={track.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 group mb-2" // Add margin-bottom
            >
              {track.album.images?.[0]?.url && (
                <img
                  src={track.album.images[0].url}
                  alt={track.album.name}
                  width={50}
                  height={50}
                  className="rounded object-cover flex-shrink-0"
                />
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate group-hover:underline">
                  {track.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {track.artists.map((artist) => artist.name).join(', ')}
                </p>
              </div>
            </a>
            {/* Button to save and view internally */}
            <button
              onClick={() => handleResultClick(track)}
              disabled={isSavingId === track.id || isPending} // Disable while saving this item or navigating
              className={`mt-auto w-full text-center px-3 py-1 text-xs rounded ${
                isSavingId === track.id || isPending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              } transition-colors`}
            >
              {isSavingId === track.id ? 'Saving...' : 'View Details'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Main Search Page Component ---
// Needs to be wrapped in Suspense because useSearchParams is used directly
function SearchPageContent() {
  // Read search parameters from the URL
  const searchParams = useSearchParams();
  const query = searchParams.get('query') || ''; // Get the query or default to empty string

  // State for this page's search results and status
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if we should be showing search results
  const isSearching = query.trim().length > 0;

  // Effect to fetch search results when the URL query parameter changes
  useEffect(() => {
    if (isSearching) {
      const performSearch = async () => {
        setIsLoading(true);
        setError(null);
        setResults([]); // Clear previous results

        try {
          console.log(`Page fetching results for: ${query}`);
          const searchResponse = await searchSpotifyAction(query);

          if (searchResponse.error) {
            setError(searchResponse.error);
          } else if (Array.isArray(searchResponse.data)) {
            setResults(searchResponse.data as SpotifyTrack[]);
          } else {
             setError('Received unexpected data from search.');
          }
        } catch (err) {
           setError('Failed to perform search. Please try again.');
        } finally {
          setIsLoading(false);
        }
      };
      performSearch();
    } else {
      // Clear results if the query is removed from URL
      setResults([]);
      setError(null);
      setIsLoading(false);
    }
  }, [query, isSearching]); // Re-run effect if query or isSearching changes

  // Render based on query presence and loading/error state
  return (
    <div>
      {!isSearching && (
        <div className="text-center text-gray-500 mt-6">
          Please enter a search term above.
        </div>
      )}
      {isSearching && isLoading && (
        <div className="text-center text-gray-500 mt-6">Loading search results...</div>
      )}
      {isSearching && error && (
        <div className="text-center text-red-500 mt-6">Error: {error}</div>
      )}
      {isSearching && !isLoading && !error && (
        <SearchResultsDisplay results={results} query={query} />
      )}
    </div>
  );
}


// --- Exported Page Component with Suspense Boundary ---
// This ensures the page works correctly with useSearchParams
export default function SearchPage() {
 return (
    <Suspense fallback={<div className="text-center text-gray-500 mt-6">Loading search...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}