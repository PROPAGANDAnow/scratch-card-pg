"use client";
import { motion } from "framer-motion";
import { useUserActivity, useUserTokens } from "~/hooks";
import { useContext } from "react";
import { AppContext } from "~/app/context";
import { formatEther } from "viem";
import { formatDistanceToNow } from "date-fns";

const UserCards = () => {
  const { mints, loading: mintsLoading, error: mintsError } = useUserActivity(20);
  const { availableCards, loading: tokensLoading, error: tokensError } = useUserTokens();
  const [state] = useContext(AppContext);

  const loading = mintsLoading || tokensLoading;
  const error = mintsError || tokensError;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-white/20 rounded mb-2"></div>
            <div className="h-6 bg-white/20 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
        <p className="text-white/60">Could not load card history</p>
        <p className="text-sm text-white/40 mt-1">{error.message}</p>
      </div>
    );
  }

  // Calculate total cards from mints
  const totalMinted = mints.reduce((total, mint) => total + Number(mint.quantity), 0);
  const totalSpent = mints.reduce((total, mint) => total + Number(formatEther(BigInt(mint.totalPrice))), 0);

  return (
    <div className="space-y-6">
      {/* Info Note */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3"
      >
        <p className="text-blue-300 text-sm">
          💡 <strong>Note:</strong> All card data comes from the blockchain.
          Cards must be minted on-chain to appear here.
        </p>
      </motion.div>
      {/* Cards Summary */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
        >
          <h3 className="text-white/60 text-sm font-medium mb-2">Cards Purchased</h3>
          <p className="text-2xl font-bold text-blue-400">{totalMinted}</p>
          <p className="text-xs text-white/40 mt-1">From blockchain</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
        >
          <h3 className="text-white/60 text-sm font-medium mb-2">Total Spent</h3>
          <p className="text-2xl font-bold text-orange-400">{totalSpent.toFixed(4)} ETH</p>
          <p className="text-xs text-white/40 mt-1">From blockchain</p>
        </motion.div>
      </div>

      {/* Available Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
      >
        <h3 className="text-white text-lg font-semibold mb-3">Available Cards</h3>
        {availableCards && availableCards.length > 0 ? (
          <div className="space-y-2">
            <p className="text-white/60 text-sm">
              You have {availableCards.length} card{availableCards.length !== 1 ? 's' : ''} ready to scratch
            </p>
            <p className="text-white/40 text-xs">From blockchain</p>
            <div className="flex flex-wrap gap-2">
              {availableCards.slice(0, 5).map((card) => (
                <div
                  key={card.id}
                  className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-500/30"
                >
                  <p className="text-white text-sm font-medium">Token #{card.id}</p>
                  <p className="text-white/60 text-xs">
                    Prize: {formatEther(BigInt(card.prizeAmount))} ETH
                  </p>
                </div>
              ))}
              {availableCards.length > 5 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                  <p className="text-white/60 text-sm">+{availableCards.length - 5} more</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-white/60 text-sm">No cards available on blockchain.</p>
            {state.cards && state.cards.length > 0 && (
              <p className="text-white/40 text-xs">
                You have {state.cards.length} card{state.cards.length !== 1 ? 's' : ''} in database waiting to be minted.
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* Minting History */}
      {mints.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-white text-lg font-semibold">Recent Purchases</h3>
          <div className="space-y-3">
            {mints.slice(0, 5).map((mint, index) => {
              const mintDate = new Date(Number(mint.timestamp) * 1000);
              const quantity = Number(mint.quantity);
              const totalPrice = Number(formatEther(BigInt(mint.totalPrice)));

              return (
                <motion.div
                  key={mint.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-white font-medium">
                        Purchased {quantity} card{quantity !== 1 ? 's' : ''}
                      </p>
                      <p className="text-white/60 text-sm">
                        {formatDistanceToNow(mintDate, { addSuffix: true })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-orange-400 font-medium">
                        {totalPrice.toFixed(4)} ETH
                      </p>
                      <a
                        href={`https://basescan.org/tx/${mint.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs underline"
                      >
                        View on Basescan →
                      </a>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserCards;