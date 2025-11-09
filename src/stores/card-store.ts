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
  activeTokenId: string | null;
  loading: boolean;
  error: Error | null;
  totalCount: number;
  cardDirection: 1 | -1;
  showBuyModal: boolean;


  // Actions
  setSelectedCard: (selectedCard: TokenWithState | null) => void;
  setCards: (cards: TokenWithState[]) => void;
  setUnscratchedCards: (unscratchedCards: TokenWithState[]) => void;
  setLocalCards: (localCards: TokenWithState[]) => void;
  setActiveTokenId: (activeTokenId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setTotalCount: (totalCount: number) => void;
  setCardDirection: (direction: 1 | -1) => void;
  setShowBuyModal: (showBuyModal: boolean) => void;

  // Computed actions
  updateUnscratchedCards: () => void;
  addCard: (card: TokenWithState) => void;
  updateCard: (cardId: string, updates: Partial<TokenWithState>) => void;
  updateCardMeta: (cardId: string, metaUpdates: Partial<TokenWithState['state']>) => void;
  refetchCards: (address?: string) => Promise<void>;

  // Navigation actions
  goNext: () => void;
  goPrev: () => void;
  canGoNext: () => boolean;
  canGoPrev: () => boolean;
  getCurrentCard: () => TokenWithState | null;

  scratched: boolean;
  setScratched: (scratched: boolean) => void

  initialFetch: boolean;
  setInitialFetch: (initialFetch: boolean) => void
}

export const useCardStore = create<CardStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      selectedCard: null,
      cards: [],
      unscratchedCards: [],
      localCards: [],
      activeTokenId: null,
      loading: false,
      error: null,
      totalCount: 0,
      cardDirection: 1,
      showBuyModal: false,

      initialFetch: true,
      setInitialFetch: (initialFetch) => set({ initialFetch }),

      scratched: false,

      setCardDirection: (cardDirection) => set({ cardDirection }),
      setShowBuyModal: (showBuyModal) => set({ showBuyModal }),

      // Basic actions
      setSelectedCard: (selectedCard) => set({ selectedCard }),
      setCards: (cards) => {
        set({ cards });
        get().updateUnscratchedCards();
        // Set activeTokenId to first card if none is active
        const { activeTokenId } = get();
        if (!activeTokenId && cards.length > 0) {
          set({ activeTokenId: cards[0].id });
        }
      },
      setUnscratchedCards: (unscratchedCards) => set({ unscratchedCards }),
      setLocalCards: (localCards) => set({ localCards }),
      setActiveTokenId: (activeTokenId) => set({ activeTokenId }),
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
        const { selectedCard, activeTokenId } = get();
        const currUserAddress = useUserStore.getState().user?.address;

        userAddress = userAddress || currUserAddress

        if (!userAddress) {
          console.error("User address not found")
          set({ error: new Error('User address not found') });
          return;
        }

        if (!!get().loading) return

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
            loading: false,
            initialFetch: false,
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

          // Restore activeTokenId if it exists in the new cards
          if (activeTokenId && newCards.some((card: TokenWithState) => card.id === activeTokenId)) {
            set({
              activeTokenId
            });
          } else if (newCards.length > 0) {
            // Set to first card if active card no longer exists
            set({
              activeTokenId: newCards[0].id
            });
          }
        } catch (error) {
          console.error('Failed to refetch user cards:', error);
          set({
            error: error instanceof Error ? error : new Error('Failed to fetch cards'),
            loading: false
          });
        }
      },

      // Navigation actions
      goNext: () => {
        const { cards, activeTokenId } = get();
        if (!activeTokenId) {
          if (cards.length > 0) {
            set({ activeTokenId: cards[0].id });
          }
          return;
        }

        const currentIndex = cards.findIndex((card: TokenWithState) => card.id === activeTokenId);
        if (currentIndex < cards.length - 1) {
          const nextIndex = currentIndex + 1;
          set({
            activeTokenId: cards[nextIndex].id,
            cardDirection: 1
          });
        }
      },

      goPrev: () => {
        const { cards, activeTokenId } = get();
        if (!activeTokenId) {
          if (cards.length > 0) {
            set({ activeTokenId: cards[0].id });
          }
          return;
        }

        const currentIndex = cards.findIndex((card: TokenWithState) => card.id === activeTokenId);
        if (currentIndex > 0) {
          const prevIndex = currentIndex - 1;
          set({
            activeTokenId: cards[prevIndex].id,
            cardDirection: -1
          });
        }
      },

      canGoNext: () => {
        const { cards, activeTokenId } = get();
        if (!activeTokenId || cards.length === 0) return false;
        const currentIndex = cards.findIndex((card: TokenWithState) => card.id === activeTokenId);
        return currentIndex < cards.length - 1;
      },

      canGoPrev: () => {
        const { cards, activeTokenId } = get();
        if (!activeTokenId || cards.length === 0) return false;
        const currentIndex = cards.findIndex((card: TokenWithState) => card.id === activeTokenId);
        return currentIndex > 0;
      },

      getCurrentCard: () => {
        const { cards, activeTokenId } = get();
        if (!activeTokenId) return null;
        return cards.find((card: TokenWithState) => card.id === activeTokenId) || null;
      },
    }),
    {
      name: 'card-store',
    }
  )
);