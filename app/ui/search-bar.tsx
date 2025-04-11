// app/ui/musicgrid/search-bar.tsx
'use client'; // This component needs client-side interactivity

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Search } from 'lucide-react'; // Using lucide-react for icons

export default function SearchBar({ placeholder }: { placeholder: string }) {
  // Get current search parameters, pathname, and router instance
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter(); // Use replace to avoid adding entries to browser history for each keystroke

  // Debounced callback to update URL search parameters after user stops typing
  const handleSearch = useDebouncedCallback((term: string) => {
    console.log(`Searching... ${term}`); // Log search term (optional)

    // Create a new URLSearchParams object from the current search parameters
    const params = new URLSearchParams(searchParams);

    // Set page to 1 when search term changes (optional, if pagination is used)
    // params.set('page', '1');

    // Update the 'query' parameter if a term exists, otherwise delete it
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }

    // Replace the current URL with the updated path and search parameters
    // This triggers a re-render of the layout/page with the new search state
    replace(`${pathname}?${params.toString()}`);
  }, 300); // Debounce time: 300ms

  return (
    <div className="relative flex flex-1 flex-shrink-0">
      {/* Input field for search */}
      <input
        className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        placeholder={placeholder}
        // Update search on input change
        onChange={(e) => {
          handleSearch(e.target.value);
        }}
        // Set default value from URL search parameters, ensuring it syncs on navigation
        defaultValue={searchParams.get('query')?.toString()}
      />
      {/* Search icon */}
      <Search className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900 dark:text-gray-400 dark:peer-focus:text-gray-300" />
    </div>
  );
}
