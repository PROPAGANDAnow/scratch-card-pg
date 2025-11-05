import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { TokenWithState } from '~/hooks';
// import { Card } from '~/app/interface/card';
import { useUserStore } from '~/stores/user-store';

export interface CardStore {
  // Card State
  selectedCard: TokenWithState | null;
  cards: TokenWithState[];
  unscratchedCards: TokenWithState[];
  localCards: TokenWithState[];
  currentCardIndex: number;
  loading: boolean;
  error: Error | null;
  totalCount: number;
  cardDirection: 1 | -1;


  // Actions
  setSelectedCard: (selectedCard: TokenWithState | null) => void;
  setCards: (cards: TokenWithState[]) => void;
  setUnscratchedCards: (unscratchedCards: TokenWithState[]) => void;
  setLocalCards: (localCards: TokenWithState[]) => void;
  setCurrentCardIndex: (currentCardIndex: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setTotalCount: (totalCount: number) => void;
  setCardDirection: (direction: 1 | -1) => void

  // Computed actions
  updateUnscratchedCards: () => void;
  addCard: (card: TokenWithState) => void;
  updateCard: (cardId: string, updates: Partial<TokenWithState>) => void;
  updateCardMeta: (cardId: string, metaUpdates: Partial<TokenWithState['state']>) => void;
  refetchCards: (address?: string) => Promise<void>;
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
      loading: false,
      error: null,
      totalCount: 0,
      cardDirection: 1,

      setCardDirection: (cardDirection) => set({ cardDirection }),

      // Basic actions
      setSelectedCard: (selectedCard) => set({ selectedCard }),
      setCards: (cards) => {
        set({ cards });
        get().updateUnscratchedCards();
      },
      setUnscratchedCards: (unscratchedCards) => set({ unscratchedCards }),
      setLocalCards: (localCards) => set({ localCards }),
      setCurrentCardIndex: (currentCardIndex) => set({ currentCardIndex }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setTotalCount: (totalCount) => set({ totalCount }),

      // Computed actions
      updateUnscratchedCards: () => {
        const { cards } = get();
        const unscratchedCards = cards.filter((card) => !card.state.scratched);
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

      updateCardMeta: (cardId, metaUpdates) => {
        const { cards, selectedCard } = get();
        const updatedCards = cards.map((card) =>
          card.id === cardId
            ? {
              ...card,
              state: {
                ...card.state,
                ...metaUpdates
              }
            }
            : card
        );
        set({ cards: updatedCards });

        // Update selected card if it's the one being updated
        if (selectedCard?.id === cardId) {
          set({
            selectedCard: {
              ...selectedCard,
              state: {
                ...selectedCard.state,
                ...metaUpdates
              }
            }
          });
        }

        get().updateUnscratchedCards();
      },

      refetchCards: async (userAddress?: string) => {
        const { selectedCard } = get();
        const currUserAddress = useUserStore.getState().user?.address;

        userAddress = userAddress || currUserAddress

        if (!userAddress) {
          console.error("User address not found")
          set({ error: new Error('User address not found') });
          return;
        }

        set({ loading: true, error: null });

        try {
          const response = await fetch(`/api/cards/get-by-owner?userWallet=${userAddress}`);
          if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
          }
          const data = await response.json();
          const newCards = data.data?.availableCards || [];
          const totalCount = data.data?.totalCount ?? 0;

          set({
            cards: newCards,
            totalCount,
            loading: false
          });

          // Update selected card if it exists
          if (selectedCard) {
            const updatedSelectedCard = newCards.find(
              (item: { metadata: TokenWithState }) => item.metadata.id === selectedCard.id
            );
            if (updatedSelectedCard) {
              set({ selectedCard: updatedSelectedCard.metadata });
            }
          }
        } catch (error) {
          console.error('Failed to refetch user cards:', error);
          set({
            error: error instanceof Error ? error : new Error('Failed to fetch cards'),
            loading: false
          });
        }
      },
    }),
    {
      name: 'card-store',
    }
  )
);