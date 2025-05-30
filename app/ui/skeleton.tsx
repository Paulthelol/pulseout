// written by: Paul
  // tested by: Paul
import { Skeleton } from "@/components/ui/skeleton";

// Skeleton loader for the Search Bar component
export function SearchBarSkeleton() {
  return (
    <div className="relative flex flex-1 flex-shrink-0">
      <Skeleton className="h-[38px] w-full rounded-md" />
      <div className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2">
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