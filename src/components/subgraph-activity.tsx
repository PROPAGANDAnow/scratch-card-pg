"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRecentActivity } from "~/hooks";
import { formatDistanceToNow } from "date-fns";

const SubgraphActivity = () => {
  const { recentMints, recentClaims, loading, error } = useRecentActivity(20);

  // Helper function to truncate address
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Combine and sort all activities
  const allActivities = [
    ...recentMints.map(mint => ({
      ...mint,
      type: 'mint' as const,
      title: `Minted ${mint.quantity} card${mint.quantity !== '1' ? 's' : ''}`,
      subtitle: truncateAddress(mint.buyer),
      amount: mint.formattedPrice,
      timestamp: mint.timestamp,
      transactionHash: mint.transactionHash,
      color: 'text-blue-400',
    })),
    ...recentClaims.map(claim => ({
      ...claim,
      type: 'claim' as const,
      title: `Won ${claim.formattedPrize}!`,
      subtitle: truncateAddress(claim.winner),
      amount: claim.formattedPrize,
      timestamp: claim.claimedAt,
      transactionHash: claim.transactionHash,
      color: 'text-green-400',
    }))
  ].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  if (loading) {
    return (
      <div className="w-full pt-8 h-full overflow-y-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-white/60 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading activity...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full pt-8 h-full overflow-y-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-white/60 text-center">
            <p>Could not load activity</p>
            <p className="text-sm mt-2">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (allActivities.length === 0) {
    return (
      <div className="w-full pt-8 h-full overflow-y-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-white/60 text-center">
            <p className="text-lg font-medium mb-2">No Activity Yet</p>
            <p className="text-sm">Be the first to mint and scratch cards!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pt-8 h-full overflow-y-auto">
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {allActivities.map((activity, index) => (
          <motion.div
            key={`${activity.type}-${activity.id}-${index}`}
            className="flex items-center justify-between w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.01 }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Image
                  src="/assets/splash-image.png"
                  alt="User"
                  width={48}
                  height={48}
                  loading="lazy"
                  className="rounded-full !w-[48px] !h-[48px] object-cover"
                />
                {activity.type === 'mint' && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">M</span>
                  </div>
                )}
                {activity.type === 'claim' && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">W</span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p
                  className={`text-[16px] font-bold leading-[90%] font-[ABCGaisyr] ${activity.color}`}
                >
                  {activity.title}
                </p>
                <p className="text-[12px] font-medium leading-[90%] text-white/60">
                  {activity.subtitle}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-medium leading-[90%] text-white/60">
                {formatDistanceToNow(new Date(Number(activity.timestamp) * 1000), { addSuffix: true })}
              </p>
              {activity.amount && (
                <p className={`text-[11px] font-medium leading-[90%] ${activity.color}`}>
                  {activity.amount}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default SubgraphActivity;