'use client'; // This component uses hooks, so it must be a Client Component

import React, { useState, useEffect, useOptimistic, useRef, useTransition, useCallback } from 'react';
// Import Icons (assuming you have lucide-react installed)
import { Heart, MessageSquare, ChevronDown, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';

// --- Import Server Actions & Types ---
// Adjust the import path based on your project structure
import { fetchComments, addComment, toggleCommentLike, deleteComment } from '@/lib/actions';
// Import the shared type definition for a comment with details
import type { CommentWithDetails } from '@/lib/actions'; // Adjust path

// --- Types ---
// Define the User type (or import from a shared types file)
type User = {
  id: string;
  name: string | null;
  image?: string | null;
};

// --- Constants ---
const COMMENTS_PER_PAGE = 10;
const REFRESH_DELAY = 500; // Delay in ms before refreshing list after add/delete

// --- Helper Functions ---
const nameToColorCache: Record<string, string> = {};
const tailwindColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  'bg-rose-500',
];

const getRandomBgColor = (name: string = '?'): string => {
  const initial = name.charAt(0).toUpperCase();
  if (nameToColorCache[initial]) return nameToColorCache[initial];
  const charCode = initial.charCodeAt(0) || 0;
  const colorIndex = charCode % tailwindColors.length;
  const color = tailwindColors[colorIndex];
  nameToColorCache[initial] = color;
  return color;
};

const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  const isToday = date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } else if (diffInMs < oneDayInMs * 7 && diffInMs > 0) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (date.getFullYear() !== now.getFullYear()) {
      options.year = 'numeric';
    }
    return date.toLocaleDateString([], options);
  }
};

// --- Avatar Placeholder Component ---
interface AvatarPlaceholderProps { username: string | null | undefined; }
const AvatarPlaceholder: React.FC<AvatarPlaceholderProps> = ({ username }) => {
  const nameStr = username || 'Anonymous';
  const initial = nameStr.charAt(0).toUpperCase();
  const bgColor = getRandomBgColor(nameStr);
  return (
    <div className={`h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 rounded-full flex items-center justify-center ${bgColor}`}>
      <span className="text-white text-xs sm:text-sm font-medium select-none">{initial}</span>
    </div>
  );
};

// --- Like Button Component ---
interface LikeButtonProps {
  commentId: string;
  initialLikes: number;
  initialLiked: boolean;
  disabled?: boolean;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  commentId,
  initialLikes,
  initialLiked,
  disabled,
}) => {
  // Local state for instant UI feedback
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (disabled || isPending) return;

    // Compute our new client side state
    const nextLiked = !liked;
    const nextLikes = nextLiked ? likes + 1 : likes - 1;

    // 1) Update UI immediately
    setLiked(nextLiked);
    setLikes(nextLikes);

    // 2) Fire off server action in a transition
    startTransition(async () => {
      try {
        const { success, newLikes, liked: serverLiked } = await toggleCommentLike(commentId);

        if (success && typeof newLikes === "number") {
          // 3a) Optionally re-sync with server truth
          setLiked(serverLiked!);
          setLikes(newLikes);
        } else {
          // 3b) Roll back if the action failed
          setLiked(liked);
          setLikes(likes);
          console.error("toggleCommentLike failed");
        }
      } catch (err) {
        // 3c) Roll back on network/error
        setLiked(liked);
        setLikes(likes);
        console.error("Error in toggleCommentLike:", err);
      }
    });
  };

  const base = "inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium";
  const enabled = "text-gray-500 hover:text-red-600 hover:bg-red-50";
  const disabledCls = "text-gray-400 cursor-not-allowed";
  const likedCls = "text-red-600";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isPending}
      className={`${base} ${disabled ? disabledCls : enabled} ${liked ? likedCls : ""}`}
      aria-label={liked ? "Unlike comment" : "Like comment"}
    >
      <Heart
        className={`h-4 w-4 transition-colors duration-150 ${
          liked
            ? disabled
              ? "fill-gray-400 text-gray-400"
              : "fill-red-500 text-red-500"
            : disabled
            ? "text-gray-400"
            : "text-gray-500 group-hover:text-red-500"
        }`}
      />
      <span>{likes}</span>
      {isPending && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
    </button>
  );
};

// --- Comment Input Component ---
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
          onSubmitSuccess(); // Still need refresh for adds
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
      {currentUser ? (
        <AvatarPlaceholder username={currentUser.name} />
      ) : (
        <div className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 rounded-full flex items-center justify-center bg-gray-300">
          <span className="text-gray-500 text-sm font-medium">?</span>
        </div>
      )}
      <div className="flex-1">
        <input type="hidden" name="songId" value={songId} />
        {parentId && <input type="hidden" name="parentId" value={parentId} />}
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
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        <div className="mt-2 flex items-center justify-end space-x-2">
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
          <button
            type="submit"
            disabled={isPending || !currentUser}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-1.5 bg-blue-600 text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (parentId ? 'Reply' : 'Comment')}
          </button>
        </div>
      </div>
    </form>
  );
};

// --- Sort Dropdown Component ---
interface SortDropdownProps { currentSort: 'top' | 'recent'; onSortChange: (newSort: 'top' | 'recent') => void; }
const SortDropdown: React.FC<SortDropdownProps> = ({ currentSort, onSortChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleSelect = (newSort: 'top' | 'recent') => {
    onSortChange(newSort);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium px-2 py-1 text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Sort by: {currentSort === 'top' ? 'Top' : 'Recent'}
        <ChevronDown className={`ml-1 h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            <button
              onClick={() => handleSelect('top')}
              className={`block w-full text-left px-4 py-2 text-sm ${currentSort === 'top' ? 'font-semibold text-blue-600 bg-blue-50' : 'text-gray-700'} hover:bg-gray-100 hover:text-gray-900`}
              role="menuitem"
            >
              Top Comments
            </button>
            <button
              onClick={() => handleSelect('recent')}
              className={`block w-full text-left px-4 py-2 text-sm ${currentSort === 'recent' ? 'font-semibold text-blue-600 bg-blue-50' : 'text-gray-700'} hover:bg-gray-100 hover:text-gray-900`}
              role="menuitem"
            >
              Most Recent
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Comment Component ---
interface CommentProps {
  comment: CommentWithDetails;
  songId: string;
  currentUser: User | null;
  level?: number;
  onCommentDeleted: (commentId: string) => void;
  // Removed onLikeToggled callback prop
}
const Comment: React.FC<CommentProps> = ({ comment, songId, currentUser, level = 0, onCommentDeleted }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [visibleReplies, setVisibleReplies] = useState<CommentWithDetails[]>(comment.replies || []);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [_, startDeleteTransition] = useTransition();

  const totalReplyCount = comment.replyCount || 0;
  const hasMoreReplies = visibleReplies.length < totalReplyCount;
  const isCommentOwner = currentUser?.id === comment.user.id;

  const handleReplySuccess = () => {
    setShowReplyInput(false);
    // TODO: Potentially refresh *only* replies for this comment if needed
  };

  const handleLoadMoreReplies = async () => {
    console.log("TODO: Load more replies for comment:", comment.id);
    // Implement fetchReplies server action
  };

  const handleDelete = () => {
    if (!isCommentOwner || isDeleting) return;
    startDeleteTransition(async () => {
      setIsDeleting(true);
      setDeleteError(null);
      try {
        const result = await deleteComment(comment.id);
        if (result.success) {
          onCommentDeleted(comment.id); // Still need refresh for deletes
        } else {
          setDeleteError(result.error || "Failed to delete comment.");
          setIsDeleting(false);
        }
      } catch (error) {
        setDeleteError("An unexpected error occurred during deletion.");
        setIsDeleting(false);
      }
    });
  };

  const indentationClass = level > 0 ? `ml-4 sm:ml-6` : '';

  return (
    <div className={`flex space-x-2 sm:space-x-3 ${indentationClass}`}>
      <div className="flex-shrink-0 pt-1"><AvatarPlaceholder username={comment.user.name} /></div>
      <div className="flex-1 min-w-0 relative group">
        {isCommentOwner && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={`absolute top-0 right-0 p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
                       opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="Delete comment"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        )}
        <div className="flex items-baseline space-x-1.5 mb-1 flex-wrap pr-6">
          <span className="font-semibold text-sm text-gray-800 break-words">{comment.user.name || 'Anonymous'}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500 flex-shrink-0">{formatTimestamp(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-gray-700 mb-1.5 whitespace-pre-wrap break-words">{comment.content}</p>
        {deleteError && <p className="text-red-500 text-xs mt-1">{deleteError}</p>}
        <div className="flex items-center space-x-2">
          {/* LikeButton no longer needs the callback */}
          <LikeButton
            commentId={comment.id}
            initialLikes={comment.likes}
            initialLiked={comment.currentUserLiked}
            disabled={!currentUser}
          />
          <button
            type="button"
            onClick={() => setShowReplyInput(!showReplyInput)}
            disabled={!currentUser}
            className={`inline-flex items-center space-x-1 px-1.5 py-1 h-auto rounded-md group transition-colors duration-150 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${!currentUser ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'}`}
            aria-label="Reply to comment">
            <MessageSquare className="h-4 w-4" /> <span className="text-xs font-medium">Reply</span>
          </button>
        </div>
        {showReplyInput && (
          <div className="mt-2">
            <CommentInput
              songId={songId}
              parentId={comment.id}
              onSubmitSuccess={handleReplySuccess}
              onCancel={() => setShowReplyInput(false)}
              currentUser={currentUser}
              placeholder={`Replying to ${comment.user.name || 'Anonymous'}...`}
              autoFocus={true}
            />
          </div>
        )}
        {visibleReplies.length > 0 && (
          <div className="mt-3 space-y-3 border-l-2 border-gray-100 pl-3 sm:pl-4">
            {visibleReplies.map((reply) => (
              <Comment
                key={reply.id}
                comment={reply}
                songId={songId}
                currentUser={currentUser}
                level={level + 1}
                onCommentDeleted={onCommentDeleted}
              // No longer passing onLikeToggled down
              />
            ))}
            {hasMoreReplies && (
              <button type="button" onClick={handleLoadMoreReplies} className="inline-flex items-center text-blue-600 hover:text-blue-700 text-xs font-medium px-0 h-auto focus:outline-none">
                <ChevronDown className="h-3 w-3 mr-1" /> View more replies ({totalReplyCount - visibleReplies.length} remaining)
              </button>
            )}
          </div>
        )}
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isLoadingMoreRef = useRef(isLoadingMore);
  const hasMoreRef = useRef(hasMore);
  const offsetRef = useRef(offset);
  const isRefreshingRef = useRef(isRefreshing);

  useEffect(() => { isLoadingMoreRef.current = isLoadingMore; }, [isLoadingMore]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { isRefreshingRef.current = isRefreshing; }, [isRefreshing]);

  // Memoized function to load comments
  const loadComments = useCallback(async (loadMore = false) => {
    const currentLoadingMore = isLoadingMoreRef.current;
    const currentHasMore = hasMoreRef.current;
    const currentOffset = loadMore ? offsetRef.current : 0;

    if (loadMore && currentLoadingMore) return;
    if (loadMore && !currentHasMore) return;

    console.log(`loadComments called: loadMore=${loadMore}, currentOffset=${currentOffset}, sortBy=${sortBy}`);

    if (loadMore) setIsLoadingMore(true);
    else setIsLoadingInitial(true);
    setError(null);

    try {
      const result = await fetchComments({
        songId, sortBy, limit: COMMENTS_PER_PAGE, offset: currentOffset,
      });
      console.log(`Fetched comments: count=${result.comments.length}, hasMore=${result.hasMore}, total=${result.totalCount}`);

      if (!loadMore) {
        setComments(result.comments);
        setOffset(result.comments.length);
      } else {
        setComments(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newComments = result.comments.filter(c => !existingIds.has(c.id));
          return [...prev, ...newComments];
        });
        setOffset(prevOffset => prevOffset + result.comments.length);
      }
      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);

    } catch (err) {
      console.error("Error in loadComments:", err);
      setError("Could not load comments. Please try again later.");
      setComments([]);
      setOffset(0);
      setHasMore(false);
      setTotalCount(0);
    } finally {
      if (loadMore) setIsLoadingMore(false);
      else setIsLoadingInitial(false);
    }
  }, [songId, sortBy]); // Stable dependencies

  // --- Function to reload the first page of comments (for add/delete) ---
  const refreshCommentList = useCallback(() => {
    if (isRefreshingRef.current) {
      console.log("Refresh skipped: Already refreshing.");
      return;
    }
    console.log("Refreshing comment list (add/delete)...");
    setIsRefreshing(true);
    setComments([]);
    setOffset(0);
    setHasMore(true);
    setError(null);
    loadComments(false).finally(() => {
      setIsRefreshing(false);
      console.log("Refresh complete.");
    });
  }, [loadComments]); // Depends on stable loadComments

  // Effect for initial load and reacting to songId/sortBy changes
  useEffect(() => {
    console.log(`Effect triggered: songId=${songId}, sortBy=${sortBy}. Resetting state.`);
    if (observerRef.current) observerRef.current.disconnect();
    setComments([]);
    setOffset(0);
    setHasMore(true);
    setTotalCount(0);
    setIsLoadingMore(false);
    setError(null);
    setIsRefreshing(false);

    startTransitionSort(() => {
      loadComments(false);
    });
  }, [songId, sortBy, loadComments]);

  // Effect for IntersectionObserver
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    if (!isLoadingInitial && hasMore && !isLoadingMore && loadMoreRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !isLoadingMoreRef.current) {
            loadComments(true);
          }
        },
        { threshold: 1.0 }
      );
      observer.observe(loadMoreRef.current);
      observerRef.current = observer;
    }

    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, [isLoadingInitial, hasMore, isLoadingMore, loadComments]);

  // Handler for changing sort order
  const handleSortChange = (newSort: 'top' | 'recent') => {
    if (newSort !== sortBy && !isPendingSort) {
      setSortBy(newSort);
    }
  };

  // --- Callback for successful comment submission ---
  const handleCommentSubmitSuccess = useCallback(() => {
    console.log("Comment submitted successfully (client callback). Refreshing.");
    setTimeout(refreshCommentList, REFRESH_DELAY);
  }, [refreshCommentList]);

  // --- Callback for successful comment deletion ---
  const handleCommentDeleted = useCallback((deletedCommentId: string) => {
    console.log(`Comment ${deletedCommentId} deleted (client callback). Refreshing.`);
    setTimeout(refreshCommentList, REFRESH_DELAY);
  }, [refreshCommentList]);

  // Removed handleLikeToggled callback

  // --- Render JSX ---
  return (
    <div className="w-full max-w-3xl mx-auto py-6 px-4 sm:px-0 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
          {!isLoadingInitial && totalCount > 0 ? `${totalCount} Comment${totalCount !== 1 ? 's' : ''}` : 'Comments'}
          {(isLoadingInitial || isPendingSort) && <Loader2 className="inline-block h-5 w-5 animate-spin text-gray-400 ml-2" />}
        </h2>
        {!isLoadingInitial && comments.length > 0 && (
          <SortDropdown currentSort={sortBy} onSortChange={handleSortChange} />
        )}
      </div>

      {/* Top-Level Input */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <CommentInput
          songId={songId}
          onSubmitSuccess={handleCommentSubmitSuccess}
          currentUser={currentUser}
        />
      </div>

      {/* Comments List & Loading States */}
      <div className="space-y-4">
        {isLoadingInitial && comments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mb-2" /> <span>Loading comments...</span>
          </div>
        )}
        {error && !isLoadingInitial && (
          <div className="text-center py-6 text-red-600 bg-red-50 rounded-md px-4 border border-red-200">
            <p className="font-medium">Error loading comments</p>
            <p className="text-sm mb-3">{error}</p>
            <button
              type="button"
              onClick={() => loadComments(false)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium px-3 py-1.5 border border-red-300 text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Try Again
            </button>
          </div>
        )}
        {!isLoadingInitial && !error && comments.length === 0 && (
          <p className="text-gray-500 text-center py-6 italic">No comments yet. Be the first!</p>
        )}
        {/* Render Comments */}
        {comments.map((comment) => (
          <div key={comment.id} className="py-2 border-b border-gray-100 last:border-b-0">
            <Comment
              comment={comment}
              songId={songId}
              currentUser={currentUser}
              level={0}
              onCommentDeleted={handleCommentDeleted}
            // No longer passing onLikeToggled
            />
          </div>
        ))}
        {/* Sentinel Element */}
        <div ref={loadMoreRef} style={{ height: '10px', visibility: hasMore ? 'visible' : 'hidden' }} />
        {/* Loading More Indicator */}
        {isLoadingMore && (
          <div className="flex justify-center items-center py-4 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> <span>Loading more comments...</span>
          </div>
        )}
        {/* End of Comments Message */}
        {!isLoadingInitial && !isLoadingMore && !hasMore && comments.length > 0 && (
          <p className="text-center text-gray-400 text-sm py-4 italic">~ End of comments ~</p>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
