// written by: Paul and Jordan
  // tested by: Paul, Andrew, Jordan, Others...
  import React from 'react';
import SideBar from '../ui/side-bar';
import SearchBar from '@/app/ui/search-bar';
import { Suspense } from 'react';
import { SearchBarSkeleton } from '@/app/ui/skeleton';

// Layout components only receive 'children' as a prop by default
export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {

    return (
        <div className="flex h-screen flex-col md:flex-row md:overflow-hidden bg-white dark:bg-black">
            {/* Side Navigation */}
            <div className="w-full flex-none md:w-[220px]">
                <SideBar />
            </div>

            {/* Main Content Area */}
            <div className="flex-grow p-6 md:overflow-y-auto md:p-12">
                {/* Top Bar with Search */}
                <div className="mb-6">
                    <Suspense fallback={<SearchBarSkeleton />}>
                       <SearchBar placeholder="Search music..." />
                    </Suspense>
                </div>
                {/* Render the actual page content */}
                {children}
            </div>
        </div>
    );
}
