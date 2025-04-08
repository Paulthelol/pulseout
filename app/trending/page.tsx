'use client';
import Link from 'next/link'; 

const trendingSongs = [
  {
    id: 1,
    title: 'Random song',
    image: '',
    likes: 1200,
    comments: 56,
  },
  // Add more songs...
];

export default function TrendingPage() {
  return (
    <div className="ml-[40px] mr-6">
      <h1 className="text-2xl font-bold mb-6 text-white">Trending Songs</h1>
      <div className="bg-gray-100 rounded-xl p-6 shadow-md">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {trendingSongs.map((song) => (
            <div
              key={song.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
            >
              <img
                src={song.image || 'https://via.placeholder.com/150'}
                alt={song.title}
                className="w-full h-32 object-cover rounded-t-xl"
              />
              <div className="p-4">
                <h2 className="text-sm font-semibold truncate mb-2">
                  <Link
                    href={`/musicgrid/${song.id}/view`}
                    className="hover:underline text-blue-600"
                  >
                    {song.title}
                  </Link>
                </h2>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">❤️ {song.likes}</span>
                  <span className="flex items-center gap-1">💬 {song.comments}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
