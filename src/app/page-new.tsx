/**
 * Web3 Home Page with Subgraph Integration
 * 
 * Replaces traditional home page with Web3 functionality
 * Integrates NFT cards and on-chain interactions
 * Includes subgraph data fetching for enhanced functionality
 */

"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "~/stores/app-store";
import { useCardStore } from "~/stores/card-store";
import NftInitialScreen from "~/components/nft-initial-screen";
import NftScratchOff from "~/components/nft-scratch-off";
import { useWallet } from "~/hooks/useWeb3Wallet";
import { useUserCards } from "~/hooks/useContractMinting";
import { useContractStats } from "~/hooks/useContractStats";
import { useUserActivity } from "~/hooks/useUserActivity";
import { Card } from "./interface/card";

export default function NftHome() {
  const setSwipableMode = useAppStore((s) => s.setSwipableMode);
  const localCards = useCardStore((s) => s.localCards);
  const setLocalCards = useCardStore((s) => s.setLocalCards);
  const [currentView, setCurrentView] = useState<'initial' | 'scratching' | 'cards'>('initial');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Web3 hooks
  const { address } = useWallet();
  const { tokenIds } = useUserCards(address);

  // Subgraph hooks for enhanced functionality
  const { isPaused, formattedStats } = useContractStats();
  const { mints, claims, loading: activityLoading } = useUserActivity();

  // Convert token IDs to card format for compatibility
  const nftCards = useMemo(() => {
    if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) return [];

    return tokenIds.map((tokenId: bigint) => ({
      id: tokenId.toString(),
      // user_wallet field removed from Card model
      payment_tx: '', // Will be populated from transaction events
      prize_amount: 0, // Will be determined when scratching
      scratched_at: null,
      prize_asset_contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
      numbers_json: [], // Will be generated when scratching
      claimed: false,
      payout_tx: null,
      created_at: new Date(),
      scratched: false,
      prize_won: false,
      token_id: Number(tokenId),
      contract_address: '0x0000000000000000000000000000000000000000', // Placeholder
      // New required fields from schema
      scratched_by_user_id: null,
      gifter_id: null,
      gifted_to_user_id: null,
      userId: null,
    } as unknown as Card));
  }, [tokenIds, address]);

  // Initialize swipable mode
  useEffect(() => {
    setSwipableMode(true);
    return () => {
      setSwipableMode(false);
      setLocalCards([]);
    };
  }, [setSwipableMode, setLocalCards]);

  // Sync local cards with NFT cards
  useEffect(() => {
    if (nftCards.length > 0 || localCards.length > 0) {
      // Create a set of NFT card IDs for quick lookup
      const nftCardIds = new Set(nftCards.map(card => card.id));

      // Update existing cards
      const updatedCards = localCards.map((card: Card) => {
        if (nftCardIds.has(card.id)) {
          // Card exists in NFTs, sync scratched status
          const nftCard = nftCards.find(nft => nft.id === card.id);
          return nftCard || card;
        }
        return card;
      });

      // Add new NFT cards that don't exist locally
      const existingIds = new Set(localCards.map((card: Card) => card.id));
      const newCards = nftCards.filter(card => !existingIds.has(card.id));

      const newLocalCards = [...updatedCards, ...newCards];

      // Only update if there are actual changes
      const hasChanges = JSON.stringify(newLocalCards) !== JSON.stringify(localCards);
      if (hasChanges) {
        setLocalCards(newLocalCards);
      }
    }
  }, [nftCards, localCards, setLocalCards]);

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
    const updatedCards = localCards.map((card: Card) =>
      card.id === nftCards[currentCardIndex]?.id
        ? { ...card, scratched: true, prize_amount: prizeAmount }
        : card
    );
    setLocalCards(updatedCards);
  }, [localCards, nftCards, currentCardIndex, setLocalCards]);

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

        {/* Subgraph Data Section */}
        {formattedStats && (
          <div className="w-full mb-8 bg-white/10 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Contract Stats</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-xs">Total Minted</p>
                <p className="text-white font-semibold">{formattedStats.totalMinted.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-xs">Prizes Claimed</p>
                <p className="text-white font-semibold">{formattedStats.totalClaimed.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-xs">Card Price</p>
                <p className="text-white font-semibold">{formattedStats.currentPrice} ETH</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-xs">Status</p>
                <p className={`font-semibold ${isPaused ? 'text-red-400' : 'text-green-400'}`}>
                  {isPaused ? 'Paused' : 'Active'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* User Activity from Subgraph */}
        {!activityLoading && (mints.length > 0 || claims.length > 0) && (
          <div className="w-full mb-8 bg-white/10 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Your Activity</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {mints.slice(0, 3).map((mint) => (
                <div key={mint.id} className="bg-white/5 rounded-lg p-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Minted {mint.quantity} cards</span>
                    <span className="text-white/60">
                      {new Date(Number(mint.timestamp) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              {claims.slice(0, 3).map((claim) => (
                <div key={claim.id} className="bg-green-500/20 rounded-lg p-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Won prize on token #{claim.tokenId}</span>
                    <span className="text-white/60">
                      {new Date(Number(claim.claimedAt) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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