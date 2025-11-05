"use client";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "~/app/interface/card";
import { TokenWithState, useUserTokens } from "~/hooks";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "~/lib/constants";
import { extractUnclaimedTokenIds } from "~/lib/token-utils";
import { useCardStore } from "~/stores/card-store";
import { useUIStore } from "~/stores/ui-store";
import NftScratchOff from "./nft-scratch-off";

interface SwipeableCardStackProps {
  userWallet?: string;
  initialIndex?: number;
}

export const tokenToCard = (nftToken: TokenWithState): Card => {
  return {
    ...nftToken.state,
    token_id: parseInt(nftToken.metadata?.metadata?.tokenId || nftToken.id),
    contract_address: nftToken.metadata.contract,
  }
}

export default function SwipeableCardStack({
  initialIndex = 0,
}: SwipeableCardStackProps) {
  const currentCardNo = useCardStore((s) => s.currentCardIndex);
  const setCurrentCardNo = useCardStore((s) => s.setCurrentCardIndex);

  const [direction, setDirection] = useState<1 | -1>(1);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const { availableCards } = useUserTokens();
  const tokenIds = useMemo(() => extractUnclaimedTokenIds(availableCards), [availableCards]);

  // Filter availableCards by specific tokenIds if provided
  const filteredCards = useMemo(() => {
    if (!availableCards?.length) return [];

    let cards = [...availableCards];

    // Filter by specific tokenIds if provided
    if (tokenIds && tokenIds.length > 0) {
      cards = cards.filter(card => tokenIds.includes(parseInt(card.metadata?.metadata?.tokenId || card.id)));
    }

    // Sort by tokenId to maintain order
    cards.sort((a, b) => {
      const aTokenId = parseInt(a.metadata?.metadata?.tokenId || a.id);
      const bTokenId = parseInt(b.metadata?.metadata?.tokenId || b.id);
      return aTokenId - bTokenId;
    });

    return cards;
  }, [availableCards, tokenIds]);


  // Initialize current card number
  useEffect(() => {
    if (filteredCards.length > 0) {
      // Ensure currentCardNo is within bounds
      if (currentCardNo >= filteredCards.length || currentCardNo < 0) {
        setCurrentCardNo(initialIndex);
      }
    }
  }, [filteredCards, currentCardNo, initialIndex]);

  // Find current card and index
  // currentCardNo is now the array index, not the token ID
  const currentIndex = Math.min(currentCardNo, filteredCards.length - 1);
  const current = filteredCards[currentIndex];

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < filteredCards.length - 1;

  // Set up next card function and update current card index
  // useEffect(() => {
  //   console.log("🚀 ~ SwipeableCardStack ~ canGoNext, filteredCards, setNextCardFn:", canGoNext, filteredCards, setNextCardFn)
  //   const nextCardFunction = () => {
  //     if (canGoNext) {
  //       setDirection(1);
  //       const nextCard = filteredCards[currentIndex + 1];
  //       if (nextCard) setCurrentCardNo(parseInt(nextCard.metadata?.metadata?.tokenId || nextCard.id));
  //     }
  //   };

  //   setNextCardFn(nextCardFunction);
  //   setCurrentCardIndex(currentIndex);
  // }, [canGoNext, filteredCards, setNextCardFn]);

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
      // Set to the previous array index, not token ID
      setCurrentCardNo(currentIndex - 1);
    }
  }, [canGoPrev, currentIndex]);

  const handleNextClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (canGoNext) {
      setDirection(1);
      // Set to the next array index, not token ID
      setCurrentCardNo(currentIndex + 1);
    }
  }, [canGoNext, currentIndex]);

  const handleNextFromScratch = useCallback(() => {
    if (canGoNext) {
      setDirection(1);
      // Set to the next array index, not token ID
      setCurrentCardNo(currentIndex + 1);
    }
  }, [canGoNext, currentIndex]);

  // Handle prize revealed
  const handlePrizeRevealed = useCallback((_tokenId: number, prizeAmount: number) => {
    console.log('Prize revealed:', prizeAmount);
    // Query invalidation is now handled by the useUserTokens hook
  }, []);

  // Ensure currentIndex is within bounds
  const safeIndex = Math.max(0, Math.min(currentIndex, filteredCards.length - 1));
  const prev = canGoPrev ? filteredCards[safeIndex - 1] : null;
  const next = canGoNext ? filteredCards[safeIndex + 1] : null;

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
                cardData={tokenToCard(prev)}
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
                cardData={tokenToCard(next)}
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
              {filteredCards.length ? (
                <NftScratchOff
                  cardData={current ? tokenToCard(current) : null}
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
