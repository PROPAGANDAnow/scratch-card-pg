"use client";
import { motion, AnimatePresence } from "framer-motion";
import { AppContext } from "~/app/context";
import { FC, useContext, useEffect, useRef, useState } from "react";
import { SET_BUY_CARDS } from "~/app/context/actions";
import { usePathname, useRouter } from "next/navigation";
import { MintCardForm } from "./mint-card-form";
import { useDetectClickOutside } from "~/hooks/useDetectClickOutside";

const Bottom: FC<{ mode?: "swipeable" | "normal"; loading?: boolean }> = ({
  mode = "normal",
  loading = false,
}) => {
  const [state, dispatch] = useContext(AppContext);
  const [showBigBuy, setShowBigBuy] = useState(false);
  const [unscratchedCardsCount, setUnscratchedCardsCount] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const { push } = useRouter();
  const pathname = usePathname();

  // Ref for buy modal to detect outside clicks
  const buyModalRef = useRef<HTMLDivElement | null>(null);
  useDetectClickOutside(buyModalRef, () => setShowBuyModal(false));

  // Calculate unscratched cards count
  useEffect(() => {
    if (mode === "swipeable") {
      setUnscratchedCardsCount(state.unscratchedCards.length);
    }
  }, [state.unscratchedCards, mode]);

  // Function to trigger buy modal - can be called from other components
  const triggerBuyModal = () => {
    setShowBuyModal(true);
  };

  // Set the buy function in the app context so other components can access it
  useEffect(() => {
    dispatch({ type: SET_BUY_CARDS, payload: triggerBuyModal });
  }, [dispatch]);

  useEffect(() => {
    if (mode === "swipeable") {
      // In swipeable mode, show big buy when no unscratched cards left
      setShowBigBuy(unscratchedCardsCount === 0);
    }
  }, [unscratchedCardsCount, mode]);

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
        <motion.div
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
                  {state.selectedCard ? (
                    <>
                      {state.selectedCard.card_no}
                      <span className="text-[#fff]/40">
                        /{state.cards.length}
                      </span>
                    </>
                  ) : (
                    state.cards.length
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
        </motion.div>

        {/* Next Card Button - Only show on home page when there's a next card */}
        <AnimatePresence>
          {pathname === "/" &&
            !showBigBuy &&
            mode === "swipeable" &&
            state.currentCardIndex < state.localCards.length - 1 && (
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
                  onClick={() => state.nextCard?.()}
                  className="w-full py-2 bg-white/80 rounded-[40px] font-semibold text-[14px] hover:bg-white h-11 transition-colors"
                  style={{
                    color: state.appColor,
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.1 }}
                >
                  Next Card
                </motion.button>
              </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence>
          {showBigBuy && pathname === "/" && (
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
                  color: state.appColor,
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
                  color: state.appColor,
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
            <MintCardForm />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Bottom;
