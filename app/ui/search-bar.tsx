'use client';

import { useEffect } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Search } from 'lucide-react';

export default function SearchBar({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname(); // Get current pathname
  const { push } = useRouter(); // Use push for navigation

  // Debounced function to navigate to the search page
  const handleSearch = useDebouncedCallback((term: string) => {
    console.log(`Navigating to search page for: ${term}`);
    const params = new URLSearchParams(); // Start fresh for search page query

    if (term) {
      params.set('query', term);
      // Navigate to the dedicated search page with the query
      push(`/musicgrid/search?${params.toString()}`);
    } else if (pathname === '/musicgrid/search') {
       // If the term is cleared *while on the search page*, remove the query param
       // Or potentially navigate back or show a default state on the search page
       push(`/musicgrid/search`); // Go to search page without query
    }
    // If term is cleared on other pages, do nothing (don't navigate)

  }, 500); // Debounce time: 500ms

  const defaultValue = pathname === '/musicgrid/search'
    ? searchParams.get('query')?.toString() ?? ''
    : '';

  return (
    <div className="relative flex flex-1 flex-shrink-0">
      <input
        key={defaultValue} // Add key to reset input if defaultValue changes drastically (like navigating away/back)
        className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        placeholder={placeholder}
        onChange={(e) => {
          handleSearch(e.target.value);
        }}
        defaultValue={defaultValue} // Reflect query only on search page
        suppressHydrationWarning={true}
      />
      <Search className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900 dark:text-gray-400 dark:peer-focus:text-gray-300" />
    </div>
  );
}
