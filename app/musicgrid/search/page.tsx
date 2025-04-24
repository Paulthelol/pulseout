'use client';

import React, { useState, useEffect, Suspense, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { searchSpotifyAction, saveSongAction } from '@/lib/actions';
import SearchCard from '@/app/ui/search-card'; // Import the new SearchCard component

// Define a basic type for the track data (ensure it matches SearchCard)
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

// --- Component to display search results using SearchCard ---
function SearchResultsDisplay({ results, query }: { results: SpotifyTrack[], query: string }) {
  const router = useRouter();
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // This function remains the same, it will be passed to SearchCard's onClick
  const handleResultClick = async (track: SpotifyTrack) => {
    // Prevent triggering save if already saving this track or navigating
    if (isSavingId === track.id || isPending) return;

    setIsSavingId(track.id);
    setSaveError(null);

    const songDataToSave = {
      id: track.id,
      name: track.name,
      artist: track.artists?.map(a => a.name).join(', ') || null,
      album: track.album?.name || null,
      coverUrl: track.album?.images?.[0]?.url || null,
      spotifyUrl: track.external_urls?.spotify || null,
    };

    try {
      const saveResult = await saveSongAction(songDataToSave);

      if (saveResult.success && saveResult.songId) {
        console.log(`Saved song ${saveResult.songId}, navigating...`);
        startTransition(() => {
          router.push(`/musicgrid/${saveResult.songId}/view`);
        });
        // Keep isSavingId set during navigation transition
      } else {
        console.error('Failed to save song:', saveResult.error);
        setSaveError(saveResult.error || 'Failed to save song before navigating.');
        setIsSavingId(null); // Clear saving state only on error
      }
    } catch (error) {
      console.error('Error during save/navigation:', error);
      setSaveError('An unexpected error occurred.');
      setIsSavingId(null); // Clear saving state on error
    }
    // On success, navigation will unmount or transition, eventually resetting state.
    // If navigation fails or transition ends without unmounting, might need explicit reset.
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
      {saveError && <p className="text-red-500 text-center mb-4">Error: {saveError}</p>}

      {/* Use SearchCard component in the grid */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {results.map((track) => (
          <SearchCard
            key={track.id}
            track={track}
            onClick={handleResultClick} // Pass the handler function
            isSaving={isSavingId === track.id || isPending} // Indicate if this card is being processed or navigating
          />
        ))}
      </ul>
    </div>
  );
}

// --- Main Search Page Component (remains the same) ---
function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('query') || '';
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isSearching = query.trim().length > 0;

  useEffect(() => {
    if (isSearching) {
      const performSearch = async () => {
        setIsLoading(true);
        setError(null);
        setResults([]);
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
      setResults([]);
      setError(null);
      setIsLoading(false);
    }
  }, [query, isSearching]);

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

// --- Exported Page Component with Suspense Boundary (remains the same) ---
export default function SearchPage() {
 return (
    <Suspense fallback={<div className="text-center text-gray-500 mt-6">Loading search...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
