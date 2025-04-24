'use client';

import Image from 'next/image';
import { authenticateSpotify, authenticateGoogle } from '@/lib/actions';
import { useSearchParams } from 'next/navigation';
import { useActionState } from 'react';
import { Loader2 } from 'lucide-react'; // Import Loader icon

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/musicgrid';

  // Action state for Spotify
  const [spotifyErrorMessage, spotifyAction, isSpotifyPending] = useActionState(
    authenticateSpotify, // Pass the original action
    undefined // Initial state for error message
  );

  // Action state for Google
  // Initial state is undefined (or null), error message might not be used much here
  const [googleErrorMessage, googleAction, isGooglePending] = useActionState(
    authenticateGoogle, // Pass the original action
    undefined // Initial state for error message
  );

  return (
    <div className="py-10 bg-white/20 backdrop-blur-md px-10 rounded-xl space-y-6 max-w-md mx-auto text-center shadow-lg">
      {/* PulseOut Logo */}
      <Image
        src="/logo.png"
        alt="PulseOut Logo"
        width={120}
        height={120}
        className="mx-auto"
        priority
      />

      <h1 className="text-white text-2xl font-semibold">Welcome to PulseOut!</h1>

      {/* Spotify Login Form */}
      {/* Use the original action here, useActionState handles the rest */}
      <form action={spotifyAction} className="space-y-3">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <button
          className="w-full flex items-center justify-center gap-3 text-xl rounded-lg bg-black px-6 py-4 text-white font-semibold hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1DB954] active:bg-zinc-900 transition-all duration-200 disabled:opacity-50"
          type="submit"
          disabled={isSpotifyPending || isGooglePending} // Disable if either is pending
          aria-disabled={isSpotifyPending || isGooglePending}
        >
          {isSpotifyPending ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Image
              src="/Spotify_logo_without_text.svg"
              alt="Spotify Logo"
              width={32}
              height={32}
            />
          )}
          {isSpotifyPending ? 'Logging in...' : 'Log in with Spotify'}
        </button>
        {spotifyErrorMessage && (
          <p className="text-sm text-red-400">{spotifyErrorMessage}</p>
        )}
      </form>

      {/* Google Login Form */}
      {/* Use the original action here */}
      <form action={googleAction} className="space-y-3">
         {/* You might want to pass callbackUrl to Google too */}
         {/* <input type="hidden" name="callbackUrl" value={callbackUrl} /> */}
         <button
           className="w-full flex items-center justify-center gap-3 text-xl rounded-lg bg-white px-6 py-4 text-gray-700 font-semibold hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:bg-gray-300 transition-all duration-200 disabled:opacity-50"
           type="submit"
           disabled={isGooglePending || isSpotifyPending} // Disable if either is pending
           aria-disabled={isGooglePending || isSpotifyPending}
         >
           {isGooglePending ? (
                <Loader2 className="h-7 w-7 animate-spin text-gray-600" />
           ) : (
                <Image
                    src="/Google__G__logo.svg" // Replace with your actual Google logo path
                    alt="Google Logo"
                    width={28}
                    height={28}
                />
           )}
           {isGooglePending ? 'Logging in...' : 'Log in with Google'}
         </button>
         {/* Display Google-specific error message if needed */}
         {googleErrorMessage && (
             <p className="text-sm text-red-400">{googleErrorMessage}</p>
         )}
      </form>

    </div>
  );
}