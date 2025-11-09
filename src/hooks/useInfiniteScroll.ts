import { useState, useEffect, useCallback, useRef } from 'react';
import { useActivity, UseActivityOptions } from './useActivity';

interface UseInfiniteScrollOptions extends UseActivityOptions {
  threshold?: number;
}

export function useInfiniteScroll(options: UseInfiniteScrollOptions = {}) {
  const { threshold = 100 } = options;
  const [offset, setOffset] = useState(0);
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Fetch initial and paginated data
  const { activities, loading, error, totalEntries } = useActivity({
    ...options,
    offset,
    refetchInterval: undefined // Disable auto-refetch for manual control
  });

  // Reset when type changes
  useEffect(() => {
    setOffset(0);
    setAllActivities([]);
    setHasMore(true);
  }, [options.type]);

  // Append new activities when they arrive
  useEffect(() => {
    if (activities.length > 0 && !loading) {
      if (offset === 0) {
        setAllActivities(activities);
      } else {
        setAllActivities(prev => [...prev, ...activities]);
      }

      // Check if there's more data
      const currentTotal = offset + activities.length;
      setHasMore(currentTotal < totalEntries);
      loadingRef.current = false;
    }
  }, [activities, loading, offset, totalEntries]);

  // Load more function
  const loadMore = useCallback(() => {
    if (!loading && !loadingRef.current && hasMore) {
      loadingRef.current = true;
      setOffset(prev => prev + (options.limit || 20));
    }
  }, [loading, hasMore, options.limit]);

  // Set up intersection observer
  useEffect(() => {
    if (loadMoreRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting && hasMore && !loading) {
            loadMore();
          }
        },
        {
          rootMargin: `${threshold}px`,
          threshold: 0.1
        }
      );

      observerRef.current.observe(loadMoreRef.current);

      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }
  }, [hasMore, loading, loadMore, threshold]);

  return {
    activities: allActivities,
    loading,
    error,
    hasMore,
    loadMore,
    loadMoreRef
  };
}