// app/ui/skeletons.tsx
import { Skeleton } from "@/components/ui/skeleton"; // Assuming shadcn/ui is installed

// Skeleton loader for the Search Bar component
export function SearchBarSkeleton() {
  return (
    <div className="relative flex flex-1 flex-shrink-0">
      {/* Mimic the input field dimensions and styling */}
      {/* Calculate height: py-[9px] * 2 + typical line height (e.g., 20px) = ~38px */}
      <Skeleton className="h-[38px] w-full rounded-md" />
      {/* Mimic the icon position */}
      <div className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2">
        {/* Optional: Skeleton circle for icon */}
        {/* <Skeleton className="h-full w-full rounded-full" /> */}
      </div>
    </div>
  );
}

// Skeleton loader component for search results grid
export function SearchResultsSkeleton() {
  // Mimics the grid layout of TrackCards
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
      {/* Create multiple skeleton cards */}
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="flex flex-col space-y-3">
          {/* Skeleton for the image (aspect-square) */}
          <Skeleton className="aspect-square w-full rounded-xl" />
          {/* Skeletons for title and artist lines */}
          <div className="space-y-2 p-1">
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        </div>
      ))}
    </div>
  );
}


// You can add other skeleton components to this file as needed
// export function AnotherComponentSkeleton() { ... }
