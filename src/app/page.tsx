"use client";
import { useEffect, useMemo } from "react";
import { useAppStore } from "~/stores/app-store";
import { useCardStore } from "~/stores/card-store";
import { useUserStore } from "~/stores/user-store";
import SwipeableCardStack from "~/components/swipeable-card-stack";
import { useContractStats } from "~/hooks";
import { useUserTokens } from "~/hooks";
import type { Token } from "~/hooks/useUserTokens";

// Derive unclaimed token IDs (number[]) from subgraph tokens
// Reference: docs/guides/FRONTEND_SUBGRAPH_INTEGRATION.md
function extractUnclaimedTokenIds(cards: Token[] = []): number[] {
  return cards
    .map((token) => {
      const idAsNumber = Number(token.id);
      return Number.isFinite(idAsNumber) ? idAsNumber : null;
    })
    .filter((n): n is number => n !== null);
}

export default function Home() {
  const setSwipableMode = useAppStore((s) => s.setSwipableMode);
  // const localCards = useCardStore((s) => s.localCards);
  const setLocalCards = useCardStore((s) => s.setLocalCards);
  // const unscratchedCards = useCardStore((s) => s.unscratchedCards);
  const userWallet = useUserStore((s) => s.user?.address || "");
  const { isPaused, formattedStats } = useContractStats();
  const { availableCards } = useUserTokens();

  // Stable list of unclaimed token IDs from subgraph to prevent refetch loops
  const tokenIds = useMemo(() => extractUnclaimedTokenIds(availableCards), [availableCards]);
  console.log("🚀 ~ Home ~ tokenIds:", tokenIds)

  useEffect(() => {
    setSwipableMode(true);
    return () => {
      setSwipableMode(false);
      setLocalCards([]);
    };
  }, [setSwipableMode, setLocalCards]);


  // Show contract pause overlay if contract is paused
  if (isPaused && formattedStats) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⏸️</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Contract Paused</h1>
          <p className="text-white/60 mb-4">
            The scratch card contract is currently paused. No new cards can be minted or scratched at this time.
          </p>
          <div className="bg-white/5 rounded-lg p-4 text-left">
            <p className="text-sm text-white/60 mb-2">Contract Stats:</p>
            <div className="space-y-1">
              <p className="text-sm text-white/80">Total Minted: {formattedStats.totalMinted.toLocaleString()}</p>
              <p className="text-sm text-white/80">Prizes Claimed: {formattedStats.totalClaimed.toLocaleString()}</p>
              <p className="text-sm text-white/80">Card Price: {formattedStats.currentPrice} ETH</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SwipeableCardStack userWallet={userWallet} tokenIds={tokenIds.length > 0 ? tokenIds : [17, 18, 19]} />
    </>
  );
}
