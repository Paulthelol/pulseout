import React from 'react';
import SideBar from '../ui/side-bar';
import SearchBar from '../ui/searchBar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div>
        <SideBar />
      </div>
      <div className="flex-grow flex flex-col">
        <div className="pb-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-center">
          <SearchBar />
        </div>
        <main className="flex-grow p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
