// written by: Paul and Jordan
  // tested by: Paul, Andrew, Jordan, Others...

import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@/auth';
import './ui/global.css';
import { noto_sans } from './ui/fonts';

export const metadata: Metadata = {
  metadataBase: new URL('https://pulseout.vercel.app/'),
  title: 'Welcome to PulseOut',
  description: 'A new social music platform for music lovers!',
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body className={`${noto_sans.className} antialiased`}>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
