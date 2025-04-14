// app/ui/musicgrid/track-card.tsx
import Image from 'next/image';
import Link from 'next/link'; // Although not used for Spotify link, keep for potential internal links

// Define the props the component accepts
interface TrackCardProps {
  imageUrl: string;
  title: string;
  artist: string;
  spotifyUrl?: string; // Optional Spotify link
  // Add other props if needed, e.g., internal link URL, onClick handler
}

export default function TrackCard({ imageUrl, title, artist, spotifyUrl }: TrackCardProps) {

  // The main content of the card
  const cardContent = (
    <div className="flex flex-col items-start text-left group bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out h-full">
      {/* Image Container: Fixed aspect ratio */}
      <div className="relative w-full aspect-square overflow-hidden">
        <Image
          src={imageUrl}
          alt={`Album art for ${title} by ${artist}`}
          fill // Use fill to make image cover the container
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16.6vw" // Define responsive image sizes
          style={{ objectFit: 'cover' }} // Ensure image covers the area without distortion
          className="transition-transform duration-300 ease-in-out group-hover:scale-105" // Subtle zoom on hover
          onError={(e) => {
            // Fallback placeholder image if the provided URL fails
            e.currentTarget.src = `https://placehold.co/300x300/222/eee?text=${encodeURIComponent(title.charAt(0) || '?')}`;
            e.currentTarget.srcset = ""; // Clear srcset to prevent browser trying other failed sources
          }}
          unoptimized={imageUrl.startsWith('https://placehold.co')} // Avoid optimizing placeholder images
        />
        {/* Optional: Add an overlay or play button on hover if desired */}
        {/* <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-opacity duration-300 ease-in-out opacity-0 group-hover:opacity-100">
           <PlayIcon className="h-10 w-10 text-white" /> // Example using a hypothetical PlayIcon
        </div> */}
      </div>

      {/* Text Content Area */}
      <div className="p-3 flex flex-col justify-between flex-grow w-full">
        <div>
          {/* Track Title: Truncate if too long */}
          <h3
            className="text-sm font-semibold truncate text-black dark:text-white"
            title={title} // Show full title on hover
          >
            {title}
          </h3>
          {/* Artist Name: Truncate if too long */}
          <p
            className="text-xs text-gray-600 dark:text-gray-400 truncate"
            title={artist} // Show full artist name on hover
          >
            {artist}
          </p>
        </div>
      </div>
    </div>
  );

  // If a Spotify URL is provided, wrap the card content in an anchor tag
  if (spotifyUrl) {
    return (
      <a
        href={spotifyUrl}
        target="_blank" // Open link in a new tab
        rel="noopener noreferrer" // Security measure for target="_blank"
        className="block focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-black rounded-lg" // Add focus styles for accessibility
        aria-label={`Listen to ${title} by ${artist} on Spotify`} // Accessibility label
      >
        {cardContent}
      </a>
    );
  }

  // If no Spotify URL, just return the card content (e.g., for display only or internal linking)
  return cardContent;
}
