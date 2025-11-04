"use client";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "~/app/interface/card";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "~/lib/constants";
import { SCRATCH_CARD_NFT_ADDRESS } from "~/lib/blockchain";
import { useCardStore } from "~/stores/card-store";
import { useUIStore } from "~/stores/ui-store";
import NftScratchOff from "./nft-scratch-off";
import { useUserNfts } from "~/hooks/useUserNfts";
import { useQueryClient } from '@tanstack/react-query';

interface SwipeableCardStackProps {
  userWallet: string;
  tokenIds: number[];
  initialIndex?: number;
}

export default function SwipeableCardStack({
  userWallet,
  tokenIds,
  initialIndex = 0,
}: SwipeableCardStackProps) {
  const setNextCardFn = useUIStore((s) => s.setNextCard);
  const setCurrentCardIndex = useCardStore((s) => s.setCurrentCardIndex);
  const [currentCardNo, setCurrentCardNo] = useState<number | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Fetch user's NFTs using TanStack Query
  const { data: nftData, isLoading: nftLoading, error: nftError, refetch } = useUserNfts({
    userWallet,
    contractAddress: SCRATCH_CARD_NFT_ADDRESS,
    enabled: !!userWallet,
  });

  // Import query client for invalidation
  const queryClient = useQueryClient();

  // Convert NFT data to Card format and filter by tokenIds if provided
  const cards = useMemo(() => {
    if (!nftData?.ownedNfts) return [];

    let ownedCards: Card[] = nftData.ownedNfts.map((nft) => ({
      id: nft.tokenId,
      token_id: parseInt(nft.tokenId),
      payment_tx: '',
      prize_amount: nft.prizeAmount || 0,
      scratched_at: nft.scratchedAt ? new Date(nft.scratchedAt) : null,
      prize_asset_contract: '',
      numbers_json: [],
      claimed: nft.claimed,
      payout_tx: null,
      created_at: nft.createdAt ? new Date(nft.createdAt) : new Date(),
      scratched: nft.scratched,
      prize_won: nft.prizeWon,
      contract_address: nft.contract.address,
      // New required fields from schema
      scratched_by_user_id: null,
      gifter_id: null,
      gifted_to_user_id: null,
      minter_user_id: '',
    }));

    // Filter by specific tokenIds if provided
    if (tokenIds && tokenIds.length > 0) {
      ownedCards = ownedCards.filter(card => tokenIds.includes(card.token_id));
    }

    // Sort by token_id to maintain order
    ownedCards.sort((a, b) => a.token_id - b.token_id);

    return ownedCards;
  }, [nftData, tokenIds, userWallet]);

  const loading = nftLoading;

  // Initialize current card number
  useEffect(() => {
    if (cards.length > 0 && !currentCardNo) {
      const initialCard = cards[initialIndex] || cards[0];
      setCurrentCardNo(initialCard.token_id);
    }
  }, [cards, initialIndex, currentCardNo]);

  // Find current card and index
  const current = cards.find((card) => card.token_id === currentCardNo);
  const currentIndex = current
    ? cards.findIndex((card) => card.token_id === currentCardNo)
    : -1;

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < cards.length - 1;

  // Set up next card function and update current card index
  useEffect(() => {
    const nextCardFunction = () => {
      if (canGoNext) {
        setDirection(1);
        const nextCard = cards[currentIndex + 1];
        if (nextCard) setCurrentCardNo(nextCard.token_id);
      }
    };

    setNextCardFn(nextCardFunction);
    setCurrentCardIndex(currentIndex);
  }, [canGoNext, currentIndex, cards, setNextCardFn, setCurrentCardIndex]);

  // Mouse handlers for card tilt - memoized for performance
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const percentX = (x / rect.width) * 2 - 1; // -1 to 1
    const percentY = (y / rect.height) * 2 - 1; // -1 to 1
    setTilt({
      x: percentY * 20, // max 20deg up/down
      y: percentX * 20, // max 20deg left/right
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  // Memoized click handlers for better performance
  const handlePrevClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (canGoPrev) {
      setDirection(-1);
      const prevCard = cards[currentIndex - 1];
      if (prevCard) setCurrentCardNo(prevCard.token_id);
    }
  }, [canGoPrev, currentIndex, cards]);

  const handleNextClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (canGoNext) {
      setDirection(1);
      const nextCard = cards[currentIndex + 1];
      if (nextCard) setCurrentCardNo(nextCard.token_id);
    }
  }, [canGoNext, currentIndex, cards]);

  const handleNextFromScratch = useCallback(() => {
    if (canGoNext) {
      setDirection(1);
      const nextCard = cards[currentIndex + 1];
      if (nextCard) setCurrentCardNo(nextCard.token_id);
    }
  }, [canGoNext, currentIndex, cards]);

  // Handle prize revealed
  const handlePrizeRevealed = useCallback((_tokenId: number, prizeAmount: number) => {
    console.log('Prize revealed:', prizeAmount);
    // Invalidate the query to refresh data from the API
    queryClient.invalidateQueries({
      queryKey: ['userNfts', userWallet, SCRATCH_CARD_NFT_ADDRESS]
    });
  }, [queryClient, userWallet]);

  // Ensure currentIndex is within bounds
  const safeIndex = Math.max(0, Math.min(currentIndex, cards.length - 1));
  const prev = canGoPrev ? cards[safeIndex - 1] : null;
  const next = canGoNext ? cards[safeIndex + 1] : null;

  return (
    <div className="h-full relative">
      <div className="h-full flex flex-col items-center justify-between">
        {/* Behind previews: low opacity, non-interactive */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {prev ? (
            <motion.div
              key={`prev-${prev.id}`}
              className="absolute"
              initial={{ opacity: 0, scale: 0.7, x: -72, y: 0 }}
              animate={{ opacity: 0.18, scale: 0.7, x: -72, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, x: -72, y: 0 }}
              transition={{ duration: 0.1 }}
              style={{
                zIndex: 1,
                willChange: 'transform, opacity',
                transform: 'translateZ(0)' // Force GPU acceleration
              }}
            >
              <NftScratchOff
                cardData={prev}
                isDetailView
                tokenId={parseInt(prev.id)}
                onPrizeRevealed={handlePrizeRevealed}
                hasNext={canGoNext}
              // onNext={handleNextCard}
              />
            </motion.div>
          ) : null}
          {next ? (
            <motion.div
              key={`next-${next.id}`}
              className="absolute"
              initial={{ opacity: 0, scale: 0.7, x: 72, y: 0 }}
              animate={{ opacity: 0.18, scale: 0.7, x: 72, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, x: 72, y: 0 }}
              transition={{ duration: 0.1 }}
              style={{
                zIndex: 1,
                willChange: 'transform, opacity',
                transform: 'translateZ(0)' // Force GPU acceleration
              }}
            >
              <NftScratchOff
                cardData={next}
                isDetailView
                tokenId={parseInt(next.id)}
                onPrizeRevealed={handlePrizeRevealed}
              // hasNext={canGoNext}
              // onNext={handleNextCard}
              />
            </motion.div>
          ) : null}
        </div>

        {/* Active card */}
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentCardNo}
            className="relative z-10 w-full"
            initial={{
              opacity: 0,
              x: direction * 100, // Enter from the opposite direction of swipe
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              x: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              x: -direction * 100, // Exit in the direction of swipe
              scale: 0.98,
            }}
            transition={{ type: "spring", stiffness: 700, damping: 50 }}
            style={{
              willChange: 'transform, opacity',
              transform: 'translateZ(0)' // Force GPU acceleration
            }}
          >
            {/* Click areas - 15% on each side */}
            <div
              className="absolute left-0 top-0 w-[20%] h-full z-20 cursor-pointer hover:bg-black/5 transition-colors"
              onClick={handlePrevClick}
            />

            <div
              className="absolute right-0 top-0 w-[20%] h-full z-20 cursor-pointer hover:bg-black/5 transition-colors"
              onClick={handleNextClick}
            />

            {/* Center 60% for scratching */}
            <div className="w-full h-[auto]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-white">Loading cards...</div>
                </div>
              ) : nftError ? (
                <div className="flex flex-col items-center justify-center h-full text-white p-4">
                  <div className="text-red-400 mb-2">Error loading NFTs</div>
                  <div className="text-sm opacity-70 text-center">
                    {nftError instanceof Error ? nftError.message : 'Failed to load cards'}
                  </div>
                  <button
                    onClick={() => refetch()}
                    className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : cards.length ? (
                <NftScratchOff
                  cardData={current || null}
                  isDetailView
                  hasNext={canGoNext}
                  onNext={handleNextFromScratch}
                />
              ) : (
                <AnimatePresence>
                  <motion.div
                    key="empty-state"
                    ref={cardRef}
                    className="relative flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      rotateX: tilt.x,
                      rotateY: tilt.y,
                    }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      duration: 0.6,
                    }}
                    style={{
                      perspective: 1000,
                      marginTop: 48,
                      willChange: 'transform, opacity',
                      transform: 'translateZ(0)' // Force GPU acceleration
                    }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* Shadow element below the card */}
                    <motion.div
                      style={{
                        position: "absolute",
                        top: 30,
                        left: 0,
                        width: CANVAS_WIDTH,
                        height: CANVAS_HEIGHT,
                        background: "rgba(0, 0, 0, 0.4)",
                        filter: "blur(28px)",
                        borderRadius: 4,
                        zIndex: 0,
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0, duration: 0.2 }}
                    />
                    <motion.div
                      style={{
                        position: "relative",
                        zIndex: 1,
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0, duration: 0.2 }}
                    >
                      <Image
                        src="/assets/scratched-card-image.png"
                        alt="Revealed"
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        style={{
                          width: CANVAS_WIDTH,
                          height: CANVAS_HEIGHT,
                          objectFit: "cover",
                          borderRadius: 4,
                          display: "block",
                          userSelect: "none",
                          pointerEvents: "none",
                          opacity: 0.5,
                        }}
                      />
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
