// components/SpotifyLoginButton.tsx

import Image from 'next/image';

export interface SpotifyLoginButtonProps extends React.ComponentPropsWithoutRef<'a'> {
  spotifyAuthUrl: string;
}

export function SpotifyLoginButton({
  children,
  spotifyAuthUrl,
  className = '',
  ...rest
}: SpotifyLoginButtonProps) {
  return (
    <a
      href={spotifyAuthUrl}
      {...rest}
      className={
        'flex items-center rounded-md bg-black px-4 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500 active:bg-green-600 ' +
        className
      }
    >
      <Image
        src="/Spotify_logo_without_text.svg" // Ensure your logo is in the public folder or update the path accordingly.
        alt="Spotify Logo"
        width={24}
        height={24}
        className="mr-2"
      />
      {children || 'Log in with Spotify'}
    </a>
  );
}
