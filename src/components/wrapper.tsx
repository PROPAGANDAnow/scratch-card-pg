"use client";
import sdk from "@farcaster/miniapp-sdk";
import { useMiniApp } from "@neynar/react";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createRef, FC, useCallback, useEffect, useRef, useState } from "react";
import { User } from "~/app/interface/user";
import { AppStats } from "~/app/interface/appStats";
import { Reveal } from "~/app/interface/reveal";

import {
  fetchActivity,
  fetchAppStats,
  fetchBestFriends,
  fetchLeaderboard,
  fetchUserInfo,
} from "~/lib/userapis";
import { useUserStore } from "~/stores/user-store";
import { useCardStore } from "~/stores/card-store";
import { useAppStore } from "~/stores/app-store";
import Bottom from "./bottom";
import { getFromLocalStorage } from "~/lib/utils";
import InitialScreen from "./initial-screen";
import { INITIAL_SCREEN_KEY } from "~/lib/constants";
import WinRatePopup from "./win-rate-popup";
import { useDetectClickOutside } from "~/hooks/useDetectClickOutside";

const Wrapper: FC<{ children: React.ReactNode }> = ({ children }) => {
  const publicKey = useUserStore((s) => s.publicKey);
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  const appBackground = useAppStore((s) => s.appBackground);
  const appStats = useAppStore((s) => s.appStats);
  const leaderboard = useAppStore((s) => s.leaderboard);
  const activity = useAppStore((s) => s.activity);
  const swipableMode = useAppStore((s) => s.swipableMode);
  const setAppStats = useAppStore((s) => s.setAppStats);
  const setLeaderboard = useAppStore((s) => s.setLeaderboard);
  const setActivity = useAppStore((s) => s.setActivity);

  const selectedCard = useCardStore((s) => s.selectedCard);
  const cards = useCardStore((s) => s.cards);
  const unscratchedCards = useCardStore((s) => s.unscratchedCards);
  const setSelectedCard = useCardStore((s) => s.setSelectedCard);
  const setUnscratchedCards = useCardStore((s) => s.setUnscratchedCards);
  const refetchCards = useCardStore((s) => s.refetchCards);

  const [loading, setLoading] = useState(true);
  const [seenInitial, setSeenInitial] = useState(false);
  const [showWinRates, setShowWinRates] = useState(false);
  const readyCalled = useRef(false);
  const currentCardsRef = useRef(cards);
  const currentLeaderboardRef = useRef(leaderboard);
  const currentActivityRef = useRef(activity);
  const currentUnscratchedCardsRef = useRef(unscratchedCards);
  const prizePoolRef = createRef<HTMLDivElement>();
  const { push } = useRouter();
  const { context } = useMiniApp();
  const userFid = context?.user.fid;

  useDetectClickOutside(prizePoolRef, () => setShowWinRates(false));

  // Initialize/record initial-screen flag once on mount
  useEffect(() => {
    const seenInitial = getFromLocalStorage(INITIAL_SCREEN_KEY, false);
    setSeenInitial(seenInitial);
  }, []);

  // Keep ref updated with current cards
  useEffect(() => {
    currentCardsRef.current = cards;
    setUnscratchedCards(cards);
  }, [cards, setUnscratchedCards]);

  // Keep ref updated with current leaderboard
  useEffect(() => {
    currentLeaderboardRef.current = leaderboard;
  }, [leaderboard]);

  // Keep ref updated with current activity
  useEffect(() => {
    currentActivityRef.current = activity;
  }, [activity]);

  // Keep ref updated with current unscratched cards
  useEffect(() => {
    currentUnscratchedCardsRef.current = unscratchedCards;
  }, [unscratchedCards]);

  const callReady = useCallback(async () => {
    if (publicKey) {
      try {
        await sdk.actions.ready();
        readyCalled.current = true;
      } catch (error) {
        console.error("Failed to signal app ready:", error);
      }
    }
  }, [publicKey]);

  // Fetch all data when wallet connects using Promise.allSettled
  const fetchAllData = useCallback(async (userWallet: string, userFid: number) => {
    if (!userWallet) return;
    if (!userFid) return;

    setLoading(true);
    // Set loading state for cards
    useCardStore.getState().setLoading(true);

    try {
      const promises = [
        fetchUserInfo(userWallet),
        fetchAppStats(),
        fetchLeaderboard(),
        fetchActivity(),
      ];

      const [userInfo, appStats, leaderboard, activity] =
        await Promise.allSettled(promises);

      // Fetch cards separately to use store's refetchCards function
      await refetchCards(userWallet);

      if (userInfo.status === "fulfilled" && userInfo.value && 'id' in userInfo.value) {
        setUser(userInfo.value as User); // Type enforced with Zod schema
        const bestFriends = await fetchBestFriends(userFid);
        // store bestFriends into user store
        useUserStore.getState().setBestFriends(bestFriends);
      }
      if (appStats.status === "fulfilled" && appStats.value && 'id' in appStats.value) setAppStats(appStats.value as AppStats);
      if (leaderboard.status === "fulfilled" && leaderboard.value && Array.isArray(leaderboard.value)) setLeaderboard(leaderboard.value);
      if (activity.status === "fulfilled" && activity.value && Array.isArray(activity.value)) setActivity(activity.value as Reveal[]);
      callReady();
    } catch (error) {
      console.error("Error in fetching user info", error);
    } finally {
      setLoading(false);
      // Set loading state for cards to false
      useCardStore.getState().setLoading(false);
    }
  }, [refetchCards, setUser, setAppStats, setLeaderboard, setActivity, callReady]);

  // Fetch all data when wallet connects
  useEffect(() => {
    if (publicKey && userFid) {
      fetchAllData(publicKey, userFid);
    }
  }, [publicKey, userFid, fetchAllData]);

  // Fetch all data when wallet connects
  // useEffect(() => {
  //   if (state.publicKey && userFid) {
  //     fetchAllData(state.publicKey, userFid);
  //   }
  // }, [state.publicKey, userFid]);

  // Real-time subscriptions removed - migrated to Prisma
  // TODO: Implement real-time updates with database triggers/webhooks if needed

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  useEffect(() => {
    if (publicKey && user) {
      const testAddMiniApp = async () => {
        try {
          const result = await sdk.actions.addMiniApp();
          if (
            result.notificationDetails &&
            result.notificationDetails.token &&
            true // TODO: Add notification_enabled to User schema when needed
          ) {
            try {
              await fetch(`/api/neynar/welcome-notification`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fid: user?.fid,
                  notification_token: result.notificationDetails.token,
                }),
              });
            } catch (err) {
              console.log("sending notification error", err);
            }
          }
        } catch (error) {
          console.log("❌ addMiniApp failed at startup:", error);
        }
      };

      testAddMiniApp();
    }
  }, [publicKey, user]);

  if (!seenInitial) {
    return <InitialScreen onScratchNow={() => setSeenInitial(true)} />;
  }

  return (
    <div
      className="h-[100dvh] transition-all ease-in-out duration-300"
      style={{ background: appBackground }}
    >
      <div className="h-full max-w-[400px] flex flex-col mx-auto items-center justify-between">
        {/* Top Section - Header */}
        <motion.div
          className="flex items-center justify-between w-full px-4 pt-4 pb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: loading ? 0 : 1,
            y: loading ? -20 : 0,
          }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
            delay: 0.2,
          }}
        >
          {!selectedCard ? (
            <motion.button
              className="p-2 rounded-full bg-white/10 cursor-pointer hover:bg-white/20 transition-colors"
              onClick={() => push("/profile")}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: loading ? 0 : 1,
                scale: loading ? 0.8 : 1,
              }}
              transition={{
                duration: 0.4,
                ease: "easeOut",
                delay: 0.3,
              }}
            >
              <Image
                src={"/assets/profile-icon.svg"}
                alt="profile-icon"
                unoptimized
                priority
                width={24}
                height={24}
              />
            </motion.button>
          ) : (
            <motion.button
              className="p-2 relative z-[52] rounded-full bg-white/10 cursor-pointer hover:bg-white/20 transition-colors"
              onClick={handleCloseModal}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: loading ? 0 : 1,
                scale: loading ? 0.8 : 1,
              }}
              transition={{
                duration: 0.4,
                ease: "easeOut",
                delay: 0.3,
              }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="#fff"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </motion.button>
          )}
          <div className="relative" ref={prizePoolRef}>
            <motion.button
              className="px-6 border border-white/10 rounded-[48px] h-[42px] flex items-center justify-center gap-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: loading ? 0 : 1,
                scale: loading ? 0.8 : 1,
              }}
              transition={{
                duration: 0.4,
                ease: "easeOut",
                delay: 0.4,
              }}
              onClick={() => setShowWinRates(!showWinRates)}
            >
              <span className="text-[16px] leading-[90%] font-medium text-white/40">
                Prize Pool
              </span>
              <span className="text-[16px] leading-[90%] font-medium text-white">
                ${appStats?.winnings || 0}
              </span>
            </motion.button>
            <AnimatePresence>
              {showWinRates && <WinRatePopup />}
            </AnimatePresence>
          </div>
          <motion.button
            className="p-2 rounded-full bg-white/10 cursor-pointer hover:bg-white/20 transition-colors"
            onClick={() => push("/leaderboard")}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: loading ? 0 : 1,
              scale: loading ? 0.8 : 1,
            }}
            transition={{
              duration: 0.4,
              ease: "easeOut",
              delay: 0.5,
            }}
          >
            <Image
              src={"/assets/leaderboard-icon.svg"}
              alt="leaderboard-icon"
              unoptimized
              priority
              width={24}
              height={24}
            />
          </motion.button>
        </motion.div>
        {/* Middle Section - (Scrollable) */}
        <div className="flex flex-col w-full" style={{ height: "68%" }}>
          <div className="flex-1 h-full">{children}</div>
        </div>
        {/* Bottom Section - Bottom */}
        <Bottom
          mode={swipableMode ? "swipeable" : "normal"}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default Wrapper;
