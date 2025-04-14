import React from 'react';
import SideBar from '../ui/side-bar';
import SearchBar from '@/app/ui/search-bar';
import SearchResults from '@/app/ui/search-results';
import { Suspense } from 'react';
import { SearchBarSkeleton } from '@/app/ui/skeleton'; // Assuming a simple skeleton for the search bar

export default function Layout({
    children,
    searchParams, // Access searchParams passed down by Next.js
}: {
    children: React.ReactNode;
    searchParams?: { // Make searchParams optional
        query?: string;
        // Add other potential search params like page, filter etc. if needed
    };
}) {
    // Extract the search query from searchParams
    const query = searchParams?.query || '';

    return (
        <div className="flex h-screen flex-col md:flex-row md:overflow-hidden bg-white dark:bg-black">
            {/* Side Navigation */}
            <div className="w-full flex-none md:w-64">
                {/* Pass searchParams to SideNav if it needs to adjust links based on query */}
                <SideBar />
            </div>

            {/* Main Content Area */}
            <div className="flex-grow p-6 md:overflow-y-auto md:p-12">
                {/* Top Bar with Search */}
                <div className="mb-6">
                    {/* Use Suspense for the SearchBar in case it depends on async operations or complex hooks */}
                    {/* Although SearchBar is 'use client', wrapping in Suspense is good practice if needed */}
                    <Suspense fallback={<SearchBarSkeleton />}>
                       <SearchBar placeholder="Search music..." />
                    </Suspense>
                </div>

                {/* Conditional Rendering: Show Search Results or default Children */}
                {query ? (
                    // If a query exists, render SearchResults component
                    // Pass the query prop to SearchResults
                    <SearchResults query={query} />
                ) : (
                    // If no query, render the default page content (e.g., Trending, New Releases)
                    children
                )}
            </div>
        </div>
    );
}

// Note: Ensure your SideNav component links work correctly.
// If clicking a SideNav link (e.g., "Trending") should clear the search,
// the links should navigate to the base path (e.g., "/musicgrid/trending")
// without the "?query=..." parameter.
