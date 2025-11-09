"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { useInfiniteScroll } from "~/hooks";
import { formatDistanceToNow } from "date-fns";

const SubgraphActivity = () => {
  const { activities, loading, error, hasMore, loadMoreRef } = useInfiniteScroll({
    limit: 20,
    threshold: 200
  });

  if (loading && activities.length === 0) {
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

  if (error && activities.length === 0) {
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

  if (activities.length === 0) {
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
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            className="flex items-center justify-between w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.01 }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                {activity.pfp ? (
                  <Image
                    src={activity.pfp}
                    alt="User"
                    width={48}
                    height={48}
                    loading="lazy"
                    className="rounded-full !w-[48px] !h-[48px] object-cover"
                  />
                ) : (
                  <div className="rounded-full !w-[48px] !h-[48px] bg-white/20"></div>
                )}
                {activity.type === 'mint' && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">M</span>
                  </div>
                )}
                {activity.type === 'scratch' && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">S</span>
                  </div>
                )}
                {activity.type === 'win' && (
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
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>
          </motion.div>
        ))}

        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="w-full h-4" />

        {/* Loading indicator for more items */}
        {loading && activities.length > 0 && (
          <motion.div
            className="flex justify-center py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/60"></div>
          </motion.div>
        )}

        {/* End of activities indicator */}
        {!hasMore && activities.length > 0 && (
          <motion.p
            className="w-full text-center font-medium text-[12px] leading-[90%] text-white/40 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            No more activity
          </motion.p>
        )}
      </motion.div>
    </div>
  );
};

export default SubgraphActivity;