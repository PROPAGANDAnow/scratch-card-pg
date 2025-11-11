import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { TokenWithState } from '~/hooks';
// import { Card } from '~/app/interface/card';
import { useUserStore } from '~/stores/user-store';

export interface CardStore {
  // Card State
  // selectedCard: TokenWithState | null;
  cards: TokenWithState[];
  activeTokenId: string | null;
  loading: boolean;
  error: Error | null;
  totalCount: number;
  cardDirection: 1 | -1;
  showBuyModal: boolean;


  // Actions
  // setSelectedCard: (selectedCard: TokenWithState | null) => void;
  setCards: (cards: TokenWithState[]) => void;
  // setLocalCards: (localCards: TokenWithState[]) => void;
  setActiveTokenId: (activeTokenId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setTotalCount: (totalCount: number) => void;
  setCardDirection: (direction: 1 | -1) => void;
  setShowBuyModal: (showBuyModal: boolean) => void;

  // Computed actions
  addCard: (card: TokenWithState) => void;
  updateCard: (cardId: string, updates: Partial<TokenWithState>) => void;
  updateCardMeta: (cardId: string, metaUpdates: Partial<TokenWithState['state']>) => void;
  refetchCards: (address?: string) => Promise<void>;

  // Navigation actions
  goToNextAvailable: () => void;
  goNext: () => void;
  goPrev: () => void;
  canGoNext: () => boolean;
  canGoPrev: () => boolean;
  getCurrentCard: () => TokenWithState | null;

  scratched: boolean;
  setScratched: (scratched: boolean) => void

  isMinting: boolean;
  setMinting: (isMinting: boolean) => void

  initialFetch: boolean;
  setInitialFetch: (initialFetch: boolean) => void
}

export const getUnscratchedCards = (cards: TokenWithState[]) => cards.filter(c => !c.state.scratched)

export const useCardStore = create<CardStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      selectedCard: null,
      cards: [],
      localCards: [],
      activeTokenId: null,
      loading: false,
      error: null,
      totalCount: 0,
      cardDirection: 1,
      showBuyModal: false,
      initialFetch: true,
      setInitialFetch: (initialFetch) => set({ initialFetch }),
      // unscratchedCards: () => get().cards.filter(c => !c.state.scratched),

      goToNextAvailable: () => {
        const { canGoNext, goNext, goPrev, setActiveTokenId, canGoPrev } = get()
        if (canGoNext()) {
          goNext()
        } else if (canGoPrev()) {
          goPrev()
        } else {
          setActiveTokenId(null)
        }
      },

      scratched: false,
      setScratched: (scratched) => set({ scratched }),

      setCardDirection: (cardDirection) => set({ cardDirection }),
      setShowBuyModal: (showBuyModal) => set({ showBuyModal }),

      isMinting: false,
      setMinting: (isMinting) => set({ isMinting }),

      // Basic actions
      setCards: (cards) => {
        set({ cards });
        // Set activeTokenId to first card if none is active
        const { activeTokenId } = get();
        if (!activeTokenId && cards.length > 0) {
          set({ activeTokenId: cards[0].id });
        }
      },
      setActiveTokenId: (activeTokenId) => set({ activeTokenId }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setTotalCount: (totalCount) => set({ totalCount }),

      addCard: (card) => {
        const { cards } = get();
        const newCards = [...cards, card];
        set({ cards: newCards });
      },

      updateCard: (cardId, updates) => {
        const { cards } = get();
        const updatedCards = cards.map((card) =>
          String(card.state.token_id) === cardId ? { ...card, ...updates } : card
        );

        set({ cards: updatedCards });
      },

      updateCardMeta: (cardId, metaUpdates) => {
        const { cards } = get();
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
      },

      refetchCards: async (userAddress?: string) => {
        const { activeTokenId } = get();
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

          const wasInitialFetch = get().initialFetch;

          set({
            cards: newCards,
            totalCount,
            loading: false,
            initialFetch: false
          });

          const existingActive = activeTokenId && newCards.some((card: TokenWithState) => card.id === activeTokenId);

          if (wasInitialFetch) {
            const scratchedUnclaimed = newCards.find((card: TokenWithState) => card.state.scratched && !card.state.claimed);
            if (scratchedUnclaimed) {
              set({ activeTokenId: scratchedUnclaimed.id });
              return;
            }
          }

          if (existingActive) {
            set({ activeTokenId });
          } else if (newCards.length > 0) {
            set({ activeTokenId: newCards[0].id });
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

        const unscratchedCards = getUnscratchedCards(cards)
        const currentIndex = unscratchedCards.findIndex((card: TokenWithState) => card.id === activeTokenId);

        if (!unscratchedCards.length) {
          set({
            activeTokenId: null,
            cardDirection: 1
          });
        }

        const nextIndex = currentIndex + 1;
        set({
          activeTokenId: unscratchedCards[nextIndex].id,
          cardDirection: 1
        });
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