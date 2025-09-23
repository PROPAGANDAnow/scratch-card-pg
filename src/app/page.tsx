"use client";
import { useContext, useEffect } from "react";
import { AppContext } from "./context";
import SwipeableCardStack from "~/components/swipeable-card-stack";
import { SET_LOCAL_CARDS, SET_SWIPABLE_MODE } from "./context/actions";

export default function Home() {
  const [state, dispatch] = useContext(AppContext);

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

  return (
    <>
      <SwipeableCardStack cards={state.localCards} />
    </>
  );
}
