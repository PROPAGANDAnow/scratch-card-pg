import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '~/app/interface/card';

interface UseInfiniteCardsOptions {
  userWallet: string;
  initialLimit?: number;
  stateFilter?: 'unscratched' | 'scratched' | 'claimed' | 'all';
  threshold?: number;
}

interface PaginatedCardsResponse {
  cards: (Card & { cardState: 'unscratched' | 'scratched' | 'claimed' })[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function useInfiniteCards({
  userWallet,
  initialLimit = 20,
  stateFilter = 'all',
  threshold = 100
}: UseInfiniteCardsOptions) {
  const [cards, setCards] = useState<(Card & { cardState: 'unscratched' | 'scratched' | 'claimed' })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Fetch cards function
  const fetchCards = useCallback(async (page: number, isInitial = false) => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userWallet,
        page: page.toString(),
        limit: initialLimit.toString(),
        state: stateFilter
      });

      const response = await fetch(`/api/cards/user-cards?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cards: ${response.statusText}`);
      }

      const result: { success: boolean; data: PaginatedCardsResponse } = await response.json();

      if (!result.success) {
        throw new Error(String(result.data));
      }

      const { cards: newCards, pagination } = result.data;

      if (isInitial) {
        setCards(newCards);
      } else {
        setCards(prev => [...prev, ...newCards]);
      }

      setTotalCount(pagination.totalCount);
      setHasMore(pagination.hasNextPage);
      setCurrentPage(pagination.currentPage);

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Error fetching cards:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [userWallet, initialLimit, stateFilter]);

  // Initial fetch
  useEffect(() => {
    if (userWallet) {
      setCards([]);
      setCurrentPage(1);
      setHasMore(true);
      fetchCards(1, true);
    }
  }, [userWallet, stateFilter, fetchCards]);

  // Load more function
  const loadMore = useCallback(() => {
    if (!loading && !loadingRef.current && hasMore && userWallet) {
      const nextPage = currentPage + 1;
      fetchCards(nextPage, false);
    }
  }, [loading, hasMore, currentPage, userWallet, fetchCards]);

  // Set up intersection observer
  useEffect(() => {
    if (loadMoreRef.current && hasMore && !loading) {
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

  // Reset function for state changes
  const reset = useCallback(() => {
    setCards([]);
    setCurrentPage(1);
    setHasMore(true);
    setError(null);
    loadingRef.current = false;
  }, []);

  // Refetch function
  const refetch = useCallback(() => {
    reset();
    if (userWallet) {
      fetchCards(1, true);
    }
  }, [reset, userWallet, fetchCards]);

  return {
    cards,
    loading,
    error,
    hasMore,
    totalCount,
    currentPage,
    loadMore,
    loadMoreRef,
    reset,
    refetch
  };
}