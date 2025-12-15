// written by: Paul
  // tested by: Paul, Andrew, Jordan, Others...
  'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Search } from 'lucide-react';

export default function SearchBar({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { push } = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // --- State Management for Input Value ---
  const [inputValue, setInputValue] = useState('');

  // --- Effect to Sync Input Value with URL (Runs on Client) ---
  useEffect(() => {
    // Get the query from URL params *after* component has mounted
    const queryFromUrl = pathname === '/musicgrid/search' ? searchParams.get('query')?.toString() ?? '' : '';
    // Update state if it differs from the URL
    if (queryFromUrl !== inputValue) {
        setInputValue(queryFromUrl);
    }
  }, [pathname, searchParams]); // Rerun when URL changes

  // --- Debounced Navigation ---
  const handleSearch = useDebouncedCallback((term: string) => {
    console.log(`Debounced search triggered for: ${term}`);
    const params = new URLSearchParams(searchParams);

    if (term) {
      params.set('query', term);
      push(`/musicgrid/search?${params.toString()}`);
    } else {
        if (pathname === '/musicgrid/search') {
            params.delete('query');
            push(`/musicgrid/search?${params.toString()}`);
        }
    }
  }, 500);

  // --- Input Change Handler ---
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue); // Update local state immediately
    handleSearch(newValue); // Trigger debounced navigation/search
  };

  // --- Effect to Focus Input on Search Page Load/Update (Runs on Client) ---
  useEffect(() => {
    if (pathname === '/musicgrid/search' && inputRef.current) {
        if (document.activeElement !== inputRef.current) {
          inputRef.current.focus();
          console.log('Search input focused');
        }
    }
  }, [pathname, searchParams]); // Trigger on navigation

  return (
    <div className="relative flex flex-1 flex-shrink-0">
      <input
        ref={inputRef}
        className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        placeholder={placeholder}
        value={inputValue} // Bind to local state
        onChange={onInputChange} // Use controlled input handler
      />
      <Search className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900 dark:text-gray-400 dark:peer-focus:text-gray-300" />
    </div>
  );
}
