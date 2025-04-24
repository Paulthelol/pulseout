'use client'; // This component uses hooks, so it must be a Client Component

import React, { useState, useEffect, useOptimistic, useRef, useTransition, useCallback } from 'react';
// Import Icons (assuming you have lucide-react installed)
import { Heart, MessageSquare, ChevronDown, Loader2, MoreHorizontal } from 'lucide-react';

// --- Import Server Actions & Types ---
// Adjust the import path based on your project structure
import { fetchComments, addComment, toggleCommentLike } from '@/lib/actions';
// Import the shared type definition for a comment with details
import type { CommentWithDetails } from '@/lib/actions'; // Adjust path

// --- Types ---
// Define the User type (or import from a shared types file)
// Ensure this matches the structure used in your auth setup and server actions
type User = {
  id: string;
  name: string | null;
  image?: string | null;
};

// --- Constants ---
const COMMENTS_PER_PAGE = 10; // Number of top-level comments to load per batch/page

// --- Helper Functions ---
// These can be kept here or moved to a central utility file (e.g., lib/utils.ts)

// Cache for generating consistent avatar colors based on username initial
const nameToColorCache: Record<string, string> = {};
const tailwindColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  'bg-rose-500',
];

/**
 * Generates a consistent Tailwind background color class based on the first letter of a name.
 * @param name - The username or name string.
 * @returns A Tailwind background color class string.
 */
const getRandomBgColor = (name: string = '?'): string => {
  const initial = name.charAt(0).toUpperCase();
  if (nameToColorCache[initial]) return nameToColorCache[initial]; // Return cached color if available
  // Simple hash function to get a semi-random index based on character code
  const charCode = initial.charCodeAt(0) || 0;
  const colorIndex = charCode % tailwindColors.length;
  const color = tailwindColors[colorIndex];
  nameToColorCache[initial] = color; // Cache the generated color
  return color;
};

/**
 * Formats a Date object into a user-friendly timestamp string.
 * Shows time if today, short day name if within the last week, otherwise date.
 * @param date - The Date object to format.
 * @returns A formatted timestamp string (e.g., "3:45 PM", "Tue", "Apr 23").
 */
const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  // Check if the date is today
  const isToday = date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    // Format as time (e.g., "3:45 PM")
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } else if (diffInMs < oneDayInMs * 7 && diffInMs > 0) {
    // Format as short weekday name if within the last 7 days (e.g., "Tue")
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  else {
    // Format as date (e.g., "Apr 23" or "Apr 23, 2024" if different year)
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (date.getFullYear() !== now.getFullYear()) {
      options.year = 'numeric';
    }
    return date.toLocaleDateString([], options);
  }
};


// --- Avatar Placeholder Component (using div + Tailwind) ---
interface AvatarPlaceholderProps { username: string | null | undefined; }
const AvatarPlaceholder: React.FC<AvatarPlaceholderProps> = ({ username }) => {
  const nameStr = username || 'Anonymous';
  const initial = nameStr.charAt(0).toUpperCase();
  const bgColor = getRandomBgColor(nameStr); // Use helper to get consistent color
  return (
    // Use a div styled as a circle
    <div className={`h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 rounded-full flex items-center justify-center ${bgColor}`}>
      {/* Display the initial letter */}
      <span className="text-white text-xs sm:text-sm font-medium select-none">
        {initial}
      </span>
    </div>
  );
};

// --- Like Button Component (using button + Tailwind) ---
interface LikeButtonProps {
  commentId: string;
  initialLikes: number;
  initialLiked: boolean;
  disabled?: boolean;
}
const LikeButton: React.FC<LikeButtonProps> = ({ commentId, initialLikes, initialLiked, disabled }) => {
  const [optimisticLikeState, setOptimisticLikeState] = useOptimistic(
    { likes: initialLikes, liked: initialLiked },
    (state) => ({ likes: state.liked ? state.likes - 1 : state.likes + 1, liked: !state.liked })
  );
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (disabled || isPending) return;
    startTransition(async () => {
      setOptimisticLikeState(undefined);
      try {
        const result = await toggleCommentLike(commentId);
        if (!result.success) console.error("Like toggle server action failed:", result.error);
      } catch (error) { console.error("Error calling toggleCommentLike:", error); }
    });
  };

  // Base classes for the button
  const baseClasses = "inline-flex items-center justify-center space-x-1 px-1.5 py-1 h-auto rounded-md group transition-colors duration-150 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  // Classes for enabled state
  const enabledClasses = "text-gray-500 hover:bg-red-50 hover:text-red-600";
  // Classes for disabled state
  const disabledClasses = "text-gray-400 cursor-not-allowed";
  // Classes for liked state (when enabled)
  const likedClasses = "text-red-600";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isPending}
      className={`${baseClasses} ${disabled ? disabledClasses : enabledClasses} ${optimisticLikeState.liked && !disabled ? likedClasses : ''}`}
      aria-label={optimisticLikeState.liked ? 'Unlike comment' : 'Like comment'}
    >
      {/* Heart Icon: Apply fill/text color based on liked state */}
      <Heart className={`h-4 w-4 transition-colors duration-150 ${optimisticLikeState.liked
        ? (disabled ? 'fill-gray-400 text-gray-400' : 'fill-red-500 text-red-500')
        : (disabled ? 'text-gray-400' : 'text-gray-500 group-hover:text-red-500')
        }`} />
      {/* Like Count */}
      <span>{optimisticLikeState.likes}</span>
      {/* Loading Spinner */}
      {isPending && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
    </button>
  );
};

// --- Comment Input Component (using form, textarea, button + Tailwind) ---
interface CommentInputProps {
  songId: string;
  parentId?: string | null;
  onSubmitSuccess: () => void;
  onCancel?: () => void;
  currentUser: User | null;
  placeholder?: string;
  autoFocus?: boolean;
}
const CommentInput: React.FC<CommentInputProps> = ({ songId, parentId = null, onSubmitSuccess, onCancel, currentUser, placeholder = "Add a comment...", autoFocus = false }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (autoFocus && textAreaRef.current) textAreaRef.current.focus(); }, [autoFocus]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) { setError("Please log in to comment."); return; }
    const formData = new FormData(event.currentTarget);
    const content = formData.get('content') as string;
    if (!content?.trim()) { setError("Comment cannot be empty."); textAreaRef.current?.focus(); return; }

    startTransition(async () => {
      setError(null);
      try {
        const result = await addComment(formData);
        if (result.success) {
          formRef.current?.reset();
          onSubmitSuccess();
        } else {
          setError(result.error || "Failed to post comment.");
        }
      } catch (err) {
        console.error("Error calling addComment:", err);
        setError("An unexpected error occurred.");
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex items-start space-x-2 sm:space-x-3 py-2">
      {/* Avatar */}
      {currentUser ? (
        <AvatarPlaceholder username={currentUser.name} />
      ) : (
        // Placeholder if not logged in
        <div className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 rounded-full flex items-center justify-center bg-gray-300">
          <span className="text-gray-500 text-sm font-medium">?</span>
        </div>
      )}
      {/* Input Area */}
      <div className="flex-1">
        {/* Hidden fields */}
        <input type="hidden" name="songId" value={songId} />
        {parentId && <input type="hidden" name="parentId" value={parentId} />}

        {/* Textarea */}
        <textarea
          ref={textAreaRef}
          name="content"
          placeholder={currentUser ? placeholder : "Log in to leave a comment"}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:cursor-not-allowed disabled:opacity-50"
          rows={parentId ? 2 : 3}
          required
          disabled={isPending || !currentUser}
          aria-label={placeholder}
        />
        {/* Error Message */}
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        {/* Buttons */}
        <div className="mt-2 flex items-center justify-end space-x-2">
          {/* Cancel Button (for replies) */}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium px-3 py-1.5 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending || !currentUser}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-1.5 bg-blue-600 text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              parentId ? 'Reply' : 'Comment'
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

// --- Sort Dropdown Component (using button, div + Tailwind) ---
interface SortDropdownProps { currentSort: 'top' | 'recent'; onSortChange: (newSort: 'top' | 'recent') => void; }
const SortDropdown: React.FC<SortDropdownProps> = ({ currentSort, onSortChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref for detecting outside clicks

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleSelect = (newSort: 'top' | 'recent') => {
    onSortChange(newSort);
    setIsOpen(false); // Close dropdown after selection
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium px-2 py-1 text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Sort by: {currentSort === 'top' ? 'Top' : 'Recent'}
        <ChevronDown className={`ml-1 h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {/* Dropdown Item: Top */}
            <button
              onClick={() => handleSelect('top')}
              className={`block w-full text-left px-4 py-2 text-sm ${currentSort === 'top' ? 'font-semibold text-blue-600 bg-blue-50' : 'text-gray-700'} hover:bg-gray-100 hover:text-gray-900`}
              role="menuitem"
            // disabled={currentSort === 'top'} // Optional: disable if already selected
            >
              Top Comments
            </button>
            {/* Dropdown Item: Recent */}
            <button
              onClick={() => handleSelect('recent')}
              className={`block w-full text-left px-4 py-2 text-sm ${currentSort === 'recent' ? 'font-semibold text-blue-600 bg-blue-50' : 'text-gray-700'} hover:bg-gray-100 hover:text-gray-900`}
              role="menuitem"
            // disabled={currentSort === 'recent'} // Optional: disable if already selected
            >
              Most Recent
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Comment Component (using divs, button + Tailwind) ---
interface CommentProps {
  comment: CommentWithDetails;
  songId: string;
  currentUser: User | null;
  level?: number;
}
const Comment: React.FC<CommentProps> = ({ comment, songId, currentUser, level = 0 }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [visibleReplies, setVisibleReplies] = useState<CommentWithDetails[]>(comment.replies || []);
  const totalReplyCount = comment.replyCount || 0;
  const hasMoreReplies = visibleReplies.length < totalReplyCount;

  const handleReplySuccess = () => { setShowReplyInput(false); };

  const handleLoadMoreReplies = async () => {
    console.log("TODO: Load more replies for comment:", comment.id);
    // Requires fetchReplies server action
  };

  const indentationClass = level > 0 ? `ml-4 sm:ml-6` : '';

  return (
    <div className={`flex space-x-2 sm:space-x-3 ${indentationClass}`}>
      <div className="flex-shrink-0 pt-1"><AvatarPlaceholder username={comment.user.name} /></div>
      <div className="flex-1 min-w-0">
        {/* User Info & Timestamp */}
        <div className="flex items-baseline space-x-1.5 mb-1 flex-wrap">
          <span className="font-semibold text-sm text-gray-800 break-words">{comment.user.name || 'Anonymous'}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500 flex-shrink-0">{formatTimestamp(comment.createdAt)}</span>
        </div>
        {/* Content */}
        <p className="text-sm text-gray-700 mb-1.5 whitespace-pre-wrap break-words">{comment.content}</p>
        {/* Actions */}
        <div className="flex items-center space-x-2">
          <LikeButton commentId={comment.id} initialLikes={comment.likes} initialLiked={comment.currentUserLiked} disabled={!currentUser} />
          {/* Reply Button */}
          <button
            type="button"
            onClick={() => setShowReplyInput(!showReplyInput)}
            disabled={!currentUser}
            className={`inline-flex items-center space-x-1 px-1.5 py-1 h-auto rounded-md group transition-colors duration-150 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${!currentUser ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'}`}
            aria-label="Reply to comment">
            <MessageSquare className="h-4 w-4" /> <span className="text-xs font-medium">Reply</span>
          </button>
        </div>
        {/* Reply Input */}
        {showReplyInput && (
          <div className="mt-2">
            <CommentInput songId={songId} parentId={comment.id} onSubmitSuccess={handleReplySuccess} onCancel={() => setShowReplyInput(false)} currentUser={currentUser} placeholder={`Replying to ${comment.user.name || 'Anonymous'}...`} autoFocus={true} />
          </div>
        )}
        {/* Replies Section */}
        {visibleReplies.length > 0 && (
          <div className="mt-3 space-y-3 border-l-2 border-gray-100 pl-3 sm:pl-4">
            {visibleReplies.map((reply) => (
              <Comment key={reply.id} comment={reply} songId={songId} currentUser={currentUser} level={level + 1} />
            ))}
            {/* View More Replies Button */}
            {hasMoreReplies && (
              <button type="button" onClick={handleLoadMoreReplies} className="inline-flex items-center text-blue-600 hover:text-blue-700 text-xs font-medium px-0 h-auto focus:outline-none">
                <ChevronDown className="h-3 w-3 mr-1" /> View more replies ({totalReplyCount - visibleReplies.length} remaining)
              </button>
            )}
          </div>
        )}
        {/* Show button to load initial replies */}
        {visibleReplies.length === 0 && totalReplyCount > 0 && (
          <button type="button" onClick={handleLoadMoreReplies} className="inline-flex items-center text-blue-600 hover:text-blue-700 text-xs font-medium px-0 h-auto mt-1 focus:outline-none">
            <ChevronDown className="h-3 w-3 mr-1" /> View {totalReplyCount} {totalReplyCount > 1 ? 'replies' : 'reply'}
          </button>
        )}
      </div>
    </div>
  );
};


// --- Main Comment Section Component ---
interface CommentSectionProps {
  songId: string;
  currentUser: User | null;
}
const CommentSection: React.FC<CommentSectionProps> = ({ songId, currentUser }) => {
  const [comments, setComments] = useState<CommentWithDetails[]>([]);
  const [sortBy, setSortBy] = useState<'top' | 'recent'>('top');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPendingSort, startTransitionSort] = useTransition();

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Refs to store latest state values for use inside useCallback
  // This helps stabilize the useCallback dependencies
  const isLoadingMoreRef = useRef(isLoadingMore);
  const hasMoreRef = useRef(hasMore);
  const offsetRef = useRef(offset);

  // Update refs whenever the corresponding state changes
  useEffect(() => { isLoadingMoreRef.current = isLoadingMore; }, [isLoadingMore]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  // Memoized function to load comments
  // Dependencies are minimal (songId, sortBy) making the function itself stable
  const loadComments = useCallback(async (loadMore = false) => {
    // Read current state via refs inside the async function
    const currentLoadingMore = isLoadingMoreRef.current;
    const currentHasMore = hasMoreRef.current;
    // Determine offset: 0 for initial/sort load, ref value for load more
    const currentOffset = loadMore ? offsetRef.current : 0;

    // Prevent unnecessary fetches
    if (loadMore && currentLoadingMore) { console.log("loadComments skipped: isLoadingMore"); return; }
    if (loadMore && !currentHasMore) { console.log("loadComments skipped: !hasMore"); return; }

    console.log(`loadComments called: loadMore=${loadMore}, currentOffset=${currentOffset}, sortBy=${sortBy}`);

    // Set loading state *before* the async call
    if (loadMore) setIsLoadingMore(true);
    else setIsLoadingInitial(true);
    setError(null); // Clear previous errors

    try {
      // Fetch using current props and calculated offset
      const result = await fetchComments({
        songId, sortBy, limit: COMMENTS_PER_PAGE, offset: currentOffset,
      });
      console.log(`Fetched comments: count=${result.comments.length}, hasMore=${result.hasMore}`);

      // Update state based on fetch result
      if (!loadMore) { // Initial load or sort change (Replace state)
        setComments(result.comments);
        setOffset(result.comments.length); // Reset offset based on fetched count
      } else { // Loading more (Append state)
        setComments(prev => [...prev, ...result.comments]);

        //Ensure comments are not double-displayed
        setComments(prev => {
          const filtered = result.comments.filter(c => !prev.some(p => p.id === c.id));
          return [...prev, ...filtered];
        });

        // Use functional update for offset based on previous offset
        setOffset(prevOffset => prevOffset + result.comments.length);
      }
      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);

    } catch (err) {
      console.error("Error in loadComments:", err);
      setError("Could not load comments. Please try again later.");
    } finally {
      // Reset loading states *after* async operation completes
      if (loadMore) setIsLoadingMore(false);
      else setIsLoadingInitial(false);
    }
  }, [songId, sortBy]); // Only depends on props defining the fetch context


  // Effect for initial load and reacting to songId/sortBy changes
  useEffect(() => {
    console.log(`Effect triggered: songId=${songId}, sortBy=${sortBy}. Resetting state.`);

    // 1. Disconnect observer to prevent race conditions
    if (observerRef.current) {
      console.log("Disconnecting observer due to context change.");
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    // 2. Reset ALL relevant state for a clean load
    setComments([]);
    setOffset(0);
    setHasMore(true); // Reset hasMore optimistically
    setTotalCount(0);
    setIsLoadingMore(false); // Ensure loading more indicator is off
    setError(null);
    // Let loadComments handle setting setIsLoadingInitial = true

    // *** Prevent observer from kicking in prematurely ***
    setIsLoadingInitial(true);

    // 3. Trigger the initial load (loadMore = false)
    // Use transition for sort changes to keep UI responsive
    startTransitionSort(() => {
      console.log("Calling loadComments(false) for initial load/sort change.");
      loadComments(false);
    });

    // This effect should ONLY run when songId or sortBy changes.
  }, [songId, sortBy]); // loadComments is stable and shouldn't be here


  // Effect to set up the IntersectionObserver for loading more
  useEffect(() => {
    // Disconnect previous observer if it exists (safety measure)
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
      console.log("Observer cleanup: Disconnected previous observer.");
    }

    // Conditions to setup observer:
    // - Initial load must be complete (isLoadingInitial is false)
    // - There must be more comments available (hasMore is true)
    // - Not currently loading more comments (isLoadingMore is false)
    // - The sentinel element ref must be available
    if (!isLoadingInitial && hasMore && !isLoadingMore && loadMoreRef.current) {
      console.log("Setting up IntersectionObserver.");
      const observer = new IntersectionObserver(
        (entries) => {
          // Check if intersecting and ensure we are not already loading more
          if (entries[0].isIntersecting && !isLoadingMoreRef.current) {
            console.log("Intersection observer triggered: Calling loadComments(true).");
            // Call loadComments with loadMore = true
            loadComments(true);
          }
        },
        { threshold: 1.0 } // Trigger when sentinel is fully visible
      );

      observer.observe(loadMoreRef.current); // Start observing
      observerRef.current = observer; // Store instance

    } else {
      // Log why observer wasn't set up if needed for debugging
      console.log("Conditions not met for setting up observer:", { isLoadingInitial, hasMore, isLoadingMore, loadMoreRefCurrent: !!loadMoreRef.current });
    }

    // Cleanup function: Disconnect observer when effect dependencies change or component unmounts
    return () => {
      if (observerRef.current) {
        console.log("Observer cleanup: Disconnecting observer.");
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
    // Dependencies: Re-run this effect when loading states or hasMore change.
    // loadComments is stable and included here to ensure the latest version is used if needed.
  }, [isLoadingInitial, hasMore, isLoadingMore, loadComments]);


  // Handler for changing the sort order
  const handleSortChange = (newSort: 'top' | 'recent') => {
    // Prevent changing sort if a sort transition is already pending
    if (newSort !== sortBy && !isPendingSort) {
      console.log(`Sort changed to: ${newSort}`);
      setSortBy(newSort); // Setting state triggers the useEffect hook above
    }
  };

  // Callback for successful comment submission
  const handleCommentSubmitSuccess = () => {
    console.log("Comment submitted successfully (client callback). Refreshing first page.");
    // Refresh first page after delay to allow revalidation potentially
    // This ensures the new comment appears based on the current sort order.
    setTimeout(() => {
      setComments([]); // Clear existing comments visually
      setOffset(0);    // Reset pagination
      setHasMore(true); // Assume more might exist now
      loadComments(false); // Reload page 1
    }, 750); // Adjust delay if needed
  };

  // --- Render JSX ---
  return (
    <div className="w-full max-w-3xl mx-auto py-6 px-4 sm:px-0 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
          {totalCount > 0 ? `${totalCount} Comment${totalCount !== 1 ? 's' : ''}` : 'Comments'}
          {/* Show spinner next to title only during initial load/sort when count is 0 */}
          {(isLoadingInitial || isPendingSort) && totalCount === 0 && <Loader2 className="inline-block h-5 w-5 animate-spin text-gray-400 ml-2" />}
        </h2>
        {/* Show sort dropdown and potentially a spinner if loading but comments exist */}
        {!isLoadingInitial && comments.length > 0 && <SortDropdown currentSort={sortBy} onSortChange={handleSortChange} />}
        {(isLoadingInitial || isPendingSort) && comments.length > 0 && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
      </div>

      {/* Top-Level Input */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <CommentInput songId={songId} onSubmitSuccess={handleCommentSubmitSuccess} currentUser={currentUser} />
      </div>

      {/* Comments List & Loading States */}
      <div className="space-y-4">
        {/* Initial Loading State (only when comments array is empty) */}
        {isLoadingInitial && comments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mb-2" /> <span>Loading comments...</span>
          </div>
        )}
        {/* Error State */}
        {error && !isLoadingInitial && ( // Show error only when not in initial loading
          <div className="text-center py-6 text-red-600 bg-red-50 rounded-md px-4 border border-red-200">
            <p className="font-medium">Error loading comments</p> <p className="text-sm mb-3">{error}</p>
            <button type="button" onClick={() => loadComments(false)} className="inline-flex items-center justify-center rounded-md text-sm font-medium px-3 py-1.5 border border-red-300 text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">Try Again</button>
          </div>
        )}
        {/* Empty State */}
        {!isLoadingInitial && !error && comments.length === 0 && (
          <p className="text-gray-500 text-center py-6 italic">No comments yet. Be the first!</p>
        )}
        {/* Render Comments */}
        {comments.map((comment) => (
          <div key={comment.id} className="py-2 border-b border-gray-100 last:border-b-0">
            <Comment comment={comment} songId={songId} currentUser={currentUser} level={0} />
          </div>
        ))}
        {/* Sentinel Element for Intersection Observer */}
        {/* Visibility controlled by hasMore to prevent observer triggering unnecessarily */}
        <div ref={loadMoreRef} style={{ height: '10px', visibility: hasMore ? 'visible' : 'hidden' }} />
        {/* Loading More Indicator */}
        {isLoadingMore && (
          <div className="flex justify-center items-center py-4 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> <span>Loading more comments...</span>
          </div>
        )}
        {/* End of Comments Message */}
        {/* Show only when not loading and no more comments exist */}
        {!isLoadingInitial && !isLoadingMore && !hasMore && comments.length > 0 && (
          <p className="text-center text-gray-400 text-sm py-4 italic">~ End of comments ~</p>
        )}
      </div>
    </div>
  );
};

export default CommentSection;