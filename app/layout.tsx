import '@/app/ui/global.css'
import { Inter } from 'next/font/google'

export const metadata = {
  metadataBase: new URL('https://pulseout.vercel.app/'),
  title: 'Welcome to PulseOut',
  description:
    'A simple Next.js app with a Postgres database and Drizzle as the ORM',
}

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}</body>
    </html>
  )
}
