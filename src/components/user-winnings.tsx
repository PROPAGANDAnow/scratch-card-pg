"use client";
import { motion } from "framer-motion";
import { useUserActivity } from "~/hooks";
import { formatEther } from "viem";
import { formatDistanceToNow } from "date-fns";

const UserWinnings = () => {
  const { claims, loading, error } = useUserActivity(20);

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
        <p className="text-white/60">Could not load winnings history</p>
        <p className="text-sm text-white/40 mt-1">{error.message}</p>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
        <p className="text-white/60 text-lg font-medium mb-2">No Winnings Yet</p>
        <p className="text-white/40 text-sm">Start scratching cards to win prizes!</p>
      </div>
    );
  }

  // Calculate total winnings
  const totalWinnings = claims.reduce((total, claim) => {
    return total + Number(formatEther(BigInt(claim.prizeAmount)));
  }, 0);

  return (
    <div className="space-y-6">
      {/* Total Winnings Summary */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-6 border border-green-500/30"
      >
        <h3 className="text-white/60 text-sm font-medium mb-2">Total Winnings</h3>
        <p className="text-3xl font-bold text-green-400">
          {totalWinnings.toFixed(4)} ETH
        </p>
        <p className="text-white/40 text-sm mt-1">
          From {claims.length} prize{claims.length !== 1 ? 's' : ''}
        </p>
      </motion.div>

      {/* Winnings History */}
      <div className="space-y-3">
        <h3 className="text-white text-lg font-semibold">Recent Winnings</h3>
        <div className="space-y-3">
          {claims.map((claim, index) => {
            const prizeAmount = Number(formatEther(BigInt(claim.prizeAmount)));
            const claimDate = new Date(Number(claim.claimedAt) * 1000);

            return (
              <motion.div
                key={claim.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-white font-medium">
                      Prize Won! 🎉
                    </p>
                    <p className="text-white/60 text-sm">
                      Token #{claim.tokenId}
                    </p>
                    <p className="text-white/40 text-xs">
                      {formatDistanceToNow(claimDate, { addSuffix: true })}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-green-400 font-bold text-lg">
                      +{prizeAmount.toFixed(4)} ETH
                    </p>
                    <a
                      href={`https://basescan.org/tx/${claim.transactionHash}`}
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
    </div>
  );
};

export default UserWinnings;