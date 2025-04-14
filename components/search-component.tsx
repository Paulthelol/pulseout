// app/musicgrid/search/search-component.tsx
'use client';

import { useState } from 'react';
import { searchSpotifyAction } from '../lib/actions'; // Adjusted path to the correct module
import Image from 'next/image'; // Import Next.js Image component

// Define a type for the track data you expect
interface SpotifyTrack {
    id: string;
    name: string;
    artists: { name: string }[];
    album: {
        name: string;
        images: { url: string; height: number; width: number }[];
    };
    external_urls: {
        spotify: string;
    };
}


export default function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults([]); // Clear previous results

    try {
      const searchResult = await searchSpotifyAction(query);

      if (searchResult.error) {
        setError(searchResult.error);
        setResults([]);
      } else if (searchResult.data) {
        setResults(searchResult.data as SpotifyTrack[]); // Type assertion
      } else {
         setResults([]); // Handle case where data is unexpectedly null/undefined
      }

    } catch (err: any) {
      console.error("Search failed:", err);
      setError(err.message || 'An unexpected error occurred.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter song name or artist..."
          className="flex-grow p-2 border rounded text-black" // Added text-black for visibility
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          disabled={isLoading || !query}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="text-red-500">Error: {error}</p>}

      {/* Results Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((track) => (
              <div key={track.id} className="bg-gray-800 p-4 rounded shadow text-white">
                  {track.album.images?.[0]?.url && (
                       <Image // Use Next.js Image component
                          src={track.album.images[0].url}
                          alt={`Cover for ${track.album.name}`}
                          width={150} // Specify width
                          height={150} // Specify height
                          className="w-full h-auto mb-2 rounded"
                       />
                  )}
                  <h3 className="font-bold truncate">{track.name}</h3>
                  <p className="text-sm text-gray-400 truncate">
                      {track.artists.map(artist => artist.name).join(', ')}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{track.album.name}</p>
                   <a
                      href={track.external_urls.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-600 text-xs"
                   >
                       Listen on Spotify
                   </a>
              </div>
          ))}
      </div>

    </div>
  );
}