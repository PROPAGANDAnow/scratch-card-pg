"use client";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { FC, useEffect, useRef, useState } from "react";
import { useUserTokens } from "~/hooks";
import { useDetectClickOutside } from "~/hooks/useDetectClickOutside";
import { useAppStore } from "~/stores/app-store";
import { getUnscratchedCards, useCardStore } from "~/stores/card-store";
import ClaimPrizeButton from "./claim-button";
import { MintCardForm } from "./mint-card-form";

// Animation variants for consistent transitions
const animations = {
  // Container variants
  container: {
    initial: { opacity: 0, y: "100%" },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: "100%" },
    transition: { duration: 0.6, ease: "easeOut" as const, delay: 0.4 }
  },

  // Element fade-in variants
  fadeIn: (delay: number = 0) => ({
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.4, ease: "easeOut" as const, delay }
  }),

  // Button variants
  button: {
    initial: { opacity: 0, y: 20, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 20, scale: 0.9 },
    transition: {
      type: "spring" as const,
      stiffness: 700,
      damping: 45,
      duration: 0.15
    }
  },

  // Button tap animation
  tap: { scale: 0.98, transition: { duration: 0.1 } }
};

// Reusable MotionButton component
const MotionButton: FC<{
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
  delay?: number;
}> = ({ onClick, children, disabled = false, variant = "primary", className = "", delay = 0 }) => {
  const appColor = useAppStore((s) => s.appColor);

  const baseClasses = variant === "primary"
    ? "bg-white/80 hover:bg-white text-[var(--app-color)]"
    : "bg-white/20 text-white/40 cursor-not-allowed";

  return (
    <motion.div
      className="p-1 rounded-[40px] border border-white w-full"
      {...animations.button}
      transition={{ ...animations.button.transition, delay }}
    >
      <motion.button
        onClick={onClick}
        disabled={disabled}
        className={`w-full py-2 rounded-[40px] font-semibold text-[14px] h-11 transition-all ${baseClasses} ${className}`}
        style={{ color: variant === "primary" ? appColor : undefined }}
        whileTap={!disabled ? animations.tap : {}}
      >
        {children}
      </motion.button>
    </motion.div>
  );
};

const Bottom: FC<{ mode?: "swipeable" | "normal"; loading?: boolean }> = ({
  mode = "normal",
}) => {
  const showBuyModal = useCardStore((s) => s.showBuyModal);
  const setShowBuyModal = useCardStore((s) => s.setShowBuyModal);
  const totalCount = useCardStore((s) => s.totalCount);
  const isMinting = useCardStore((s) => s.isMinting);
  const initialFetch = useCardStore((s) => s.initialFetch);
  const {
    scratched,
    setScratched,
    goNext,
    goPrev,
  } = useCardStore()

  const [showBigBuy, setShowBigBuy] = useState(false);
  const { availableCards, refetch: refetchCards } = useUserTokens();
  const { cards } = useCardStore()
  const unscratchedCards = getUnscratchedCards(cards)
  const unscratchedCardsCount = unscratchedCards.length

  const { push } = useRouter();
  const pathname = usePathname();
  const buyModalRef = useRef<HTMLDivElement | null>(null);
  useDetectClickOutside(buyModalRef, () => {
    if (isMinting) return;
    setShowBuyModal(false)
  });

  const canGoPrev = useCardStore((s) => s.canGoPrev());
  const canGoNext = useCardStore((s) => s.canGoNext());
  const updateCardMeta = useCardStore((s) => s.updateCardMeta);
  const activeTokenId = useCardStore((s) => s.activeTokenId);

  const handleNextClick = () => goNext();
  const handlePrevClick = () => goPrev();
  const handleNextButtonClickAfterClaim = () => {
    setScratched(false);
    updateCardMeta(String(activeTokenId), { scratched: true })

    if (canGoNext) {
      handleNextClick();
    } else {
      if (canGoPrev) {
        handlePrevClick()
      } else {
        refetchCards()
      }
    }

  };

  useEffect(() => {
    if (mode === "swipeable") {
      setShowBigBuy(unscratchedCardsCount === 0);
    }
  }, [unscratchedCardsCount, mode]);

  const loading = initialFetch;

  // Calculate current index based on activeTokenId
  const currentCardIndex = activeTokenId ? availableCards.findIndex(card => card.id === activeTokenId) : -1;

  return (
    <>
      <motion.div
        className="flex flex-col items-center justify-center px-6 pb-9 w-full flex-shrink-0 z-0 relative"
        {...animations.container}
        animate={{
          opacity: loading ? 0 : 1,
          y: loading ? "100%" : 0,
        }}
      >
        <div className="absolute top-0 left-0 w-full"></div>
        {/* Top row with card count and buy button */}
        <div className="relative w-full">
          <AnimatePresence mode="wait" initial={false}>
            {!scratched && (
              <motion.div
                key="top-row"
                className="flex items-center justify-center gap-3 w-full"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {/* Card count display */}
                <motion.div
                  className="flex-1 border border-[#fff]/10 rounded-[8px] p-[10px]"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <p className="text-[14px] leading-[90%] font-medium text-[#fff] text-center">
                    {mode === "swipeable" ? (
                      `${unscratchedCardsCount} card${unscratchedCardsCount !== 1 ? "s" : ""} left`
                    ) : (
                      <>
                        <>
                          {availableCards.length}
                          <span className="text-[#fff]/40">
                            /{totalCount}
                          </span>
                        </>
                      </>
                    )}
                  </p>
                </motion.div>

                {/* Buy/Leaderboard button */}
                <motion.button
                  className="flex-1 border border-[#fff] rounded-[8px] p-[10px]"
                  onClick={
                    showBigBuy && pathname === "/"
                      ? () => push("/leaderboard")
                      : () => setShowBuyModal(true)
                  }
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <p className="text-[14px] leading-[90%] font-medium text-[#fff]">
                    {showBigBuy && pathname === "/" ? "View Leaderboard" : "Buy"}
                  </p>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Middle section - Claim or Navigation buttons */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={scratched ? "claim-container" : "nav-container"}
            className="relative w-full mt-2 overflow-hidden"
            // initial={{ height: scratched ? 72 : 64 }}
            // animate={{ height: scratched ? 72 : 64 }}
            // exit={{ height: scratched ? 64 : 72 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <div className="inset-0">
              <AnimatePresence mode="wait" initial={false}>
                {/* Claim section - shown when card is scratched */}
                {scratched && (
                  <motion.div
                    key="claim-section"
                    className="grid gap-3 grid-cols-2 w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ClaimPrizeButton />
                    {unscratchedCardsCount > 1 && <MotionButton
                      onClick={handleNextButtonClickAfterClaim}
                      delay={0.2}
                    >
                      Go Next
                    </MotionButton>}
                    {unscratchedCardsCount <= 1 &&
                      <MotionButton
                        onClick={() => setShowBuyModal(true)}
                        delay={0.2}
                      >
                        Buy More
                      </MotionButton>}
                  </motion.div>
                )}

                {/* Navigation buttons - Next/Prev for swipeable mode */}
                {!scratched && pathname === "/" && !showBigBuy && mode === "swipeable" && availableCards.length > 1 && (
                  <motion.div
                    key="nav-buttons"
                    className="flex gap-3 w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="flex-1"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <MotionButton
                        onClick={handlePrevClick}
                        disabled={!canGoPrev}
                        variant={canGoPrev ? "primary" : "secondary"}
                      >
                        Prev
                      </MotionButton>
                    </motion.div>
                    <motion.div
                      className="flex-1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                    >
                      <MotionButton
                        onClick={handleNextClick}
                        disabled={!canGoNext}
                        variant={canGoNext ? "primary" : "secondary"}
                      >
                        Next
                      </MotionButton>
                    </motion.div>
                  </motion.div>
                )}

                {/* Big Buy button - shown when no cards left in swipeable mode */}
                {showBigBuy && !scratched && pathname === "/" && (
                  <MotionButton onClick={() => setShowBuyModal(true)}>
                    Buy Cards
                  </MotionButton>
                )}

                {/* View Cards button - shown on non-home pages */}
                {pathname !== "/" && (
                  <MotionButton onClick={() => push("/")}>
                    View Cards
                  </MotionButton>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Buy Modal */}
      <AnimatePresence>
        {showBuyModal && (
          <motion.div
            ref={buyModalRef}
            className="fixed bottom-0 left-1/2 !translate-x-[-50%] !translate-y-[-16px] w-[96%] max-w-[400px] z-[54]"
            {...animations.button}
          >
            <MintCardForm onSuccess={() => setShowBuyModal(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Bottom;
