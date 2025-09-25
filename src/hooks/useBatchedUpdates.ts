import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook for batching multiple state updates into a single dispatch
 * Improves performance by reducing re-render frequency
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useBatchedUpdates = (dispatch: (action: any) => void) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingUpdatesRef = useRef<any[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batchUpdate = useCallback((updates: any[]) => {
    pendingUpdatesRef.current.push(...updates);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Batch updates in next tick
    timeoutRef.current = setTimeout(() => {
      if (pendingUpdatesRef.current.length > 0) {
        // Create a single batched action
        dispatch({
          type: 'BATCH_UPDATE',
          payload: pendingUpdatesRef.current
        });
        pendingUpdatesRef.current = [];
      }
    }, 0);
  }, [dispatch]);

  const flushUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (pendingUpdatesRef.current.length > 0) {
      dispatch({
        type: 'BATCH_UPDATE',
        payload: pendingUpdatesRef.current
      });
      pendingUpdatesRef.current = [];
    }
  }, [dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { batchUpdate, flushUpdates };
};
