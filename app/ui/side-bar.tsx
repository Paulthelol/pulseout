// written by: Paul and Jordan
  // tested by: Paul, Andrew, Jordan, Others...
  'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react'; // Import useSession
import { SignOut } from '@/lib/actions';
import { User, LogOut, TrendingUp, Heart, Loader2, MicVocal } from 'lucide-react'; // Added Loader2 for loading state

export default function SideBar() {
  // Get session data and status
  const { data: session, status } = useSession();
  const userId = session?.user?.id; // Safely access the user ID

  return (
    // --- Main Container ---
    <aside className="
      flex flex-row items-center justify-between w-full h-16 px-4 py-2 box-border
      bg-[#2c2c2c] text-white antialiased
      md:flex-col md:justify-between md:w-[220px] md:h-screen md:py-5 md:pr-5 md:overflow-y-auto
    ">
      {/* --- Top/Left Section (Logo & Nav) --- */}
      <div className="flex flex-row items-center gap-4 md:flex-col md:items-start md:gap-0">
        {/* Logo */}
        <div className="pb-2 shrink-0 md:mb-[30px]">
          <Link href="/musicgrid/trending">
            <Image
                src="/logo.svg" // Ensure this path is correct in your public folder
                alt="PulseOut Logo"
                width={100}
                height={34}
                priority
            />
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-row items-center gap-6 md:flex-col md:items-start md:gap-[15px]">
          <Link href="/musicgrid/trending" className="flex items-center gap-2 text-sm text-white no-underline transition-colors duration-200 ease-in-out hover:underline hover:text-[#00ffcc]">
            <TrendingUp size={22} className="md:hidden" />
            <span className="hidden md:inline">Trending</span>
          </Link>
          <Link href="#" className="flex items-center gap-2 text-sm text-white no-underline transition-colors duration-200 ease-in-out hover:underline hover:text-[#00ffcc]">
             <MicVocal size={22} className="md:hidden" />
             <span className="hidden md:inline">Artists</span>
          </Link>
          <Link href="/musicgrid/likes" className="flex items-center gap-2 text-sm text-white no-underline transition-colors duration-200 ease-in-out hover:underline hover:text-[#00ffcc]">
             <Heart size={22} className="md:hidden" />
             <span className="hidden md:inline">Likes</span>
          </Link>
        </nav>
      </div>

      {/* --- Bottom/Right Section (User Actions) --- */}
      <div className="flex flex-row items-center gap-4 md:flex-col md:items-start md:gap-3">
        {/* My Profile Link - Conditionally render based on session status */}
        {status === 'loading' && (
           // Optional: Show a loading indicator while session is being fetched
           <div className="flex items-center gap-2 text-[13px] text-gray-400">
             <Loader2 size={16} className="animate-spin md:hidden" />
             <span className="hidden md:inline">Loading...</span>
           </div>
        )}
        {status === 'authenticated' && (
          <Link
            href={`/musicgrid/profile/${userId}/viewprofile`} // Dynamic href using userId
            className="flex items-center gap-2 text-[13px] text-white no-underline transition-colors duration-200 ease-in-out hover:underline hover:text-[#00ffcc]"
          >
             <User size={22} className="md:hidden" />
             <span className="hidden md:inline">My Profile</span>
          </Link>
        )}
        {/* You might want to show a "Sign In" link if status === 'unauthenticated' */}

        {/* Sign Out Button - Only show if authenticated */}
        {status === 'authenticated' && (
          <div>
            <form action={SignOut}>
              <button type="submit" className="flex items-center gap-2 text-[13px] text-white no-underline bg-transparent border-none cursor-pointer transition-colors duration-200 ease-in-out hover:underline hover:text-[#00ffcc]">
                <LogOut size={22} className="md:hidden" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
