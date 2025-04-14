// app/musicgrid/trending/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getTrendingSongsAction } from '@/lib/actions'; // Import the action
import SongCard from '@/app/ui/song-card'; // Import the reusable card
import { Loader2, TrendingUp, ListEnd } from 'lucide-react'; // Icons

// Define the Song type based on the action's return data
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
};


const SONGS_PER_PAGE = 20; // Number of songs to fetch per batch

export default function TrendingPage() {
  const [songs, setSongs] = useState<SongWithCountsAndLikeInfo[]>([]);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Function to load songs (similar to LikedSongsPage)
  const loadSongs = useCallback(async (currentOffset: number, isInitial: boolean = false) => {
    if ((!isInitial && isLoading) || !hasMore) return;

    if (isInitial) setIsInitialLoading(true);
    else setIsLoading(true);
    setError(null);
    console.log(`Loading trending songs with offset: ${currentOffset}`);

    try {
      const result = await getTrendingSongsAction(SONGS_PER_PAGE, currentOffset);

      if (result.error) {
        setError(result.error);
        setHasMore(false);
      } else if (result.data) {
        setSongs((prevSongs) => currentOffset === 0 ? result.data! : [...prevSongs, ...result.data!]);
        setOffset(currentOffset + result.data.length);
        setHasMore(result.data.length === SONGS_PER_PAGE);
         if (result.data.length === 0 && currentOffset === 0) {
             console.log("No trending songs found.");
        }
      }
    } catch (err) {
      console.error("Failed to load trending songs:", err);
      setError('Failed to load songs. Please try again later.');
      setHasMore(false);
    } finally {
      if (isInitial) setIsInitialLoading(false);
      setIsLoading(false);
    }
  }, [isLoading, hasMore]);

  // Initial load effect
  useEffect(() => {
    loadSongs(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup Intersection Observer effect (same as LikedSongsPage)
  useEffect(() => {
    if (isInitialLoading || isLoading || !hasMore) {
        if (observerRef.current) observerRef.current.disconnect();
        return;
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          console.log("Load more element visible, fetching next trending page...");
          loadSongs(offset);
        }
      }, { threshold: 1.0 }
    );
    const currentLoadMoreRef = loadMoreRef.current;
    if (currentLoadMoreRef) observer.observe(currentLoadMoreRef);
    observerRef.current = observer;
    return () => {
      if (currentLoadMoreRef) observer.unobserve(currentLoadMoreRef);
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [isInitialLoading, isLoading, hasMore, loadSongs, offset]);

  // --- Render Logic ---
  if (isInitialLoading) {
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

  if (songs.length === 0) {
    return (
       <div className="text-center text-muted-foreground mt-10 p-4">
          No trending songs found right now.
       </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <TrendingUp size={24} /> Trending Songs
      </h1>

      {/* Grid for trending songs */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {songs.map((song) => (
          // Render the reusable SongCard for each song
          <SongCard key={song.id} song={song} />
        ))}
      </ul>

      {/* Subsequent loading indicator */}
      {isLoading && (
        <div className="flex justify-center items-center mt-6 p-4 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading more...
        </div>
      )}

      {/* Element to trigger loading more */}
      {!isLoading && hasMore && (
         <div ref={loadMoreRef} style={{ height: '10px' }} />
      )}

       {/* Message when no more songs are available */}
      {!isLoading && !hasMore && (
        <div className="text-center text-muted-foreground mt-6 p-4">
          <ListEnd className="inline-block mr-2" size={18} /> End of trending list.
        </div>
      )}
    </div>
  );
}
