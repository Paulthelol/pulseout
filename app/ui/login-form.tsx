'use client';

import Image from 'next/image';
import { authenticateSpotify } from '@/lib/actions';
import { useSearchParams } from 'next/navigation';
import { useActionState } from 'react';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/musicgrid';
  const [errorMessage, formAction, isPending] = useActionState(
    authenticateSpotify,
    undefined
  );

  return (
    <form action={formAction}>
      <div className="py-10 bg-white/20 backdrop-blur-md px-10 rounded-xl space-y-6 max-w-md mx-auto text-center shadow-lg">
        {/* PulseOut Logo */}
        <Image
          src="/logo.png"
          alt="PulseOut Logo"
          width={120}
          height={120}
          className="mx-auto"
        />

        <h1 className="text-white text-2xl font-semibold">Welcome to PulseOut!</h1>

        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <button
          className="w-full flex items-center justify-center gap-3 text-xl rounded-lg bg-black px-6 py-4 text-white font-semibold hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500 active:bg-green-600 transition-all duration-200"
          type="submit"
        >
          <Image
            src="/Spotify_logo_without_text.svg"
            alt="Spotify Logo"
            width={32}
            height={32}
          />
          Log in with Spotify
        </button>
      </div>
    </form>
  );
}
