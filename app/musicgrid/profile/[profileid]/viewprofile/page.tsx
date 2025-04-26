import { db } from '@/src/db'
import { users } from '@/src/db/schema'
import { eq } from 'drizzle-orm'

export default async function ProfilePage({
  params,
  searchParams,             
}: {
  params: Promise<{ profileid: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { profileid } = await params

  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, profileid))
    .limit(1)

  if (!user) {
    return <p>User not found</p>
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{user.name}</h1>
      {/* …the rest of profile page */}
    </div>
  )
}
