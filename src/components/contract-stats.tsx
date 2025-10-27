"use client";
import { motion } from "framer-motion";
import { useContractStats } from "~/hooks";

const ContractStats = () => {
  const { formattedStats, loading, error } = useContractStats();

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-white/20 rounded mb-2"></div>
            <div className="h-6 bg-white/20 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !formattedStats) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
        <p className="text-white/60">Could not load contract statistics</p>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Minted",
      value: formattedStats.totalMinted.toLocaleString(),
      color: "from-blue-500 to-blue-600",
    },
    {
      label: "Prizes Claimed", 
      value: formattedStats.totalClaimed.toLocaleString(),
      color: "from-green-500 to-green-600",
    },
    {
      label: "Total Distributed",
      value: formattedStats.totalDistributed,
      color: "from-purple-500 to-purple-600",
    },
    {
      label: "Card Price",
      value: formattedStats.currentPrice,
      color: "from-orange-500 to-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300" 
               style={{ backgroundImage: `linear-gradient(to right, ${stat.color.split(' ').join(', ')})` }} />
          <div className="relative bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <h3 className="text-sm font-medium text-white/60 mb-2">
              {stat.label}
            </h3>
            <p className="text-xl font-bold text-white">
              {stat.value}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ContractStats;