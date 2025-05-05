// written by: Paul and Jordan
  // tested by: Paul, Andrew, Jordan, Others...

import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react'; // Import SessionProvider
import { auth } from '@/auth'; // Import auth function (adjust path if needed)
import './ui/global.css';
import { noto_sans } from './ui/fonts';

export const metadata: Metadata = {
  metadataBase: new URL('https://pulseout.vercel.app/'), // Ensure this is your production URL
  title: 'Welcome to PulseOut',
  description: 'A new social music platform for music lovers!',
};

// Make the layout component async to fetch the session on the server
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch the session data on the server using your auth configuration
  const session = await auth();

  return (
    <html lang="en">
      <body className={`${noto_sans.className} antialiased`}>
        {/* Wrap the application with SessionProvider and pass the fetched session */}
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
