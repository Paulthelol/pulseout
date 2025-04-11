// app/api/cron/decay/route.ts
import { db } from '@/src/db'; // Import your Drizzle instance
import { songs } from '@/src/db/schema'; // Import the songs table schema
import { sql, gt } from 'drizzle-orm'; // Import sql helper and greater than (gt) operator
import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';

// IMPORTANT: Ensure your `db` instance in src/db/index.ts uses an
// edge-compatible driver if this runs on the edge runtime.
// e.g., @vercel/postgres/driver, @neondatabase/serverless, drizzle-orm/postgres-proxy
// Your current 'postgres' driver might work if Supabase pooler is HTTP-based,
// but verify compatibility with Vercel Edge Functions.

// Configure this route to run on the Edge runtime
export const runtime = 'edge';
// Prevent caching of this route
export const dynamic = 'force-dynamic';


// Handler for the cron job (Vercel usually uses GET for simple triggers)
export async function GET(request: Request) {
  noStore(); // Ensure this function doesn't cache responses

  // Optional: Secure your cron job (e.g., check a secret header/token)
  // const authorization = request.headers.get('authorization');
  // if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new NextResponse('Unauthorized', { status: 401 });
  // }

  console.log('Running daily decay job for trending scores...');

  try {
    // Execute the update. We don't need the specific result count here.
    await db.update(songs)
      .set({
        trending_score: sql`trending_score / 2.0`, // Use 2.0 for float division
        // Optionally update last_decayed_at here if you added it
        last_decayed_at: new Date(),
      })
      .where(gt(songs.trending_score, 0.01)); // Only decay scores above a small threshold

    // Log success without rowCount
    console.log(`Decay job completed successfully.`);

    // Return a success message without rowCount
    return NextResponse.json({ success: true, message: `Decay job executed.` });

  } catch (error) {
    console.error('Error running decay job:', error);
    return new NextResponse('Internal Server Error during decay job.', { status: 500 });
  }
}
