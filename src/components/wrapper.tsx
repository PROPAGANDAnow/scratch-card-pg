"use client";
import sdk from "@farcaster/miniapp-sdk";
import { useMiniApp } from "@neynar/react";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createRef, FC, useContext, useEffect, useRef, useState } from "react";
import {
  SET_ACTIVITY,
  SET_APP_STATS,
  SET_BEST_FRIENDS,
  SET_CARDS,
  SET_GET_WINNER_GIF,
  SET_LEADERBOARD,
  SET_PLAY_WIN_SOUND,
  SET_REFETCH_USER_CARDS,
  SET_SELECTED_CARD,
  SET_UNSCRATCHED_CARDS,
  SET_USER,
} from "~/app/context/actions";
import { Card } from "~/app/interface/card";

import {
  fetchActivity,
  fetchAppStats,
  fetchBestFriends,
  fetchLeaderboard,
  fetchUserCards,
  fetchUserInfo,
} from "~/lib/userapis";
import { AppContext } from "../app/context";
import Bottom from "./bottom";
import { getFromLocalStorage } from "~/lib/utils";
import InitialScreen from "./initial-screen";
import { INITIAL_SCREEN_KEY } from "~/lib/constants";
import WinRatePopup from "./win-rate-popup";
import { useDetectClickOutside } from "~/hooks/useDetectClickOutside";

const Wrapper: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [seenInitial, setSeenInitial] = useState(false);
  const [showWinRates, setShowWinRates] = useState(false);
  const readyCalled = useRef(false);
  const currentCardsRef = useRef(state.cards);
  const currentLeaderboardRef = useRef(state.leaderboard);
  const currentActivityRef = useRef(state.activity);
  const currentUnscratchedCardsRef = useRef(state.unscratchedCards);
  const prizePoolRef = createRef<HTMLDivElement>();
  const { push } = useRouter();
  const { context } = useMiniApp();
  const userFid = context?.user.fid;

  useDetectClickOutside(prizePoolRef, () => setShowWinRates(false));

  // Audio for win sounds - load once and reuse
  const winAudioRef = useRef<HTMLAudioElement | null>(null);

  // Images for scratch-off - preload once and reuse
  const winnerGifRef = useRef<HTMLImageElement | null>(null);

  // Initialize audio and images on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Preload audio
      winAudioRef.current = new Audio("/assets/win.mp3");
      winAudioRef.current.preload = "auto";
      winAudioRef.current.volume = 0.7; // Set volume to 70%

      // Preload winner gif
      winnerGifRef.current = new window.Image();
      winnerGifRef.current.src = "/assets/winner.gif";
    }
  }, []);

  // Initialize/record initial-screen flag once on mount
  useEffect(() => {
    const seenInitial = getFromLocalStorage(INITIAL_SCREEN_KEY, false);
    setSeenInitial(seenInitial);
  }, []);

  // Function to play win sound
  const playWinSound = () => {
    if (winAudioRef.current) {
      winAudioRef.current.currentTime = 0; // Reset to beginning
      winAudioRef.current.play().catch((error) => {
        console.log("Audio play failed:", error);
      });
    }
  };

  // Function to get preloaded winner gif
  const getWinnerGif = () => winnerGifRef.current;

  // Helper function to filter unscratched cards
  const getUnscratchedCards = (cards: Card[]) => {
    return cards.filter((card) => !card.scratched);
  };

  // Refetch function for user cards
  const refetchUserCards = async () => {
    if (!state.publicKey) return;

    try {
      const { fetchUserCards } = await import("~/lib/userapis");
      const userCards = await fetchUserCards(state.publicKey);
      if (userCards) {
        dispatch({ type: SET_CARDS, payload: userCards as unknown as Card[] });
        dispatch({
          type: SET_UNSCRATCHED_CARDS,
          payload: getUnscratchedCards(userCards as unknown as Card[]),
        });

        // If there's a selected card, update it with the latest data to preserve its state
        if (state.selectedCard) {
          const updatedSelectedCard = userCards.find(
            (card) => card.id === state.selectedCard!.id
          );
          if (updatedSelectedCard) {
            dispatch({ type: SET_SELECTED_CARD, payload: updatedSelectedCard });
          }
        }
      }
    } catch (error) {
      console.error("Failed to refetch user cards:", error);
    }
  };

  // Set functions in context
  useEffect(() => {
    dispatch({ type: SET_PLAY_WIN_SOUND, payload: playWinSound });
    dispatch({ type: SET_GET_WINNER_GIF, payload: getWinnerGif });
    dispatch({ type: SET_REFETCH_USER_CARDS, payload: refetchUserCards });
  }, []);

  // Keep ref updated with current cards
  useEffect(() => {
    currentCardsRef.current = state.cards;
    dispatch({
      type: SET_UNSCRATCHED_CARDS,
      payload: getUnscratchedCards(state.cards),
    });
  }, [state.cards]);

  // Keep ref updated with current leaderboard
  useEffect(() => {
    currentLeaderboardRef.current = state.leaderboard;
  }, [state.leaderboard]);

  // Keep ref updated with current activity
  useEffect(() => {
    currentActivityRef.current = state.activity;
  }, [state.activity]);

  // Keep ref updated with current unscratched cards
  useEffect(() => {
    currentUnscratchedCardsRef.current = state.unscratchedCards;
  }, [state.unscratchedCards]);

  // Fetch all data when wallet connects
  useEffect(() => {
    if (state.publicKey && userFid) {
      fetchAllData(state.publicKey, userFid);
    }
  }, [state.publicKey, userFid]);

  // Fetch all data when wallet connects using Promise.allSettled
  const fetchAllData = async (userWallet: string, userFid: number) => {
    if (!userWallet) return;
    if (!userFid) return;

    setLoading(true);

    try {
      const promises = [
        fetchUserCards(userWallet),
        fetchUserInfo(userWallet),
        fetchAppStats(),
        fetchLeaderboard(),
        fetchActivity(),
      ];

      const [userCards, userInfo, appStats, leaderboard, activity] =
        await Promise.allSettled(promises);

      if (userCards.status === "fulfilled") {
        dispatch({ type: SET_CARDS, payload: userCards.value });
      }
      if (userInfo.status === "fulfilled") {
        dispatch({ type: SET_USER, payload: userInfo.value });
        const bestFriends = await fetchBestFriends(userFid);
        dispatch({
          type: SET_BEST_FRIENDS,
          payload: bestFriends,
        });
      }
      if (appStats.status === "fulfilled")
        dispatch({ type: SET_APP_STATS, payload: appStats.value });
      if (leaderboard.status === "fulfilled")
        dispatch({ type: SET_LEADERBOARD, payload: leaderboard.value });
      if (activity.status === "fulfilled")
        dispatch({ type: SET_ACTIVITY, payload: activity.value });
      callReady();
    } catch (error) {
      console.error("Error in fetching user info", error);
    } finally {
      setLoading(false);
    }
  };

  const callReady = async () => {
    if (state.publicKey) {
      try {
        await sdk.actions.ready();
        readyCalled.current = true;
      } catch (error) {
        console.error("Failed to signal app ready:", error);
      }
    }
  };

  // Fetch all data when wallet connects
  // useEffect(() => {
  //   if (state.publicKey && userFid) {
  //     fetchAllData(state.publicKey, userFid);
  //   }
  // }, [state.publicKey, userFid]);

  // Real-time subscriptions removed - migrated to Prisma
  // TODO: Implement real-time updates with database triggers/webhooks if needed

  const handleCloseModal = () => {
    dispatch({ type: "SET_SELECTED_CARD", payload: null });
  };

  useEffect(() => {
    if (state.publicKey && state.user) {
      const testAddMiniApp = async () => {
        try {
          const result = await sdk.actions.addMiniApp();
          if (
            result.notificationDetails &&
            result.notificationDetails.token &&
            !state.user?.notification_enabled
          ) {
            try {
              await fetch(`/api/neynar/welcome-notification`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fid: state.user?.fid,
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
  }, [state.publicKey, state.user]);

  if (!seenInitial) {
    return <InitialScreen onScratchNow={() => setSeenInitial(true)} />;
  }

  return (
    <div
      className="h-[100dvh] transition-all ease-in-out duration-300"
      style={{ background: state.appBackground }}
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
          {!state.selectedCard ? (
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
                ${state?.appStats?.winnings || state?.user?.amount_won || 0}
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
          mode={state.swipableMode ? "swipeable" : "normal"}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default Wrapper;
