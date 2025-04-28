'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getTrendingSongsAction } from '@/lib/actions'; // Import the action
import SongCard from '@/app/ui/song-card'; // Corrected path based on previous context
import { Loader2, TrendingUp, ListEnd } from 'lucide-react'; // Icons

// Define the Song type based on the action's return data
// Ensure this matches the type used in the action and SongCard
type SongWithCountsAndLikeInfo = {
  id: string;
  name: string;
  artist: string | null;
  album: string | null;
  coverUrl: string | null;
  spotifyUrl: string | null;
  addedAt: Date | null;
  likeCount: number;
  commentCount: number;
  userHasLiked: boolean;
  trending_score?: number;
  last_decayed_at?: Date | null;
};

const SONGS_PER_PAGE = 20; // Number of songs to fetch per batch

export default function TrendingPage() {
  const [songs, setSongs] = useState<SongWithCountsAndLikeInfo[]>([]);
  const offsetRef = useRef(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);

  // Function to load songs, wrapped in useCallback
  const loadSongs = useCallback(async (isInitialLoad: boolean = false) => {
    // Prevent fetching if already fetching OR if no more data is available
    if (isFetchingRef.current || !hasMore) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    if (isInitialLoad) {
      setIsInitialLoading(true);
      offsetRef.current = 0; // Reset offset for initial load
    }
    setError(null);

    const fetchOffset = offsetRef.current;

    try {
      // Call the server action
      const result = await getTrendingSongsAction(SONGS_PER_PAGE, fetchOffset);

      if (result.error) {
        console.error("Error fetching trending songs:", result.error);
        setError(result.error);
        setHasMore(false);
      } else if (result.data) {
        // Use functional state update for safety
        setSongs(prevSongs => {
          // **FIX: Duplicate Check**
          const existingSongIds = new Set(prevSongs.map(s => s.id));
          const newUniqueSongs = result.data!.filter(newSong => !existingSongIds.has(newSong.id));

          if (newUniqueSongs.length < result.data!.length) {
            console.warn("Pagination fetch included songs already present in the state. Filtering duplicates.");
          }

          // If it's the initial load, replace the state; otherwise, append unique new songs
          return fetchOffset === 0 ? newUniqueSongs : [...prevSongs, ...newUniqueSongs];
        });

        // Update the offset for the *next* potential fetch
        offsetRef.current = fetchOffset + result.data.length;

        // Determine if there are more songs based on whether a full page was received
        const moreAvailable = result.data.length === SONGS_PER_PAGE;
        setHasMore(moreAvailable);

      } else {
         // No data and no error probably means end of results
         setHasMore(false);
      }
    } catch (err) {
      console.error("Exception during song fetch:", err);
      setError('Failed to load songs due to an unexpected error.');
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
      isFetchingRef.current = false;
    }
  }, [hasMore]);

  // Effect for the initial data load
  useEffect(() => {
    if (songs.length === 0 && !isFetchingRef.current) {
      loadSongs(true);
    }
  }, [loadSongs, songs.length]);

  // Effect to set up the Intersection Observer for infinite scrolling
  useEffect(() => {
    if (isInitialLoading || isLoading || !hasMore) {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      return;
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting) {
        loadSongs();
      }
    };

    const observer = new IntersectionObserver(observerCallback, { threshold: 1.0 });
    const currentLoadMoreRef = loadMoreRef.current;

    if (currentLoadMoreRef) {
      observer.observe(currentLoadMoreRef);
    }
    observerRef.current = observer;

    return () => {
      if (currentLoadMoreRef) {
        observer.unobserve(currentLoadMoreRef);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isInitialLoading, isLoading, hasMore, loadSongs]);

  // --- Render Logic ---
  if (isInitialLoading && !error) {
    return (
      <div className="flex justify-center items-center mt-10 p-4 text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading Trending Songs...
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 mt-6 p-4">Error: {error}</div>;
  }

  if (!isInitialLoading && songs.length === 0) {
    return (
       <div className="text-center text-muted-foreground mt-10 p-4">
         No trending songs found right now.
       </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <TrendingUp size={24} /> Trending Songs
      </h1>

      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {songs.map((song) => (
          <SongCard key={song.id} song={song} />
        ))}
      </ul>

      {/* Subsequent loading indicator */}
      {isLoading && !isInitialLoading && (
        <div className="flex justify-center items-center mt-6 p-4 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading more...
        </div>
      )}

      {/* Element to trigger loading more */}
      {hasMore && !isLoading && (
         <div ref={loadMoreRef} style={{ height: '10px' }} aria-hidden="true" />
      )}

       {/* Message when no more songs are available */}
       {!isLoading && !hasMore && songs.length > 0 && (
         <div className="text-center text-muted-foreground mt-6 p-4">
           <ListEnd className="inline-block mr-2" size={18} /> End of trending list.
         </div>
       )}
    </div>
  );
}
