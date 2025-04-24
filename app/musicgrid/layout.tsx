import React from 'react';
import SideBar from '../ui/side-bar';
import SearchBar from '@/app/ui/search-bar';
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
                    <Suspense fallback={<SearchBarSkeleton />}>
                       <SearchBar placeholder="Search music..." />
                    </Suspense>
                </div>
                    {children}
            </div>
        </div>
    );
}