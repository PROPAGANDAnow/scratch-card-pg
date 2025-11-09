"use client";
import { useEffect, useState } from "react";
import CardGrid from "~/components/card-grid";
import { useRouter } from "next/navigation";
import { motion, useAnimation } from "framer-motion";
import { CircularProgress } from "~/components/circular-progress";
import { useUserStats, useUserActivity } from "~/hooks";
import { useUserStore } from "~/stores";
import { useInfiniteCards } from "~/hooks/useInfiniteCards";
import clsx from "clsx";

// Level calculation function
function getLevelRequirement(level: number): number {
  return Math.floor(10 * level + 5 * (level / 2));
}

const ProfilePage = () => {
  const user = useUserStore((s) => s.user);
  const { push } = useRouter();
  const [displayAmount, setDisplayAmount] = useState(0);
  const controls = useAnimation();
  const userStats = useUserStats();
  const { } = useUserActivity();
  const [showAllCards, setShowAllCards] = useState(false);

  // Infinite scroll for user cards
  const {
    cards: userCards,
    loading: cardsLoading,
    error: cardsError,
    hasMore,
    totalCount,
    loadMoreRef,
  } = useInfiniteCards({
    userWallet: user?.address || "",
    stateFilter: "all",
    initialLimit: 40,
  });

  // Animate the total winnings number
  useEffect(() => {
    const targetAmount = 0; // TODO: Add amount_won to User schema when needed
    const duration = 2000; // 2 seconds
    const steps = 60; // 60 steps for smooth animation
    const increment = (targetAmount - 0.01) / steps;
    let current = 0.01; // Start from 1 cent

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetAmount) {
        setDisplayAmount(targetAmount);
        clearInterval(timer);
      } else {
        setDisplayAmount(Math.max(0.01, current)); // Ensure it never goes below 1 cent
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, []); // TODO: Add amount_won to User schema when needed

  // Trigger entrance animations
  useEffect(() => {
    controls.start("visible");
  }, [controls]);

  return (
    <>
      <motion.div
        className="h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {!showAllCards && (
          <>
            {/* Total Winnings Section */}
            <motion.div
              className="flex flex-col items-center justify-center gap-5 mb-8 px-4"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.p
                className="text-white/60 text-[16px] font-medium leading-[90%]"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                Total Winnings
              </motion.p>

              <motion.div
                initial={{ scale: 0.5, rotateY: -90 }}
                animate={{ scale: 1, rotateY: 0 }}
                transition={{
                  delay: 0.5,
                  duration: 1.2,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                }}
              >
                <motion.p
                  className="text-[64px] font-medium leading-[90%] text-white font-[ABCGaisyr]"
                  style={{
                    textShadow: "0px 0px 20px rgba(255, 255, 255, 0.3)",
                  }}
                  animate={{
                    textShadow: [
                      "0px 0px 20px rgba(255, 255, 255, 0.3)",
                      "0px 0px 30px rgba(255, 255, 255, 0.5)",
                      "0px 0px 20px rgba(255, 255, 255, 0.3)",
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  {(displayAmount || 0).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </motion.p>
              </motion.div>
            </motion.div>

            <motion.div className="mb-10 flex items-center justify-center gap-2 px-4">
              <motion.p className="text-white text-[16px] font-medium leading-[90%]">
                Level 1 {/* TODO: Add current_level to User schema when needed */}
              </motion.p>
              <motion.div
                className="bg-white/20 rounded-full"
                style={{ width: "3px", height: "3px" }}
              />

              {/* Circular Progress */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
              >
                <CircularProgress
                  revealsToNextLevel={25}
                  totalRevealsForLevel={getLevelRequirement(2)}
                />
              </motion.div>

              <motion.p className="text-white text-[14px] font-medium leading-[90%] text-center">
                25 wins away from level 2
              </motion.p>
            </motion.div>

            {/* Scratch Offs Count Section */}
            <motion.div
              className="flex items-center w-full mb-6 px-4"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              <motion.p
                className="text-white/60 text-[12px] font-medium leading-[90%]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4, duration: 0.8 }}
              >
                {userStats.totalMinted || 0} SCRATCH OFFS
              </motion.p>

              {/* Animated underline */}
              <motion.div
                className="ml-2 h-[1px] bg-white/20"
                initial={{ width: 0 }}
                animate={{ width: "100px" }}
                transition={{ delay: 1.6, duration: 0.8, ease: "easeOut" }}
              />
            </motion.div>
          </>
        )}

        {/* Cards Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className={clsx("flex-1 px-4", showAllCards && "border-b border-white/20 overflow-scroll h-full")}
        >
          {/* Cards Header (hidden in full view) */}
          <div
            className={`flex justify-between items-center mb-4 ${showAllCards ? "hidden" : ""
              }`}
          >
            <h3 className="text-white text-lg font-semibold">My Cards</h3>
            <span className="text-white/60 text-sm">
              {totalCount} card{totalCount !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Error State */}
          {cardsError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4"
            >
              <p className="text-red-300 text-sm">
                Error loading cards: {cardsError.message}
              </p>
            </motion.div>
          )}

          {/* Cards Grid */}
          {userCards.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.8 }}
            >
              <CardGrid
                cards={userCards}
                showViewAll={!showAllCards}
                onViewAll={() => setShowAllCards(true)}
              />
            </motion.div>
          ) : !cardsLoading && !cardsError ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎴</span>
              </div>
              <h4 className="text-white font-medium mb-2">No cards yet</h4>
              <p className="text-white/60 text-sm mb-4">
                You haven&apos;t purchased any scratch cards yet.
              </p>
              <button
                onClick={() => push("/")}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Buy Cards
              </button>
            </motion.div>
          ) : null}

          {/* Loading State */}
          {cardsLoading && (
            <div className="grid grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white/10 rounded-lg animate-pulse"
                  style={{ height: "102px" }}
                />
              ))}
            </div>
          )}

          {/* Load More Trigger */}
          {showAllCards && <div ref={loadMoreRef} className="h-4" />}

          {/* Loading More Indicator */}
          {showAllCards && cardsLoading && userCards.length > 0 && (
            <div className="text-center py-4">
              <div className="inline-flex items-center space-x-2 text-white/60">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                <span className="text-sm">Loading more cards...</span>
              </div>
            </div>
          )}

          {/* End of Cards Indicator */}
          {showAllCards && !hasMore && userCards.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
              <p className="text-white/40 text-sm">You&apos;ve reached the end of your cards</p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
};

export default ProfilePage;
