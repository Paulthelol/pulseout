// app/musicgrid/[songid]/view/page.tsx
import { getSongWithLikeInfoAction } from '@/lib/actions';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import LikeButton from '@/app/ui/like-button';
// import CommentSection from '@/app/ui/musicgrid/comment-section'; // Placeholder

// --- Update the PageProps interface ---
interface PageProps {
  // Define params as a Promise resolving to the expected object structure
  params: Promise<{
    songid: string; // Matches the dynamic segment [songid]
  }>;
}

// Page remains async
export default async function SongViewPage({ params }: PageProps) {

  // --- Await the params Promise as required ---
  const resolvedParams = await params;
  const songid = resolvedParams.songid;
  // Or directly: const { songid } = await params;

  // --- Fetch data using the resolved songid ---
  async function fetchData(id: string) {
    return await getSongWithLikeInfoAction(id);
  }
  const { data: song, error } = await fetchData(songid);


  // If there was an error fetching or the song wasn't found, show a not found page
  if (error || !song) {
    console.error(`Song view page error for ID ${songid}:`, error || 'Not found');
    notFound();
  }

  // Render the song details (JSX remains the same)
  return (
    <div className="p-0"> {/* Padding is handled by layout */}
      <div className="flex flex-col lg:flex-row gap-6 md:gap-10">

        {/* --- LEFT SIDE --- */}
        <div className="flex flex-col gap-4 w-full lg:w-[40%] xl:w-[35%] flex-shrink-0">
          {/* Song Picture */}
          <div className="bg-card border border-border rounded-lg shadow-md p-4">
            {song.coverUrl ? (
              <Image
                src={song.coverUrl}
                alt={`Album art for ${song.album || song.name}`}
                width={400}
                height={400}
                className="rounded-md w-full object-cover aspect-square"
                priority
              />
            ) : (
              <div className="aspect-square bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                No Image
              </div>
            )}
          </div>

          {/* Song Info & Actions */}
          <div className="bg-card border border-border rounded-lg shadow p-4 flex flex-col items-center gap-3">
             <h1 className="text-xl font-semibold text-foreground text-center">{song.name}</h1>
             <p className="text-md text-muted-foreground text-center">{song.artist || 'Unknown Artist'}</p>
             <p className="text-sm text-muted-foreground/80 text-center mb-2">{song.album || 'Unknown Album'}</p>

            {/* Spotify Link */}
            {song.spotifyUrl && (
                <Link
                  href={song.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors text-xs font-medium w-full max-w-xs"
                >
                  <ExternalLink size={14} />
                  Listen on Spotify
                </Link>
              )}

            {/* Like Button & Count */}
            <LikeButton
                songId={song.id} // Use song.id here after song is fetched
                initialLiked={song.userHasLiked}
                initialLikeCount={song.likeCount}
            />
          </div>

          {/* Artist Info (Placeholder) */}
          <div className="bg-card border border-border rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">About the Artist</h2>
            <p className="text-sm text-muted-foreground">
              Artist biography would go here. Fetch from Spotify API or another source if needed.
            </p>
          </div>
        </div>

        {/* --- RIGHT SIDE - Comments Section (Placeholder) --- */}
        <div className="flex-1 bg-card border border-border rounded-lg shadow-md p-6 min-w-0"> {/* Allow shrinking */}
          <h2 className="text-xl font-semibold mb-4">Comments</h2>

          {/* Placeholder for actual comment loading and display */}
          <div className="space-y-4 mb-6">
            <p className="text-muted-foreground text-sm">Comment loading and display component needed here.</p>
            {/* Example static comments */}
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-foreground">User1: Great track!</p>
            </div>
             <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-foreground">User2: Added to my playlist.</p>
            </div>
          </div>

          {/* Add a comment form (Placeholder) */}
           <div>
             <h3 className="text-md font-semibold mb-2">Leave a Comment</h3>
             <form className="flex flex-col gap-3">
               <textarea
                 placeholder="Write a comment..."
                 className="w-full rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                 rows={3}
                 // Add state and handlers for controlled component
               ></textarea>
               <button
                 type="submit" // Add onSubmit handler to form
                 className="self-start bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 text-sm"
               >
                 Post Comment
               </button>
             </form>
           </div>
           {/* <CommentSection songId={song.id} /> You would use your comment component here */}
        </div>
      </div>
    </div>
  );
}
