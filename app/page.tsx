'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function WelcomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-500 to-blue-400">
      <div className="bg-white/20 backdrop-blur-md px-10 py-12 rounded-xl shadow-lg space-y-6 max-w-md mx-auto text-center">
        {/* PulseOut Logo */}
        <Image
          src="/logo.svg"
          alt="PulseOut Logo"
          width={120}
          height={120}
          className="mx-auto"
        />

        {/* Welcome Text */}
        <h1 className="text-white text-2xl font-semibold">Welcome to PulseOut!</h1>

        {/* Log In Button */}
        <Link
          href="/login"
          className="block w-full text-center rounded-lg bg-green-600 px-6 py-4 text-white text-lg font-semibold hover:bg-green-500 transition-all duration-200"
        >
          Log In
        </Link>
      </div>
    </main>
  );
}
