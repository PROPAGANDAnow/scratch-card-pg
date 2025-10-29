"use client";
import { AppContext } from "../context";
import { useContext, useEffect, useState } from "react";
import CardGrid from "~/components/card-grid";
import UserCards from "~/components/user-cards";
import UserWinnings from "~/components/user-winnings";
import { useRouter } from "next/navigation";
import { motion, useAnimation } from "framer-motion";
import { CircularProgress } from "~/components/circular-progress";
import { useUserStats, useUserActivity } from "~/hooks";

// Level calculation function
function getLevelRequirement(level: number): number {
  return Math.floor(10 * level + 5 * (level / 2));
}

const ProfilePage = () => {
  const [state] = useContext(AppContext);
  const { push } = useRouter();
  const [displayAmount, setDisplayAmount] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'cards' | 'winnings'>('overview');
  const controls = useAnimation();
  const userStats = useUserStats();
  const { } = useUserActivity();

  const handleViewAll = () => {
    push("/cards");
  };

  // Animate the total winnings number
  useEffect(() => {
    const targetAmount = state.user?.amount_won || 0;
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
  }, [state.user?.amount_won]);

  // Trigger entrance animations
  useEffect(() => {
    controls.start("visible");
  }, [controls]);

  return (
    <>
      <motion.div
        className="p-4 h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Total Winnings Section */}
        <motion.div
          className="flex flex-col items-center justify-center gap-5 mb-8"
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

        <motion.div className="mb-16 flex items-center justify-center gap-2">
          <motion.p className="text-white text-[16px] font-medium leading-[90%]">
            Level {state.user?.current_level || 1}
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
              revealsToNextLevel={state.user?.reveals_to_next_level || 25}
              totalRevealsForLevel={getLevelRequirement(
                (state.user?.current_level || 1) + 1
              )}
            />
          </motion.div>

          <motion.p className="text-white text-[14px] font-medium leading-[90%] text-center">
            {state.user?.reveals_to_next_level || 25} win
            {state.user?.reveals_to_next_level !== 1 ? "s" : ""} away from level{" "}
            {(state.user?.current_level || 1) + 1}
          </motion.p>
        </motion.div>

        {/* Scratch Offs Count Section */}
        <motion.div
          className="flex items-center w-full mb-6"
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
            {userStats.totalMinted || state.user?.total_reveals || 0} SCRATCH OFFS
          </motion.p>

          {/* Animated underline */}
          <motion.div
            className="ml-2 h-[1px] bg-white/20"
            initial={{ width: 0 }}
            animate={{ width: "100px" }}
            transition={{ delay: 1.6, duration: 0.8, ease: "easeOut" }}
          />
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-xl p-1 mb-6"
        >
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'cards', label: 'My Cards' },
            { id: 'winnings', label: 'Winnings' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-white/60 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1"
        >
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 0.8 }}
            >
              <CardGrid
                cards={state.cards || []}
                showViewAll={true}
                onCardSelect={() => {}}
                onViewAll={handleViewAll}
              />
            </motion.div>
          )}

          {activeTab === 'cards' && (
            <UserCards />
          )}

          {activeTab === 'winnings' && (
            <UserWinnings />
          )}
        </motion.div>
      </motion.div>
    </>
  );
};

export default ProfilePage;
