'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Music2 } from 'lucide-react';
import LikeButton from './like-button'; // Import the existing LikeButton

// Define the expected props based on the data from getTrendingSongsAction
type SongWithCountsAndLikeInfo = {
  id: string;
  name: string;
  artist: string | null;
  album: string | null;
  coverUrl: string | null;
  spotifyUrl: string | null; // Keep if you want a direct Spotify link
  addedAt: Date | null;
  likeCount: number;
  commentCount: number;
  userHasLiked: boolean;
};

interface SongCardProps {
  song: SongWithCountsAndLikeInfo;
}

export default function SongCard({ song }: SongCardProps) {
  return (
    <li className="group bg-card p-3 rounded-lg shadow hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-in-out flex flex-col">
      {/* Link wrapping the main content to navigate to the song view page */}
      <Link href={`/musicgrid/${song.id}/view`} className="flex-grow flex flex-col">
        {/* Image */}
        <div className="aspect-square mb-2 relative overflow-hidden rounded-md">
          {song.coverUrl ? (
            <Image
              src={song.coverUrl}
              alt={`Album art for ${song.album || song.name}`}
              fill
              sizes="(max-width: 640px) 90vw, (max-width: 768px) 45vw, (max-width: 1024px) 30vw, (max-width: 1280px) 22vw, 18vw"
              // Changed: group-hover:scale-110
              className="object-cover group-hover:scale-110 transition-transform duration-300 ease-in-out"
            />
          ) : (
            <div className="w-full h-full bg-muted rounded-md flex items-center justify-center text-muted-foreground">
              <Music2 size={40} />
            </div>
          )}
        </div>
        {/* Text Info */}
        <div className="overflow-hidden mt-1">
          <p className="text-sm font-medium text-foreground truncate" title={song.name}>
            {song.name}
          </p>
          <p className="text-xs text-muted-foreground truncate" title={song.artist ?? ''}>
            {song.artist || 'Unknown Artist'}
          </p>
        </div>
      </Link>

      {/* Actions (Like Button and Comment Count) - Placed below the link */}
      <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/50">
        {/* Like Button */}
        <LikeButton
          songId={song.id}
          initialLiked={song.userHasLiked}
          initialLikeCount={song.likeCount}
        />

        {/* Comment Count/Link */}
        <Link
          href={`/musicgrid/${song.id}/view#comments`} // Link to comments section on view page
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          title={`${song.commentCount} comments`}
         >
          <MessageCircle size={14} />
          <span>{song.commentCount}</span>
        </Link>
      </div>
    </li>
  );
}
