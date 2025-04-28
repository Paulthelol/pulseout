// app/musicgrid/profile/[profileid]/page.tsx

import { db } from '@/src/db';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import Image from 'next/image';
import { auth } from '@/auth';
import { getLikedSongsForUserAction } from '@/lib/actions';
import SongCard from '@/app/ui/song-card'; // Ensure this path is correct
import { notFound } from 'next/navigation'; // Import notFound


const nameToColorCache: Record<string, string> = {};
const tailwindColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  'bg-rose-500',
];

const getRandomBgColor = (name: string = '?'): string => {
  const initial = name.charAt(0).toUpperCase();
  if (nameToColorCache[initial]) return nameToColorCache[initial];
  const charCode = initial.charCodeAt(0);
  if (isNaN(charCode)) {
      return tailwindColors[tailwindColors.length - 1];
  }
  const colorIndex = charCode % tailwindColors.length;
  const color = tailwindColors[colorIndex];
  nameToColorCache[initial] = color;
  return color;
};

interface AvatarPlaceholderProps {
    username: string | null | undefined;
    sizeClasses?: string;
    textClasses?: string;
 }

const AvatarPlaceholder: React.FC<AvatarPlaceholderProps> = ({
    username,
    sizeClasses = 'h-full w-full',
    textClasses = 'text-xl sm:text-2xl md:text-3xl'
}) => {
  const nameStr = username || 'Anonymous';
  const initial = nameStr.charAt(0).toUpperCase() || '?';
  const bgColor = getRandomBgColor(nameStr);

  return (
    <div className={`${sizeClasses} rounded-full flex items-center justify-center ${bgColor} border`}>
      <span className={`text-white font-medium select-none ${textClasses}`}>{initial}</span>
    </div>
  );
};

interface PageProps {
  params: Promise<{ // Type params as a Promise again
    profileid: string;
  }>;
}

// Use the PageProps type expecting a Promise for params
export default async function ProfilePage({ params }: PageProps) {
  // Await params before accessing its properties
  const resolvedParams = await params;
  const profileUserId = resolvedParams.profileid;

  // Fetch session and user data
  const session = await auth();
  const viewingUserId = session?.user?.id;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, profileUserId))
    .limit(1);

  if (!user) {
    // Use notFound() for a standard 404 page
    notFound();
  }

  // Fetch liked songs
  const likedSongsResult = await getLikedSongsForUserAction(profileUserId, viewingUserId);

  if (likedSongsResult.error) {
    // Log the error for debugging, but maybe don't crash the page
    console.error('Error fetching liked songs:', likedSongsResult.error);
  }

  const likedSongs = likedSongsResult.data ?? [];

  // --- Render Logic ---
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col items-center text-center md:flex-row md:items-center md:text-left gap-4 mb-6 border-b pb-4">
        <div className="relative h-20 w-20 md:h-24 md:w-24 flex-shrink-0 overflow-hidden rounded-full mb-3 md:mb-0">
          {user.image ? (
            <Image
              src={user.image}
              alt={`${user.name || 'User'}'s profile picture`}
              fill
              sizes="(max-width: 768px) 80px, 96px"
              className="object-cover"
              priority
            />
          ) : (
            <AvatarPlaceholder
                username={user.name}
                textClasses="text-3xl md:text-4xl"
            />
          )}
        </div>
        {/* Username - Adjusted text size */}
        <h1 className="text-2xl md:text-6xl font-bold break-words">
            {user.name || 'Unnamed User'}
        </h1>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Liked Songs</h2>
        {likedSongs.length > 0 ? (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {likedSongs.map((song) => (
              // Ensure SongCard type matches the data from getLikedSongsForUserAction
              <SongCard key={song.id} song={song as any} />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            {user.name || 'This user'} hasn't liked any songs yet.
          </p>
        )}
      </div>
    </div>
  );
}
