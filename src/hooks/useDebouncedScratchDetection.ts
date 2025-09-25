import { useRef, useCallback, } from 'react';

/**
 * Debounced scratch detection hook to prevent excessive API calls
 * and improve performance during rapid scratching
 */
export const useDebouncedScratchDetection = (callback: () => void, delay = 100) => {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isProcessingRef = useRef(false);

  const debouncedCallback = useCallback(() => {
    if (isProcessingRef.current) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      isProcessingRef.current = true;
      callback();
      // Reset processing flag after a short delay
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 200);
    }, delay);
  }, [callback, delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    isProcessingRef.current = false;
  }, []);

  return { debouncedCallback, cancel };
};
