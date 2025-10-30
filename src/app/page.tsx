"use client";
import { useContext, useEffect } from "react";
import { AppContext } from "./context";
import SwipeableCardStack from "~/components/swipeable-card-stack";
import { SET_LOCAL_CARDS, SET_SWIPABLE_MODE } from "./context/actions";
import { useContractStats } from "~/hooks";

export default function Home() {
  const [state, dispatch] = useContext(AppContext);
  const { isPaused, formattedStats } = useContractStats();

  useEffect(() => {
    dispatch({ type: SET_SWIPABLE_MODE, payload: true });
    return () => {
      dispatch({ type: SET_SWIPABLE_MODE, payload: false });
      dispatch({ type: SET_LOCAL_CARDS, payload: [] });
    };
  }, [dispatch]);

  // Sync localCards with unscratched cards and update scratched status
  useEffect(() => {
    if (state.unscratchedCards.length > 0 || state.localCards.length > 0) {
      // Create a set of unscratched card IDs for quick lookup
      const unscratchedIds = new Set(state.unscratchedCards.map(card => card.id));

      // Update existing cards: only mark as scratched if explicitly scratched in the cards array
      const updatedCards = state.localCards.map(card => {
        if (unscratchedIds.has(card.id)) {
          // Card is in unscratchedCards, ensure it's not marked as scratched
          return { ...card, scratched: false };
        } else {
          // Card is not in unscratchedCards, check if it's already marked as scratched
          // If not, it might be a new card that hasn't been added to unscratchedCards yet
          return card.scratched ? card : { ...card, scratched: true };
        }
      });

      // Add new unscratched cards that don't exist locally
      const existingIds = new Set(state.localCards.map(card => card.id));
      const newCards = state.unscratchedCards.filter(card => !existingIds.has(card.id));

      const newLocalCards = [...updatedCards, ...newCards];

      // Only update if there are actual changes to prevent infinite loop
      const hasChanges = JSON.stringify(newLocalCards) !== JSON.stringify(state.localCards);
      if (hasChanges) {
        dispatch({ type: SET_LOCAL_CARDS, payload: newLocalCards });
      }
    }
  }, [state.unscratchedCards, dispatch]);

  // Show contract pause overlay if contract is paused
  if (isPaused && formattedStats) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⏸️</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Contract Paused</h1>
          <p className="text-white/60 mb-4">
            The scratch card contract is currently paused. No new cards can be minted or scratched at this time.
          </p>
          <div className="bg-white/5 rounded-lg p-4 text-left">
            <p className="text-sm text-white/60 mb-2">Contract Stats:</p>
            <div className="space-y-1">
              <p className="text-sm text-white/80">Total Minted: {formattedStats.totalMinted.toLocaleString()}</p>
              <p className="text-sm text-white/80">Prizes Claimed: {formattedStats.totalClaimed.toLocaleString()}</p>
              <p className="text-sm text-white/80">Card Price: {formattedStats.currentPrice} ETH</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SwipeableCardStack userWallet={state.user?.wallet || ''} tokenIds={[1, 2, 3]} />
    </>
  );
}
