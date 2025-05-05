// written by: Paul
  // tested by: Paul, Andrew, Jordan, Others...
  'use client';

import React, { useState, useEffect, useOptimistic, useRef, useTransition, useCallback } from 'react';
import { Heart, MessageSquare, ChevronDown, Loader2, Trash2 } from 'lucide-react';
import { fetchComments, addComment, toggleCommentLike, deleteComment } from '@/lib/actions';
import type { CommentWithDetails as BaseCommentWithDetails } from '@/lib/actions';
import Link from 'next/link';

type User = {
  id: string;
  name: string | null;
  image?: string | null;
};

// Extend the base type locally to include the optimistic flag
interface CommentWithDetails extends BaseCommentWithDetails {
  isOptimistic?: boolean;
  optimisticId?: string;
}


// --- Constants ---
const COMMENTS_PER_PAGE = 10;
const REFRESH_DELAY = 500; // Delay for refreshing list after top-level add/delete

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
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Sending...'; // Or handle appropriately
  }
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
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [isPending, startTransition] = useTransition();
  const isOptimisticId = !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(commentId);

  useEffect(() => {
    // Only sync with props if the comment ID is real (not optimistic)
    if (!isOptimisticId) {
      setLikes(initialLikes);
    }
  }, [initialLikes, isOptimisticId]); // Depend on isOptimisticId

  useEffect(() => {
    if (!isOptimisticId) {
      setLiked(initialLiked);
    }
  }, [initialLiked, isOptimisticId]); // Depend on isOptimisticId


  const handleClick = () => {
    // Disable liking optimistic comments
    if (disabled || isPending || isOptimisticId) return;

    const nextLiked = !liked;
    const nextLikes = nextLiked ? likes + 1 : likes - 1;

    setLiked(nextLiked);
    setLikes(nextLikes);

    startTransition(async () => {
      try {
        const { success, newLikes, liked: serverLiked } = await toggleCommentLike(commentId);
        if (!success) { // Roll back on explicit failure
          setLiked(liked);
          setLikes(likes);
          console.error("toggleCommentLike failed");
        }
        // No need to re-sync on success if parent handles refresh/update
      } catch (err) { // Roll back on error
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
  const finalDisabled = disabled || isPending || isOptimisticId;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={finalDisabled}
      className={`${base} ${finalDisabled ? disabledCls : enabled} ${liked ? likedCls : ""}`}
      aria-label={liked ? "Unlike comment" : "Like comment"}
    >
      <Heart
        className={`h-4 w-4 transition-colors duration-150 ${liked
          ? finalDisabled ? "fill-gray-400 text-gray-400" : "fill-red-500 text-red-500"
          : finalDisabled ? "text-gray-400" : "text-gray-500 group-hover:text-red-500"
          }`}
      />
      <span>{likes}</span>
      {isPending && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
    </button>
  );
};


interface CommentInputProps {
  songId: string;
  parentId?: string | null;
  onSubmitSuccess?: () => void; // For top-level refresh trigger
  onOptimisticReplyAdded?: (optimisticReply: CommentWithDetails) => void; // For optimistic replies
  onServerConfirm?: (optimisticId: string, confirmedComment: CommentWithDetails) => void;
  onServerError?: (optimisticId: string) => void;
  onCancel?: () => void;
  currentUser: User | null;
  placeholder?: string;
  autoFocus?: boolean;
}
const CommentInput: React.FC<CommentInputProps> = ({
  songId,
  parentId = null,
  onSubmitSuccess,
  onOptimisticReplyAdded,
  onServerConfirm,
  onServerError,
  onCancel,
  currentUser,
  placeholder = "Add a comment...",
  autoFocus = false
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (autoFocus && textAreaRef.current) textAreaRef.current.focus(); }, [autoFocus]);

  const triggerSubmit = () => {
    if (!currentUser) { setError("Please log in to comment."); return; }
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    const content = formData.get('content') as string;
    if (!content?.trim()) { setError("Comment cannot be empty."); textAreaRef.current?.focus(); return; }

    const optimisticId = crypto.randomUUID();
    const optimisticComment: CommentWithDetails = {
      id: optimisticId, // Temporary ID
      optimisticId: optimisticId, // Store temporary ID separately
      content: content.trim(),
      createdAt: new Date(),
      parentId: parentId,
      songId: songId,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        image: currentUser.image ?? null,
      },
      likes: 0,
      currentUserLiked: false,
      replies: [],
      isOptimistic: true, // Mark as optimistic
    };

    // If it's a reply, add optimistically
    if (parentId && onOptimisticReplyAdded) {
      onOptimisticReplyAdded(optimisticComment);
    }

    formRef.current?.reset();
    setError(null);

    startTransition(async () => {
      try {
        const result = await addComment(formData);
        if (result.success && result.newComment) {
          console.log(`Server confirmed comment ${result.newComment.id}`);
          if (parentId && onServerConfirm) {
            onServerConfirm(optimisticId, result.newComment);
          } else if (!parentId && onSubmitSuccess) {
            onSubmitSuccess(); // Trigger refresh for top-level
          }
        } else {
          setError(result.error || "Failed to post comment.");
          if (parentId && onServerError) {
            onServerError(optimisticId); // Remove optimistic reply
          }
        }
      } catch (err) {
        console.error("Error calling addComment:", err);
        setError("An unexpected error occurred.");
        if (parentId && onServerError) {
          onServerError(optimisticId); // Remove optimistic reply
        }
      }
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    triggerSubmit();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (!isPending) {
        triggerSubmit();
      }
    }
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
          onKeyDown={handleKeyDown}
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
  onCommentDeleted: (commentId: string, parentId: string | null) => void;
  onReplyConfirmed: (optimisticId: string, confirmedComment: CommentWithDetails) => void;
  onReplyError: (optimisticId: string) => void;
  refreshTopLevelList: () => void;
}
const Comment: React.FC<CommentProps> = ({
  comment,
  songId,
  currentUser,
  level = 0,
  onCommentDeleted,
  onReplyConfirmed,
  onReplyError,
  refreshTopLevelList
}) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [visibleReplies, setVisibleReplies] = useState<CommentWithDetails[]>(comment.replies || []);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [_, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (!comment.isOptimistic) {
      setVisibleReplies(comment.replies || []);
    }
  }, [comment.replies, comment.isOptimistic]);

  const isCommentOwner = currentUser?.id === comment.user.id;
  const isOptimisticComment = comment.isOptimistic === true;

  // Handler for adding optimistic reply LOCALLY
  const handleOptimisticReplyAdd = (optimisticReply: CommentWithDetails) => {
    setShowReplyInput(false);
    setVisibleReplies(prevReplies => [...prevReplies, optimisticReply].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
  };

  // Handler for confirming/replacing optimistic reply LOCALLY
  const handleReplyConfirmation = (optimisticId: string, confirmedComment: CommentWithDetails) => {
    setVisibleReplies(prevReplies =>
      prevReplies.map(reply =>
        // *** Access optimisticId safely ***
        reply.optimisticId === optimisticId ? { ...confirmedComment, isOptimistic: false } : reply
      ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    );
    onReplyConfirmed(optimisticId, confirmedComment); // Bubble up
  };

  // Handler for removing optimistic reply LOCALLY on server error
  const handleReplyServerError = (optimisticId: string) => {
    setVisibleReplies(prevReplies => prevReplies.filter(reply => reply.optimisticId !== optimisticId));
    onReplyError(optimisticId); // Bubble up
  };

  const handleDelete = () => {
    if (!isCommentOwner || isDeleting || isOptimisticComment) return;
    startDeleteTransition(async () => {
      setIsDeleting(true);
      setDeleteError(null);
      try {
        const result = await deleteComment(comment.id);
        if (result.success) {
          onCommentDeleted(comment.id, comment.parentId);
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

  // --- Callbacks passed down to nested comments ---
  const handleNestedReplyConfirmed = useCallback((optimisticId: string, confirmedComment: CommentWithDetails) => {
    onReplyConfirmed(optimisticId, confirmedComment);
  }, [onReplyConfirmed]);

  const handleNestedReplyError = useCallback((optimisticId: string) => {
    onReplyError(optimisticId);
  }, [onReplyError]);

  const handleNestedCommentDeleted = useCallback((deletedCommentId: string, parentId: string | null) => {
    setVisibleReplies(prevReplies => prevReplies.filter(reply => reply.id !== deletedCommentId));
    onCommentDeleted(deletedCommentId, parentId);
  }, [onCommentDeleted]);


  const indentationClass = level > 0 ? `ml-4 sm:ml-6` : '';
  const optimisticClass = isOptimisticComment ? 'opacity-60' : '';

  return (
    <div className={`flex space-x-2 sm:space-x-3 ${indentationClass} ${optimisticClass}`} key={comment.optimisticId || comment.id}>
      <Link
        href={`/musicgrid/profile/${comment.user.id}/viewprofile`}
      >
        <div className="flex-shrink-0 pt-1"><AvatarPlaceholder username={comment.user.name} /></div>
      </Link>
      <div className="flex-1 min-w-0 relative group">
        {isCommentOwner && !isOptimisticComment && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={`absolute top-0 right-0 p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
                         opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="Delete comment"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        )}
        <div className="flex items-baseline space-x-1.5 mb-1 flex-wrap pr-8 md:pr-6">
          <Link
            href={`/musicgrid/profile/${comment.user.id}/viewprofile`}
          >
            <span className="font-semibold text-sm text-gray-800 break-words">{comment.user.name || 'Anonymous'}</span>
          </Link>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {isOptimisticComment ? 'Sending...' : formatTimestamp(comment.createdAt)}
          </span>
        </div>
        <p className="text-sm text-gray-700 mb-1.5 whitespace-pre-wrap break-words">{comment.content}</p>
        {deleteError && <p className="text-red-500 text-xs mt-1">{deleteError}</p>}
        <div className="flex items-center space-x-2">
          <LikeButton
            commentId={comment.id}
            initialLikes={comment.likes}
            initialLiked={comment.currentUserLiked}
            disabled={!currentUser || isOptimisticComment}
          />
          <button
            type="button"
            onClick={() => setShowReplyInput(!showReplyInput)}
            disabled={!currentUser || isOptimisticComment}
            className={`inline-flex items-center space-x-1 px-1.5 py-1 h-auto rounded-md group transition-colors duration-150 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${!currentUser || isOptimisticComment ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'}`}
            aria-label="Reply to comment">
            <MessageSquare className="h-4 w-4" /> <span className="text-xs font-medium">Reply</span>
          </button>
        </div>
        {showReplyInput && (
          <div className="mt-2">
            <CommentInput
              songId={songId}
              parentId={comment.id}
              onOptimisticReplyAdded={handleOptimisticReplyAdd}
              onServerConfirm={handleReplyConfirmation}
              onServerError={handleReplyServerError}
              onCancel={() => setShowReplyInput(false)}
              currentUser={currentUser}
              placeholder={`Replying to ${comment.user.name || 'Anonymous'}...`}
              autoFocus={true}
            />
          </div>
        )}
        {/* Render replies using the local state */}
        {visibleReplies.length > 0 && (
          <div className="mt-3 space-y-3 border-l-2 border-gray-100 pl-3 sm:pl-4">
            {/* *** Ensure reply uses the extended type *** */}
            {visibleReplies.map((reply: CommentWithDetails) => (
              <Comment
                key={reply.optimisticId || reply.id} // Use optimisticId in key
                comment={reply}
                songId={songId}
                currentUser={currentUser}
                level={level + 1}
                onCommentDeleted={handleNestedCommentDeleted}
                onReplyConfirmed={handleNestedReplyConfirmed}
                onReplyError={handleNestedReplyError}
                refreshTopLevelList={refreshTopLevelList}
              />
            ))}
          </div>
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
  // *** Use the extended type for state ***
  const [actualComments, setActualComments] = useState<CommentWithDetails[]>([]);
  // useOptimistic hook - ONLY for top-level deletes now
  const [optimisticComments, setOptimisticComments] = useOptimistic<CommentWithDetails[], { action: 'delete'; comment: { id: string } }>(
    actualComments,
    (state, { action, comment }) => {
      if (action === 'delete') {
        return state.filter((c) => c.id !== comment.id);
      }
      return state;
    }
  );

  const [sortBy, setSortBy] = useState<'top' | 'recent'>('top');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPendingSort, startTransitionSort] = useTransition();
  const [isPendingOptimistic, startOptimisticTransition] = useTransition();

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isLoadingMoreRef = useRef(isLoadingMore);
  const hasMoreRef = useRef(hasMore);
  const offsetRef = useRef(offset);

  useEffect(() => { isLoadingMoreRef.current = isLoadingMore; }, [isLoadingMore]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

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

      // *** Ensure fetched comments conform to extended type ***
      const fetchedCommentsTyped: CommentWithDetails[] = result.comments.map(c => ({ ...c }));

      setActualComments(prev => {
        if (loadMore) {
          const existingIds = new Set(prev.map(c => c.id));
          const newComments = fetchedCommentsTyped.filter(c => !existingIds.has(c.id));
          return [...prev, ...newComments];
        } else {
          return fetchedCommentsTyped;
        }
      });

      setOffset(currentOffset + result.comments.length);
      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);

    } catch (err) {
      console.error("Error in loadComments:", err);
      setError("Could not load comments. Please try again later.");
      setActualComments([]);
      setOffset(0);
      setHasMore(false);
      setTotalCount(0);
    } finally {
      if (loadMore) setIsLoadingMore(false);
      else setIsLoadingInitial(false);
    }
  }, [songId, sortBy]);

  // Function to reload the first page
  const refreshCommentList = useCallback(() => {
    console.log("Refreshing comment list...");
    setOffset(0);
    setHasMore(true);
    setError(null);
    loadComments(false);
  }, [loadComments]);

  // Effect for initial load and reacting to songId/sortBy changes
  useEffect(() => {
    console.log(`Effect triggered: songId=${songId}, sortBy=${sortBy}. Resetting state.`);
    if (observerRef.current) observerRef.current.disconnect();
    setActualComments([]);
    setOffset(0);
    setHasMore(true);
    setTotalCount(0);
    setIsLoadingMore(false);
    setError(null);
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
        }, { threshold: 1.0 }
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

  // --- Callback for successful TOP-LEVEL comment submission ---
  const handleTopLevelCommentSubmitSuccess = useCallback(() => {
    console.log("Top-level comment submitted successfully. Refreshing list.");
    setTimeout(refreshCommentList, REFRESH_DELAY);
  }, [refreshCommentList]);

  // --- Callback for handling SERVER CONFIRMATION of a REPLY ---
  const handleReplyConfirmed = useCallback((optimisticId: string, confirmedComment: CommentWithDetails) => {
    console.log(`Confirming reply: optimisticId=${optimisticId}, realId=${confirmedComment.id}`);
    startOptimisticTransition(() => {
      setActualComments(prevActualComments => {
        const confirmRecursively = (commentsList: CommentWithDetails[]): CommentWithDetails[] => {
          return commentsList.map(c => {
            if (c.id === confirmedComment.parentId) {
              let updatedReplies = c.replies ? [...c.replies] : [];
              const idx = updatedReplies.findIndex(r => (r as CommentWithDetails).optimisticId === optimisticId);
              if (idx !== -1) {
                // Replace optimistic reply with confirmed reply
                const newReply = { ...confirmedComment };
                newReply.isOptimistic = false;
                newReply.optimisticId = undefined;
                updatedReplies[idx] = newReply;
              } else {
                // Append confirmed reply if not found
                updatedReplies.push({ ...confirmedComment, optimisticId: undefined } as CommentWithDetails);
              }
              return { ...c, replies: updatedReplies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: confirmRecursively(c.replies) };
            }
            return c;
          });
        };
        return confirmRecursively(prevActualComments);
      });
    });
  }, []);

  // --- Callback for handling SERVER ERROR during REPLY add ---
  const handleReplyError = useCallback((optimisticId: string) => {
    console.warn(`Removing optimistic reply ${optimisticId} due to server error.`);
    startOptimisticTransition(() => {
      setActualComments(prevActualComments => {
        const removeRecursively = (commentsList: CommentWithDetails[]): CommentWithDetails[] => {
          return commentsList
            .map(c => {
              if (c.replies && c.replies.length > 0) {
                // *** Use optimisticId for filtering ***
                const filteredReplies = (c.replies as CommentWithDetails[]).filter(reply => reply.optimisticId !== optimisticId);
                if (filteredReplies.length !== c.replies.length) {
                  console.log(`Removed reply ${optimisticId} from parent ${c.id}`);
                  return { ...c, replies: removeRecursively(filteredReplies) };
                } else {
                  return { ...c, replies: removeRecursively(c.replies) };
                }
              }
              return c;
            })
            // *** Use optimisticId for filtering top-level too ***
            .filter(c => c.optimisticId !== optimisticId);
        };
        return removeRecursively(prevActualComments);
      });
    });
  }, []);

  // --- Callback for successful comment deletion (top-level or nested) ---
  const handleCommentDeleted = useCallback((deletedCommentId: string, parentId: string | null) => {
    console.log(`Comment ${deletedCommentId} deleted.`);
    startOptimisticTransition(() => {
      setActualComments(prevActualComments => {
        const removeRecursively = (commentsList: CommentWithDetails[]): CommentWithDetails[] => {
          return commentsList
            .filter(c => c.id !== deletedCommentId)
            .map(c => {
              if (c.replies && c.replies.length > 0) {
                return { ...c, replies: removeRecursively(c.replies) };
              }
              return c;
            });
        };
        return removeRecursively(prevActualComments);
      });
      if (parentId === null) {
        setOptimisticComments({ action: 'delete', comment: { id: deletedCommentId } });
      }
    });
  }, [setOptimisticComments]);


  return (
    <div className="w-full max-w-3xl mx-auto py-6 px-4 sm:px-0 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
          {!isLoadingInitial && totalCount > 0 ? `${totalCount} Comment${totalCount !== 1 ? 's' : ''}` : 'Comments'}
          {(isLoadingInitial || isPendingSort || isPendingOptimistic) && <Loader2 className="inline-block h-5 w-5 animate-spin text-gray-400 ml-2" />}
        </h2>
        {!isLoadingInitial && optimisticComments.length > 0 && (
          <SortDropdown currentSort={sortBy} onSortChange={handleSortChange} />
        )}
      </div>

      {/* Top-Level Input */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <CommentInput
          songId={songId}
          onSubmitSuccess={handleTopLevelCommentSubmitSuccess}
          currentUser={currentUser}
        />
      </div>

      {/* Comments List & Loading States */}
      <div className="space-y-4">
        {isLoadingInitial && optimisticComments.length === 0 && (
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
        {!isLoadingInitial && !error && optimisticComments.length === 0 && (
          <p className="text-gray-500 text-center py-6 italic">No comments yet. Be the first!</p>
        )}
        {/* Render Comments using the optimistic state (for top-level deletes) */}
        {optimisticComments.map((comment: CommentWithDetails) => (
          <div key={comment.optimisticId || comment.id} className="py-2 border-b border-gray-100 last:border-b-0">
            <Comment
              comment={comment}
              songId={songId}
              currentUser={currentUser}
              level={0}
              onCommentDeleted={handleCommentDeleted}
              onReplyConfirmed={handleReplyConfirmed}
              onReplyError={handleReplyError}
              refreshTopLevelList={refreshCommentList}
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
        {!isLoadingInitial && !isLoadingMore && !hasMore && optimisticComments.length > 0 && (
          <p className="text-center text-gray-400 text-sm py-4 italic">~ End of comments ~</p>
        )}
      </div>
    </div>
  );
};

export default CommentSection;