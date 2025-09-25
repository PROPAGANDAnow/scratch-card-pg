import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '~/app/interface/card';

/**
 * Hook for virtualizing card rendering to improve performance
 * Only renders visible cards and a small buffer around them
 */
export const useVirtualizedCards = (cards: Card[], currentIndex: number, bufferSize = 1) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 3 });

  useEffect(() => {
    const start = Math.max(0, currentIndex - bufferSize);
    const end = Math.min(cards.length, currentIndex + bufferSize + 1);
    setVisibleRange({ start, end });
  }, [currentIndex, cards.length, bufferSize]);

  const visibleCards = useMemo(() => {
    return cards.slice(visibleRange.start, visibleRange.end);
  }, [cards, visibleRange]);

  const getCardIndex = useCallback((card: Card) => {
    return cards.findIndex(c => c.id === card.id);
  }, [cards]);

  return {
    visibleCards,
    visibleRange,
    getCardIndex,
    totalCards: cards.length
  };
};
