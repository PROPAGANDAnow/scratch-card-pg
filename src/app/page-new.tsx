/**
 * Web3 Home Page
 * 
 * Replaces traditional home page with Web3 functionality
 * Integrates NFT cards and on-chain interactions
 */

"use client";
import { useContext, useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { AppContext } from "./context";
import { SET_LOCAL_CARDS, SET_SWIPABLE_MODE } from "./context/actions";
import NftInitialScreen from "~/components/nft-initial-screen";
import NftScratchOff from "~/components/nft-scratch-off";
import { useWallet } from "~/hooks/useWeb3Wallet";
import { useUserCards } from "~/hooks/useContractMinting";
import { Card } from "./interface/card";

export default function NftHome() {
  const [state, dispatch] = useContext(AppContext);
  const [currentView, setCurrentView] = useState<'initial' | 'scratching' | 'cards'>('initial');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Web3 hooks
  const { address } = useWallet();
  const { tokenIds } = useUserCards(address);

  // Convert token IDs to card format for compatibility
  const nftCards = useMemo(() => {
    if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) return [];

    return tokenIds.map((tokenId: bigint, index: number) => ({
      id: tokenId.toString(),
      user_wallet: address || '',
      payment_tx: '', // Will be populated from transaction events
      prize_amount: 0, // Will be determined when scratching
      scratched_at: undefined,
      prize_asset_contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
      numbers_json: [], // Will be generated when scratching
      claimed: false,
      payout_tx: undefined,
      created_at: new Date(),
      scratched: false,
      prize_won: false,
      token_id: Number(tokenId),
      contract_address: '0x0000000000000000000000000000000000000000', // Placeholder
      shared_to: null,
      shared_from: null,
    } as Card));
  }, [tokenIds, address]);

  // Initialize swipable mode
  useEffect(() => {
    dispatch({ type: SET_SWIPABLE_MODE, payload: true });
    return () => {
      dispatch({ type: SET_SWIPABLE_MODE, payload: false });
      dispatch({ type: SET_LOCAL_CARDS, payload: [] });
    };
  }, [dispatch]);

  // Sync local cards with NFT cards
  useEffect(() => {
    if (nftCards.length > 0 || state.localCards.length > 0) {
      // Create a set of NFT card IDs for quick lookup
      const nftCardIds = new Set(nftCards.map(card => card.id));

      // Update existing cards
      const updatedCards = state.localCards.map(card => {
        if (nftCardIds.has(card.id)) {
          // Card exists in NFTs, sync scratched status
          const nftCard = nftCards.find(nft => nft.id === card.id);
          return nftCard || card;
        }
        return card;
      });

      // Add new NFT cards that don't exist locally
      const existingIds = new Set(state.localCards.map(card => card.id));
      const newCards = nftCards.filter(card => !existingIds.has(card.id));

      const newLocalCards = [...updatedCards, ...newCards];

      // Only update if there are actual changes
      const hasChanges = JSON.stringify(newLocalCards) !== JSON.stringify(state.localCards);
      if (hasChanges) {
        dispatch({ type: SET_LOCAL_CARDS, payload: newLocalCards });
      }
    }
  }, [nftCards, state.localCards, dispatch]);

  // Handle scratch now
  const handleScratchNow = useCallback(() => {
    if (nftCards.length > 0) {
      setCurrentView('scratching');
      setCurrentCardIndex(0);
    }
  }, [nftCards]);

  // Handle next card
  const handleNextCard = useCallback(() => {
    if (currentCardIndex < nftCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      setCurrentView('cards');
    }
  }, [currentCardIndex, nftCards.length]);

  // Handle back to cards
  const handleBackToCards = useCallback(() => {
    setCurrentView('cards');
  }, []);

  // Handle prize revealed
  const handlePrizeRevealed = useCallback((prizeAmount: number) => {
    console.log('Prize revealed:', prizeAmount);
    // Update card state in context
    const updatedCards = state.localCards.map(card =>
      card.id === nftCards[currentCardIndex]?.id
        ? { ...card, scratched: true, prize_amount: prizeAmount }
        : card
    );
    dispatch({ type: SET_LOCAL_CARDS, payload: updatedCards });
  }, [state.localCards, nftCards, currentCardIndex, dispatch]);

  // Current card for scratching
  const currentCard = useMemo(() => {
    return nftCards[currentCardIndex] || null;
  }, [nftCards, currentCardIndex]);

  // Render based on current view
  if (currentView === 'initial') {
    return (
      <NftInitialScreen
        onScratchNow={handleScratchNow}
      />
    );
  }

  if (currentView === 'scratching' && currentCard) {
    return (
      <NftScratchOff
        cardData={currentCard}
        tokenId={parseInt(currentCard.id)}
        onPrizeRevealed={handlePrizeRevealed}
        hasNext={currentCardIndex < nftCards.length - 1}
        onNext={handleNextCard}
      />
    );
  }

  if (currentView === 'cards') {
    return (
      <div className="h-[100dvh] w-full max-w-[400px] mx-auto flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Your Cards</h2>
          <p className="text-white/60">
            {nftCards.length} NFT Card{nftCards.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {nftCards.map((card, index) => (
            <motion.button
              key={card.id}
              onClick={() => {
                setCurrentCardIndex(index);
                setCurrentView('scratching');
              }}
              className="relative bg-white/10 rounded-xl p-4 hover:bg-white/20 transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-full aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg mb-2 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  #{card.id}
                </span>
              </div>

              {card.scratched && (
                <div className="absolute top-2 right-2">
                  {card.prize_amount > 0 ? (
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      Won!
                    </div>
                  ) : (
                    <div className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                      No Win
                    </div>
                  )}
                </div>
              )}

              <div className="text-sm text-white/80">
                Card #{card.id}
              </div>
            </motion.button>
          ))}
        </div>

        <div className="flex gap-4">
          <motion.button
            onClick={handleBackToCards}
            className="px-6 py-3 bg-white/20 text-white font-semibold rounded-full hover:bg-white/30 transition-all duration-200"
          >
            Back
          </motion.button>

          {nftCards.length === 0 && (
            <motion.button
              onClick={() => setCurrentView('initial')}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
            >
              Mint Cards
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  return null;
}