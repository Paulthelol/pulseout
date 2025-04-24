import { auth } from '@/auth'; // Import NextAuth setup
import { getSongWithLikeInfoAction } from '@/lib/actions'; // Import server action to fetch song data
import { notFound } from 'next/navigation'; // Next.js function for 404 pages
import Image from 'next/image'; // Next.js Image component
import Link from 'next/link'; // Next.js Link component
import { ExternalLink } from 'lucide-react'; // Icon component
import LikeButton from '@/app/ui/like-button'; // Your LikeButton component (ensure path is correct)
import CommentSection from '@/app/ui/comment-section'; // Import the CommentSection component (ensure path is correct)

// Define the User type (ensure this matches the type used in CommentSection/actions)
// Consider moving this to a shared types file (e.g., types/index.ts)
type User = {
  id: string;
  name: string | null;
  image?: string | null;
};

// Define props for the page component, directly accessing params
interface PageProps {
  params: {
    songid: string; // Matches the dynamic segment [songid]
  };
  // searchParams?: { [key: string]: string | string[] | undefined }; // Optional search params
}

// The page component must be async to fetch data and session
export default async function SongViewPage({ params }: PageProps) {
    // Get songId directly from params
    const songid = params.songid;

    // Fetch song data using the server action
    // Using a separate async function for fetching can be good practice
    async function fetchData(id: string) {
      // Consider adding try/catch here for more granular error handling if needed
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

    // Prepare the currentUser object for the CommentSection component
    // Adapt this based on your actual session.user structure from NextAuth
    const currentUser: User | null = session?.user && session.user.id
        ? {
              id: session.user.id, // Ensure id is defined
              name: session.user.name ?? null, // Use nullish coalescing for name
              image: session.user.image ?? null, // Use nullish coalescing for image
          }
        : null; // Pass null if the user is not logged in

    // Render the page content
    return (
        // Using p-0 assuming padding is handled by the container or layout
        <div className="p-0">
            {/* Main layout using Flexbox, responsive direction */}
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
                                rel="noopener noreferrer" // Security best practice
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors text-xs font-medium w-full max-w-xs"
                            >
                                <ExternalLink size={14} />
                                Listen on Spotify
                            </Link>
                        )}

                        {/* Like Button Component */}
                        <LikeButton
                            songId={song.id} // Pass the fetched song ID
                            initialLiked={song.userHasLiked} // Pass initial like status
                            initialLikeCount={song.likeCount} // Pass initial like count
                        />
                    </div>

                    {/* Artist Info Card (Placeholder) */}
                    <div className="bg-card border border-border rounded-lg shadow p-4">
                        <h2 className="text-lg font-semibold mb-2">About the Artist</h2>
                        <p className="text-sm text-muted-foreground">
                            Artist biography placeholder. Fetch from Spotify API or another source if needed.
                        </p>
                    </div>
                </div>

                {/* --- RIGHT SIDE - Comments Section --- */}
                {/* Use flex-1 to allow this section to grow */}
                {/* min-w-0 prevents content overflow issues in flex layouts */}
                <div className="flex-1 bg-card border border-border rounded-lg shadow-md p-4 sm:p-6 min-w-0">
                    {/*
                       Render the CommentSection component here.
                       It's a Client Component ('use client') and handles its own data fetching and state.
                       Pass the songId and the prepared currentUser object.
                    */}
                    <CommentSection songId={song.id} currentUser={currentUser} />
                </div>

            </div>
        </div>
    );
}
