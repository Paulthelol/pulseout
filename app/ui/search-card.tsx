// written by: Paul
  // tested by: Paul, Andrew, Jordan, Others...
  'use client';

import Image from 'next/image';
import { Music2 } from 'lucide-react';

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

interface SearchCardProps {
  track: SpotifyTrack;
  onClick: (track: SpotifyTrack) => void; // Function to call when card is clicked
  isSaving: boolean; // To visually indicate loading/disabled state
}

export default function SearchCard({ track, onClick, isSaving }: SearchCardProps) {
  // Combine artist names for display
  const artistNames = track.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
  const coverUrl = track.album?.images?.[0]?.url;

  return (
    <li
      className={`bg-card p-3 rounded-lg shadow hover:shadow-md transition-shadow flex flex-col ${
        isSaving ? 'opacity-50 cursor-wait' : 'cursor-pointer' // Add cursor and opacity feedback
      }`}
      onClick={() => !isSaving && onClick(track)} // Trigger onClick only if not saving
      title={`View details for ${track.name} by ${artistNames}`} // Tooltip for clarity
      role="button" // Indicate it's clickable
      aria-disabled={isSaving} // Accessibility: indicate disabled state
      tabIndex={isSaving ? -1 : 0} // Make it focusable unless disabled
      onKeyDown={(e) => { // Allow activation with Enter/Space keys
        if (!isSaving && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault(); // Prevent default space scroll
          onClick(track);
        }
      }}
    >
      {/* Image */}
      <div className="aspect-square mb-2 relative overflow-hidden rounded-md">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={`Album art for ${track.album?.name || track.name}`}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 768px) 45vw, (max-width: 1024px) 30vw, (max-width: 1280px) 22vw, 18vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
          />
        ) : (
          <div className="w-full h-full bg-muted rounded-md flex items-center justify-center text-muted-foreground">
            <Music2 size={40} />
          </div>
        )}
      </div>
      {/* Text Info */}
      <div className="overflow-hidden mt-1 flex-grow"> {/* Use flex-grow to push content up */}
        <p className="text-sm font-medium text-foreground truncate" title={track.name}>
          {track.name}
        </p>
        <p className="text-xs text-muted-foreground truncate" title={artistNames}>
          {artistNames}
        </p>
      </div>
      {/* No like/comment section */}
      {/* Optional: Add a subtle indicator if isSaving is true */}
      {isSaving && (
         <div className="text-center text-xs text-muted-foreground mt-2">Saving...</div>
      )}
    </li>
  );
}
