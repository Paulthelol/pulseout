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
        <form
            action={formAction}
        >
            <div className="py-4 bg-slate-300 px-4 rounded-lg">
                <input type='hidden' name='redirectTo' value={callbackUrl} />
                <button
                    className={
                        'w-full flex items-center rounded-md bg-black px-4 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500 active:bg-green-600 '
                    }
                    type="submit"
                >
                    <Image
                        src="/Spotify_logo_without_text.svg" // Ensure your logo is in the public folder or update the path accordingly.
                        alt="Spotify Logo"
                        width={24}
                        height={24}
                        className="mr-2"
                    />
                    {'Log in with Spotify'}
                </button>
            </div>
        </form >

    );
}