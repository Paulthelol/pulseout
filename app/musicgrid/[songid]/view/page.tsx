'use client';

import Image from 'next/image';

export default function ViewSong() {
  return (
    <div className="ml-[220px] p-6">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* LEFT SIDE */}
        <div className="flex flex-col gap-4 w-full lg:w-[40%]">
          {/* Song Picture */}
          <div className="bg-gray-100 rounded-2xl shadow-md p-4">
            <Image
              src="/covers/placeholder_cover.jpg"
              alt="Song Cover"
              width={400}
              height={300}
              className="rounded-2xl w-full object-cover"
            />
          </div>

          {/* Likes and Comments Count */}
          <div className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
            <div className="text-sm text-gray-700">
              ❤️ 1.2K Likes
            </div>
            <div className="text-sm text-gray-700">
              💬 56 Comments
            </div>
            <button className="text-sm px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-500">
              Leave a Like
            </button>
          </div>

          {/* Artist Info */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="text-lg font-semibold mb-2">About the Artist</h2>
            <p className="text-sm text-gray-700">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent imperdiet orci sed lacus varius, ut vehicula ligula vestibulum.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE - Comments Section */}
        <div className="flex-1 bg-gray-100 rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Comments</h2>

          {/* List of Comments */}
          <div className="space-y-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-800">🔥 Love this track!</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-800">Been on repeat all day.</p>
            </div>
          </div>

          {/* Add a comment */}
          <form className="flex flex-col gap-3">
            <textarea
              placeholder="Write a comment..."
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={3}
            ></textarea>
            <button
              type="submit"
              className="self-start bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500"
            >
              Post Comment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
