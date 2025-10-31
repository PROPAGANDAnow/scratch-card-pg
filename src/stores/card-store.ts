import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Card } from '~/app/interface/card';

export interface CardStore {
  // Card State
  selectedCard: Card | null;
  cards: Card[];
  unscratchedCards: Card[];
  localCards: Card[];
  currentCardIndex: number;
  
  // Actions
  setSelectedCard: (selectedCard: Card | null) => void;
  setCards: (cards: Card[]) => void;
  setUnscratchedCards: (unscratchedCards: Card[]) => void;
  setLocalCards: (localCards: Card[]) => void;
  setCurrentCardIndex: (currentCardIndex: number) => void;
  
  // Computed actions
  updateUnscratchedCards: () => void;
  addCard: (card: Card) => void;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
}

export const useCardStore = create<CardStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      selectedCard: null,
      cards: [],
      unscratchedCards: [],
      localCards: [],
      currentCardIndex: 0,

      // Basic actions
      setSelectedCard: (selectedCard) => set({ selectedCard }),
      setCards: (cards) => {
        set({ cards });
        get().updateUnscratchedCards();
      },
      setUnscratchedCards: (unscratchedCards) => set({ unscratchedCards }),
      setLocalCards: (localCards) => set({ localCards }),
      setCurrentCardIndex: (currentCardIndex) => set({ currentCardIndex }),

      // Computed actions
      updateUnscratchedCards: () => {
        const { cards } = get();
        const unscratchedCards = cards.filter((card) => !card.scratched);
        set({ unscratchedCards });
      },

      addCard: (card) => {
        const { cards } = get();
        const newCards = [...cards, card];
        set({ cards: newCards });
        get().updateUnscratchedCards();
      },

      updateCard: (cardId, updates) => {
        const { cards, selectedCard } = get();
        const updatedCards = cards.map((card) =>
          card.id === cardId ? { ...card, ...updates } : card
        );
        set({ cards: updatedCards });
        
        // Update selected card if it's the one being updated
        if (selectedCard?.id === cardId) {
          set({ selectedCard: { ...selectedCard, ...updates } });
        }
        
        get().updateUnscratchedCards();
      },
    }),
    {
      name: 'card-store',
    }
  )
);