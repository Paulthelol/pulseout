'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function WelcomePage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-blue-400">
      <div className="text-center backdrop-blur-md py-12 rounded-xl shadow-lg space-y-6 max-w-md w-full">
        <Image
          src="/logo.png"
          alt="PulseOut Logo"
          width={120}
          height={120}
          className="mx-auto"
        />
        <h1 className="text-white text-3xl font-semibold">Welcome to PulseOut!</h1>
          
        <Link
          href="/login"
          className="inline-block rounded-lg bg-green-600 px-10 py-5 text-white text-lg font-semibold transition-colors hover:bg-green-500"
        >
          Log In
        </Link>
      </div>
    </main>
  );
}
