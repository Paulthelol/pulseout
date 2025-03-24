import '@/app/ui/global.css'
import {noto_sans} from '@/app/ui/fonts'

export const metadata = {
  metadataBase: new URL('https://pulseout.vercel.app/'),
  title: 'Welcome to PulseOut',
  description:
    'A simple Next.js app with a Postgres database and Drizzle as the ORM',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${noto_sans.className} antialiased`}>{children}</body>
    </html>
  )
}
