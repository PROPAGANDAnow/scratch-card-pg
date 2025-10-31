import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface UIStore {
  // UI Functions
  playWinSound: (() => void) | null;
  getWinnerGif: (() => HTMLImageElement | null) | null;
  refetchUserCards: (() => Promise<void>) | null;
  buyCards: (() => void) | null;
  nextCard: (() => void) | null;
  
  // Actions
  setPlayWinSound: (playWinSound: (() => void) | null) => void;
  setGetWinnerGif: (getWinnerGif: (() => HTMLImageElement | null) | null) => void;
  setRefetchUserCards: (refetchUserCards: (() => Promise<void>) | null) => void;
  setBuyCards: (buyCards: (() => void) | null) => void;
  setNextCard: (nextCard: (() => void) | null) => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      // Initial state
      playWinSound: null,
      getWinnerGif: null,
      refetchUserCards: null,
      buyCards: null,
      nextCard: null,

      // Actions
      setPlayWinSound: (playWinSound) => set({ playWinSound }),
      setGetWinnerGif: (getWinnerGif) => set({ getWinnerGif }),
      setRefetchUserCards: (refetchUserCards) => set({ refetchUserCards }),
      setBuyCards: (buyCards) => set({ buyCards }),
      setNextCard: (nextCard) => set({ nextCard }),
    }),
    {
      name: 'ui-store',
    }
  )
);