"use client";
import { motion } from "framer-motion";
import ContractStats from "~/components/contract-stats";
import SubgraphActivity from "~/components/subgraph-activity";
import { useContractStats, useUserStats } from "~/hooks";
import { useAccount } from "wagmi";

const DashboardPage = () => {
  const { address } = useAccount();
  const { isPaused } = useContractStats();
  const userStats = useUserStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Scratch Card NFT Dashboard
          </h1>
          <p className="text-white/60">
            Real-time contract statistics and activity
          </p>
          {isPaused && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
              <span className="text-red-300 text-sm">Contract Paused</span>
            </div>
          )}
        </motion.div>

        {/* Contract Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Contract Statistics</h2>
          <ContractStats />
        </motion.div>

        {/* User Statistics (if connected) */}
        {address && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Your Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <h3 className="text-sm font-medium text-white/60 mb-2">Cards Minted</h3>
                <p className="text-xl font-bold text-white">{userStats.totalMinted}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <h3 className="text-sm font-medium text-white/60 mb-2">Total Spent</h3>
                <p className="text-xl font-bold text-white">{userStats.totalSpent} ETH</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <h3 className="text-sm font-medium text-white/60 mb-2">Total Won</h3>
                <p className="text-xl font-bold text-green-400">{userStats.totalWon} ETH</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <h3 className="text-sm font-medium text-white/60 mb-2">Win Rate</h3>
                <p className="text-xl font-bold text-white">{userStats.winRate}%</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-white mb-4">Recent Activity</h2>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
            <SubgraphActivity />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;