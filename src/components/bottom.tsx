"use client";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { FC, useEffect, useRef, useState } from "react";
import { useUserTokens } from "~/hooks";
import { useDetectClickOutside } from "~/hooks/useDetectClickOutside";
import { useAppStore } from "~/stores/app-store";
import { useCardStore } from "~/stores/card-store";
import ClaimPrizeButton from "./claim-button";
import { MintCardForm } from "./mint-card-form";

const Bottom: FC<{ mode?: "swipeable" | "normal"; loading?: boolean }> = ({
  mode = "normal",
}) => {
  const appColor = useAppStore((s) => s.appColor);
  const currentCardIndex = useCardStore((s) => s.currentCardIndex);
  const showBuyModal = useCardStore((s) => s.showBuyModal);
  const setShowBuyModal = useCardStore((s) => s.setShowBuyModal);
  const {
    scratched,
    setScratched,
    goNext,
    goPrev,
    activeTokenId
  } = useCardStore()


  const [showBigBuy, setShowBigBuy] = useState(false);

  const { availableCards, loading: isFetchingCards } = useUserTokens();
  console.log("🚀 ~ Bottom ~ availableCards:", availableCards)
  const unscratchedCardsCount = availableCards.filter(card => !card.state.scratched).length

  const { push } = useRouter();
  const pathname = usePathname();

  // Ref for buy modal to detect outside clicks
  const buyModalRef = useRef<HTMLDivElement | null>(null);
  useDetectClickOutside(buyModalRef, () => setShowBuyModal(false));

  const canGoPrev = useCardStore((s) => s.canGoPrev());
  const canGoNext = useCardStore((s) => s.canGoNext());

  const handleNextClick = () => {
    goNext();
  }

  const handlePrevClick = () => {
    goPrev();
  }

  const handleNextButtonClickAfterClaim = () => {
    setScratched(false);
    handleNextClick();
  }


  useEffect(() => {
    if (mode === "swipeable") {
      // In swipeable mode, show big buy when no unscratched cards left
      setShowBigBuy(unscratchedCardsCount === 0);
    }
  }, [unscratchedCardsCount, mode]);

  const loading = isFetchingCards
  // const loading = (initialDataLoading || isFetchingCards)
  // console.log("🚀 ~ Bottom ~ initialDataLoading || isFetchingCards:", initialDataLoading, isFetchingCards)

  return (
    <>
      {/* Bottom Section - Controls */}
      <motion.div
        className="flex flex-col items-center justify-center gap-4 px-6 pb-9 w-full flex-shrink-0 z-0"
        initial={{ opacity: 0, y: 0 }}
        animate={{
          opacity: loading ? 0 : 1,
          y: loading ? "100%" : 0,
        }}
        transition={{
          duration: 0.6,
          ease: "easeOut",
          delay: 0.4,
        }}
      >
        {!scratched && <motion.div
          className="flex items-center justify-center gap-3"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: loading ? 0 : 1,
            scale: loading ? 0.8 : 1,
          }}
          transition={{
            duration: 0.4,
            ease: "easeOut",
            delay: 0.6,
          }}
        >
          <motion.div
            className="border border-[#fff]/10 rounded-[8px] p-[10px]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: loading ? 0 : 1,
              scale: loading ? 0.8 : 1,
            }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
              delay: 0.6,
            }}
          >
            <p className="text-[14px] leading-[90%] font-medium text-[#fff]">
              {mode === "swipeable" ? (
                `${unscratchedCardsCount} card${unscratchedCardsCount !== 1 ? "s" : ""
                } left`
              ) : (
                <>
                  Cards{" "}
                  {activeTokenId ? (
                    <>
                      {currentCardIndex + 1}
                      <span className="text-[#fff]/40">
                        /{availableCards.length}
                      </span>
                    </>
                  ) : (
                    availableCards.length
                  )}
                </>
              )}
            </p>
          </motion.div>
          <motion.button
            className="border border-[#fff] rounded-[8px] p-[10px]"
            onClick={
              showBigBuy && pathname === "/"
                ? () => push("/leaderboard")
                : () => setShowBuyModal(true)
            }
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: loading ? 0 : 1,
              scale: loading ? 0.8 : 1,
            }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
              delay: 0.7,
            }}
          >
            <p className="text-[14px] leading-[90%] font-medium text-[#fff]">
              {showBigBuy && pathname === "/" ? "View Leaderboard" : "Buy"}
            </p>
          </motion.button>
        </motion.div>}

        <AnimatePresence>
          {scratched && <motion.div
            className="flex items-center justify-center gap-3 w-full mt-12"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: loading ? 0 : 1,
              scale: loading ? 0.8 : 1,
            }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
              delay: 0.6,
            }}
          >
            <ClaimPrizeButton />
            <motion.div
              className="w-full p-1 rounded-[40px] border border-white"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 700,
                damping: 45,
                duration: 0.15,
              }}
            >
              <motion.button
                onClick={handleNextButtonClickAfterClaim}
                className="w-full py-2 bg-white/80 rounded-[40px] font-semibold text-[14px] hover:bg-white h-11 transition-colors"
                style={{
                  color: appColor,
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
              >
                Go Next
              </motion.button>
            </motion.div>
          </motion.div>}
        </AnimatePresence>

        {/* Next/Prev Card Buttons - Only show on home page in swipeable mode */}
        <AnimatePresence>
          {!scratched && pathname === "/" &&
            !showBigBuy &&
            mode === "swipeable" && availableCards.length > 1 && (
              <motion.div
                className="flex gap-3 w-full"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                transition={{
                  type: "spring",
                  stiffness: 700,
                  damping: 45,
                  duration: 0.15,
                }}
              >
                {/* Previous Button */}
                <motion.div
                  className="flex-1 p-1 rounded-[40px] border border-white"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    type: "spring",
                    stiffness: 700,
                    damping: 45,
                    duration: 0.15,
                  }}
                >
                  <motion.button
                    onClick={handlePrevClick}
                    disabled={!canGoPrev}
                    className={`w-full py-2 rounded-[40px] font-semibold text-[14px] h-11 transition-all ${canGoPrev
                      ? "bg-white/80 hover:bg-white text-[var(--app-color)]"
                      : "bg-white/20 text-white/40 cursor-not-allowed"
                      }`}
                    style={{
                      color: canGoPrev ? appColor : undefined,
                    }}
                    whileTap={canGoPrev ? { scale: 0.98 } : {}}
                    transition={{ duration: 0.1 }}
                  >
                    Prev
                  </motion.button>
                </motion.div>

                {/* Next Button */}
                <motion.div
                  className="flex-1 p-1 rounded-[40px] border border-white"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    type: "spring",
                    stiffness: 700,
                    damping: 45,
                    duration: 0.15,
                    delay: 0.05,
                  }}
                >
                  <motion.button
                    onClick={handleNextClick}
                    disabled={!canGoNext}
                    className={`w-full py-2 rounded-[40px] font-semibold text-[14px] h-11 transition-all ${canGoNext
                      ? "bg-white/80 hover:bg-white text-[var(--app-color)]"
                      : "bg-white/20 text-white/40 cursor-not-allowed"
                      }`}
                    style={{
                      color: canGoNext ? appColor : undefined,
                    }}
                    whileTap={canGoNext ? { scale: 0.98 } : {}}
                    transition={{ duration: 0.1 }}
                  >
                    Next
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence>
          {showBigBuy && !scratched && pathname === "/" && (
            <motion.div
              className="w-full p-1 rounded-[40px] border border-white"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 700,
                damping: 45,
                duration: 0.15,
              }}
            >
              <motion.button
                onClick={() => setShowBuyModal(true)}
                className="w-full py-2 bg-white/80 rounded-[40px] font-semibold text-[14px] hover:bg-white h-11 transition-colors"
                style={{
                  color: appColor,
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
              >
                Buy Cards
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pathname !== "/" && (
            <motion.div
              className="w-full p-1 rounded-[40px] border border-white"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 700,
                damping: 45,
                duration: 0.15,
              }}
            >
              <motion.button
                onClick={() => push("/")}
                className="w-full py-2 bg-white/80 rounded-[40px] font-semibold text-[14px] hover:bg-white h-11 transition-colors"
                style={{
                  color: appColor,
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
              >
                View Cards
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showBuyModal && (
          <motion.div
            ref={buyModalRef}
            className="fixed  bottom-0 left-1/2 !translate-x-[-50%] !translate-y-[-16px] w-[96%] max-w-[400px] z-[54]"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 700,
              damping: 45,
              duration: 0.15,
            }}
          >
            <MintCardForm onSuccess={() => setShowBuyModal(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Bottom;
