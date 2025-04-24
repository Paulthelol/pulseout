'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SignOut } from '@/lib/actions';
import { User, LogOut, TrendingUp, Library, Heart } from 'lucide-react'; // Example icons

export default function SideBar() {
  return (
    // --- Main Container ---
    // Default: Mobile Top Bar (flex-row, full width, fixed height)
    // md and up: Desktop Sidebar (flex-col, fixed width, full height)
    <aside className="
      flex flex-row items-center justify-between w-full h-16 px-4 py-2 box-border
      bg-[#2c2c2c] text-white antialiased
      md:flex-col md:justify-between md:w-[220px] md:h-screen md:p-5 md:overflow-y-auto
    ">
      {/* --- Top/Left Section (Logo & Nav) --- */}
      {/* Default: Mobile (flex-row, items-center) */}
      {/* md and up: Desktop (flex-col, items-start) */}
      <div className="flex flex-row items-center gap-4 md:flex-col md:items-start md:gap-0">
        {/* Logo */}
        {/* Add margin-bottom only on desktop */}
        <div className="shrink-0 md:mb-[30px]">
          <Link href="/musicgrid/trending"> {/* Link the logo */}
            <Image
                src="/logo.png" // Ensure this path is correct in your public folder
                alt="PulseOut Logo"
                width={120} // Slightly smaller for top bar flexibility
                height={34}
                priority // Prioritize loading the logo
            />
          </Link>
        </div>

        {/* Navigation Links */}
        {/* Default: Mobile (flex-row) */}
        {/* md and up: Desktop (flex-col) */}
        <nav className="flex flex-row items-center gap-4 md:flex-col md:items-start md:gap-[15px]">
          <Link href="/musicgrid/trending" className="flex items-center gap-2 text-sm text-white no-underline transition-colors duration-200 ease-in-out hover:underline hover:text-[#00ffcc]">
            <TrendingUp size={16} className="md:hidden" /> {/* Icon visible only on mobile */}
            <span className="hidden md:inline">Trending</span> {/* Text visible only on desktop */}
          </Link>
          <Link href="#" className="flex items-center gap-2 text-sm text-white no-underline transition-colors duration-200 ease-in-out hover:underline hover:text-[#00ffcc]">
             <Library size={16} className="md:hidden" />
             <span className="hidden md:inline">Genres</span>
          </Link>
          <Link href="/musicgrid/likes" className="flex items-center gap-2 text-sm text-white no-underline transition-colors duration-200 ease-in-out hover:underline hover:text-[#00ffcc]">
             <Heart size={16} className="md:hidden" />
             <span className="hidden md:inline">Likes</span>
          </Link>
        </nav>
      </div>

      {/* --- Bottom/Right Section (User Actions) --- */}
      {/* Default: Mobile (flex-row) */}
      {/* md and up: Desktop (flex-col) */}
      <div className="flex flex-row items-center gap-4 md:flex-col md:items-start md:gap-3">
        {/* My Profile Link */}
        <Link href="#" className="flex items-center gap-2 text-[13px] text-white no-underline transition-colors duration-200 ease-in-out hover:underline hover:text-[#00ffcc]">
           <User size={16} className="md:hidden" /> {/* Icon visible only on mobile */}
           <span className="hidden md:inline">My Profile</span> {/* Text visible only on desktop */}
        </Link>

        {/* Sign Out Button */}
        <div> {/* Keep form for semantic correctness */}
          <form action={SignOut}>
            <button type="submit" className="flex items-center gap-2 text-[13px] text-white no-underline bg-transparent border-none cursor-pointer transition-colors duration-200 ease-in-out hover:underline hover:text-[#00ffcc]">
              <LogOut size={16} className="md:hidden" /> {/* Icon visible only on mobile */}
              <span className="hidden md:inline">Sign Out</span> {/* Text visible only on desktop */}
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
