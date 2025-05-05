// written by: Paul
  // tested by: Paul, Andrew, Jordan, Others...
'use client';

import React, { useState, useTransition } from 'react';
import { Heart } from 'lucide-react'; // Using lucide-react icon
import { toggleLikeSongAction } from '@/lib/actions'; // Import the action

interface LikeButtonProps {
  songId: string;
  initialLiked: boolean;
  initialLikeCount: number;
}

export default function LikeButton({ songId, initialLiked, initialLikeCount }: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isPending, startTransition] = useTransition(); // Pending state for the action
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (isPending) return; // Don't do anything if already processing

    setError(null); // Clear previous errors

    // Optimistic UI update
    const previousLiked = isLiked;
    const previousCount = likeCount;
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

    startTransition(async () => {
      try {
        const result = await toggleLikeSongAction(songId);
        if (result.error) {
          console.error("Like action failed:", result.error);
          setError(result.error);
          // Revert optimistic update on error
          setIsLiked(previousLiked);
          setLikeCount(previousCount);
        } else {
          console.log("Like action successful:", result);
        }
      } catch (err) {
        console.error("Error calling toggleLikeSongAction:", err);
        setError("Failed to update like status.");
        // Revert optimistic update on error
        setIsLiked(previousLiked);
        setLikeCount(previousCount);
      }
    });
  };

  return (
    <div className="flex flex-col items-center space-y-1">
       {/* Display error if any */}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-colors text-sm font-medium border ${
          isLiked
            ? 'bg-red-100 text-red-600 border-red-300 hover:bg-red-200'
            : 'bg-secondary text-secondary-foreground border-border hover:bg-accent'
        } ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
        aria-label={isLiked ? 'Unlike this song' : 'Like this song'}
      >
        <Heart
          size={18}
          fill={isLiked ? 'currentColor' : 'none'} // Fill heart if liked
          className={isLiked ? 'text-red-500' : 'text-muted-foreground'}
        />
        <span>{isPending ? '...' : (isLiked ? 'Liked' : 'Like')}</span>
      </button>
      {/* Like Count Display */}
      <span className="text-xs text-muted-foreground">
        {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
      </span>

    </div>
  );
}
