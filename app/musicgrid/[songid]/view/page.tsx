// written by: Paul and Jordan
  // tested by: Paul, Andrew, Jordan, Others...
  import { auth } from '@/auth';
import { getSongWithLikeInfoAction } from '@/lib/actions';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import LikeButton from '@/app/ui/like-button';
import CommentSection from '@/app/ui/comment-section';

type User = {
  id: string;
  name: string | null;
  image?: string | null;
};

interface PageProps {
  // Define params as a Promise resolving to the expected object structure
  params: Promise<{
    songid: string; // Matches the dynamic segment [songid]
  }>;
}

// The page component must be async to fetch data and session
export default async function SongViewPage({ params }: PageProps) {
    // Get songId directly from params
    const resolvedParams = await params;
    const songid = resolvedParams.songid;

    // Fetch song data using the server action
    async function fetchData(id: string) {
      return await getSongWithLikeInfoAction(id);
    }
    const { data: song, error: fetchError } = await fetchData(songid);

    // If song data fetching failed or song not found, render 404 page
    if (fetchError || !song) {
        console.error(`Song view page error for ID ${songid}:`, fetchError || 'Not found');
        notFound(); // Trigger Next.js 404 page
    }

    // Fetch session data on the server
    const session = await auth();

    const currentUser: User | null = session?.user && session.user.id
        ? {
              id: session.user.id,
              name: session.user.name ?? null, 
              image: session.user.image ?? null,
          }
        : null; // Pass null if the user is not logged in

    // Render the page content
    return (
        <div className="p-0">
            <div className="flex flex-col lg:flex-row gap-6 md:gap-10">

                {/* --- LEFT SIDE - Song Details & Actions --- */}
                <div className="flex flex-col gap-4 w-full lg:w-[40%] xl:w-[35%] flex-shrink-0">
                    {/* Album Art Card */}
                    <div className="bg-card border border-border rounded-lg shadow-md p-4">
                        {song.coverUrl ? (
                            <Image
                                src={song.coverUrl}
                                alt={`Album art for ${song.album || song.name}`}
                                width={400} // Specify appropriate dimensions
                                height={400}
                                className="rounded-md w-full object-cover aspect-square" // Maintain aspect ratio
                                priority // Prioritize loading this image
                            />
                        ) : (
                            // Placeholder if no image URL
                            <div className="aspect-square bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                                No Image Available
                           ,</div>
                        )}
                    </div>

                    {/* Song Info & Actions Card */}
                    <div className="bg-card border border-border rounded-lg shadow p-4 flex flex-col items-center gap-3">
                        <h1 className="text-xl font-semibold text-foreground text-center">{song.name}</h1>
                        <p className="text-md text-muted-foreground text-center">{song.artist || 'Unknown Artist'}</p>
                        <p className="text-sm text-muted-foreground/80 text-center mb-2">{song.album || 'Unknown Album'}</p>

                        {/* Spotify Link Button */}
                        {song.spotifyUrl && (
                            <Link
                                href={song.spotifyUrl}
                                target="_blank" // Open in new tab
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors text-xs font-medium w-full max-w-xs"
                            >
                                <ExternalLink size={14} />
                                Listen on Spotify
                            </Link>
                        )}

                        {/* Like Button Component */}
                        <LikeButton
                            songId={song.id}
                            initialLiked={song.userHasLiked}
                            initialLikeCount={song.likeCount}
                        />
                    
                    </div>

                    {/* Artist Info Card (Placeholder) (Ended up not using this component)
                    <div className="bg-card border border-border rounded-lg shadow p-4">
                        <h2 className="text-lg font-semibold mb-2">About the Artist</h2>
                        <p className="text-sm text-muted-foreground">
                            Artist biography placeholder. Fetch from Spotify API or another source if needed.
                        </p>
                    </div>
                    */}
                </div>

                {/* --- RIGHT SIDE - Comments Section --- */}
                <div className="flex-1 bg-card border border-border rounded-lg shadow-md p-4 sm:p-6 min-w-0">
                    <CommentSection songId={song.id} currentUser={currentUser} />
                </div>

            </div>
        </div>
    );
}
