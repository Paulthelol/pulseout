// app/api/cron/decay/route.ts
// *** Use drizzle from the vercel-postgres adapter ***
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql as vercelSql } from '@vercel/postgres'; // Renamed to avoid conflict with drizzle sql helper
// --- Remove the import of your potentially Node-specific db instance ---
// import { db } from '@/src/db';
import { songs } from '@/src/db/schema';
import { sql, gt } from 'drizzle-orm'; // Keep drizzle's sql helper for query building
import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';

// Configure this route to run on the Edge runtime
export const runtime = 'edge';
// Prevent caching of this route
export const dynamic = 'force-dynamic';

// --- Create a Drizzle instance specifically for the Edge ---
// It uses the Vercel Postgres SDK (`vercelSql`) which handles the connection pooling and is edge-compatible.
// Ensure the POSTGRES_URL environment variable is set in your Vercel project settings.
const edgeDb = drizzle(vercelSql);


// Handler for the cron job
export async function GET(request: Request) {
  noStore();

  // Optional: Secure your cron job
  // ... (security check code) ...

  console.log('Running daily decay job for trending scores...');

  try {
    // *** Use the edge-compatible edgeDb instance ***
    const result = await edgeDb.update(songs)
      .set({
        trending_score: sql`trending_score / 2.0`,
        // last_decayed_at: new Date(), // Optional
      })
      .where(gt(songs.trending_score, 0.01));

    // Note: The Vercel Postgres driver might return different result metadata.
    // It's safest to just confirm the query ran without error.
    console.log(`Decay job completed successfully.`);

    return NextResponse.json({ success: true, message: `Decay job executed.` });

  } catch (error) {
    console.error('Error running decay job:', error);
    // Ensure error is serializable for Edge functions
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during decay job.';
    return new NextResponse(JSON.stringify({ success: false, error: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}
