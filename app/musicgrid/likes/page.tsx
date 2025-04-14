'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getLikedSongsAction } from '@/lib/actions'; // Import the action
import SongCard from '@/app/ui/song-card'; // *** Import SongCard ***
import { Loader2, Heart, HeartOff, ListEnd } from 'lucide-react'; // Icons

// --- Use the richer type definition ---
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
  // likedAt might also be present from the query if needed
};


const SONGS_PER_PAGE = 20;

export default function LikedSongsPage() {
  // --- Update state type ---
  const [songs, setSongs] = useState<SongWithCountsAndLikeInfo[]>([]);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Function to load songs (logic remains similar, types handled by action/state)
  const loadSongs = useCallback(async (currentOffset: number, isInitial: boolean = false) => {
    if ((!isInitial && isLoading) || !hasMore) return;

    if (isInitial) setIsInitialLoading(true);
    else setIsLoading(true);
    setError(null);
    console.log(`Loading liked songs with offset: ${currentOffset}`);

    try {
      const result = await getLikedSongsAction(SONGS_PER_PAGE, currentOffset);

      if (result.error) {
        setError(result.error);
        setHasMore(false);
      } else if (result.data) {
        // Append new songs (type should match now)
        setSongs((prevSongs) => currentOffset === 0 ? result.data! : [...prevSongs, ...result.data!]);
        setOffset(currentOffset + result.data.length);
        setHasMore(result.data.length === SONGS_PER_PAGE);
         if (result.data.length === 0 && currentOffset === 0) {
             console.log("User has no liked songs.");
        }
      }
    } catch (err) {
      console.error("Failed to load liked songs:", err);
      setError('Failed to load songs. Please try again later.');
      setHasMore(false);
    } finally {
      if (isInitial) setIsInitialLoading(false);
      setIsLoading(false);
    }
  // Removed offset from deps as loadSongs call provides it, preventing potential infinite loop if state updates trigger effect too quickly
  }, [isLoading, hasMore]);

  // Initial load effect (no change)
  useEffect(() => {
    loadSongs(0, true);
  }, []); // Run only once on mount

  // Setup Intersection Observer effect
   useEffect(() => {
    if (isInitialLoading || isLoading || !hasMore) {
        if (observerRef.current) observerRef.current.disconnect();
        return;
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          console.log("Load more element visible, fetching next liked page...");
          loadSongs(offset); // Load next batch using the current offset state
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
  // Add offset back to dependencies as loadSongs relies on it for subsequent fetches
  }, [isInitialLoading, isLoading, hasMore, loadSongs, offset]);


  // --- Render Logic ---
  if (isInitialLoading) {
    return (
      <div className="flex justify-center items-center mt-10 p-4 text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading Liked Songs...
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 mt-6 p-4">Error: {error}</div>;
  }

  if (songs.length === 0) {
    return (
       <div className="text-center text-muted-foreground mt-10 p-4">
          You haven't liked any songs yet.
       </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Heart size={24} className="text-red-500" /> Liked Songs
      </h1>

      {/* Grid for liked songs - Use SongCard */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {songs.map((song) => (
          // *** Render the reusable SongCard for each liked song ***
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
          <ListEnd className="inline-block mr-2" size={18} /> End of liked songs.
        </div>
      )}
    </div>
  );
}