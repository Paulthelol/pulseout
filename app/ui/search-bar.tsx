'use client';

import { useState, useEffect, useRef } from 'react'; // Import useState
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Search } from 'lucide-react';

export default function SearchBar({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { push } = useRouter();
  const inputRef = useRef<HTMLInputElement>(null); // Ref for the input element

  // --- State Management for Input Value ---
  const initialQuery = pathname === '/musicgrid/search' ? searchParams.get('query')?.toString() ?? '' : '';
  const [inputValue, setInputValue] = useState(initialQuery); // Local state for the input's value

  // --- Effect to Sync Input Value with URL ---
  useEffect(() => {
    const queryFromUrl = pathname === '/musicgrid/search' ? searchParams.get('query')?.toString() ?? '' : '';
    if (queryFromUrl !== inputValue) {
        setInputValue(queryFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]); // Rerun when URL changes

  // --- Debounced Navigation ---
  const handleSearch = useDebouncedCallback((term: string) => {
    console.log(`Debounced search triggered for: ${term}`);
    const params = new URLSearchParams(searchParams); // Use current params as base

    if (term) {
      params.set('query', term);
      push(`/musicgrid/search?${params.toString()}`);
    } else {
        if (pathname === '/musicgrid/search') {
            params.delete('query');
            push(`/musicgrid/trending`);
        }
    }
  }, 500); // Debounce time: 500ms

  // --- Input Change Handler ---
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue); // Update local state immediately
    handleSearch(newValue); // Trigger debounced navigation/search
  };

  // --- Effect to Focus Input on Search Page Load/Update ---
  useEffect(() => {
    // Check if we are on the search page and the input ref is available
    if (pathname === '/musicgrid/search' && inputRef.current) {
        // Directly attempt to focus if the input is not already active
        if (document.activeElement !== inputRef.current) {
          inputRef.current.focus();
          console.log('Search input focused');
        }
    }
    // Dependencies remain the same: trigger on navigation
  }, [pathname, searchParams]);

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
