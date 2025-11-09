"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useUserStore } from "~/stores/user-store";
import { useInfiniteCards } from "~/hooks/useInfiniteCards";
import CardGrid from "~/components/card-grid";
import { useRouter } from "next/navigation";

const CardsPage = () => {
  const user = useUserStore((s) => s.user);
  const { push } = useRouter();
  const [stateFilter, setStateFilter] = useState<'unscratched' | 'scratched' | 'claimed' | 'all'>('all');

  const {
    cards,
    loading,
    error,
    hasMore,
    totalCount,
    loadMoreRef
  } = useInfiniteCards({
    userWallet: user?.address || '',
    stateFilter,
    initialLimit: 20
  });

  const handleCardSelect = () => {
    // Navigate to home page to scratch the card
    push('/');
  };

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Connect Wallet</h1>
          <p className="text-white/60">Please connect your wallet to view your cards.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <div className="p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-white mb-2">My Cards</h1>
          <p className="text-white/60">
            {totalCount} total card{totalCount !== 1 ? 's' : ''}
          </p>
        </motion.div>

        {/* State Filter */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex space-x-2 mb-6 overflow-x-auto"
        >
          {[
            { id: 'all', label: 'All Cards', count: totalCount },
            { id: 'unscratched', label: 'Unscratched', count: cards.filter(c => c.cardState === 'unscratched').length },
            { id: 'scratched', label: 'Scratched', count: cards.filter(c => c.cardState === 'scratched').length },
            { id: 'claimed', label: 'Claimed', count: cards.filter(c => c.cardState === 'claimed').length }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStateFilter(filter.id as typeof stateFilter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                stateFilter === filter.id
                  ? 'bg-white/20 text-white shadow-lg border border-white/30'
                  : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/15 border border-white/10'
              }`}
            >
              {filter.label}
              <span className="ml-2 text-xs opacity-75">({filter.count})</span>
            </button>
          ))}
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6"
          >
            <p className="text-red-300 text-sm">
              Error loading cards: {error.message}
            </p>
          </motion.div>
        )}

        {/* Cards Grid */}
        {cards.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <CardGrid
              cards={cards}
              onCardSelect={handleCardSelect}
              showViewAll={false}
            />
          </motion.div>
        ) : !loading && !error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎴</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No cards yet</h3>
            <p className="text-white/60 mb-4">
              {stateFilter === 'all' 
                ? "You haven&apos;t purchased any scratch cards yet."
                : `No ${stateFilter} cards found.`
              }
            </p>
            {stateFilter === 'all' && (
              <button
                onClick={() => push('/')}
                className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Buy Cards
              </button>
            )}
          </motion.div>
        ) : null}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white/10 rounded-lg animate-pulse"
                style={{ height: '102px' }}
              />
            ))}
          </div>
        )}

        {/* Load More Trigger */}
        <div ref={loadMoreRef} className="h-4" />
        
        {/* Loading More Indicator */}
        {loading && cards.length > 0 && (
          <div className="text-center py-4">
            <div className="inline-flex items-center space-x-2 text-white/60">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              <span className="text-sm">Loading more cards...</span>
            </div>
          </div>
        )}

        {/* End of Cards Indicator */}
        {!hasMore && cards.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <p className="text-white/40 text-sm">
              You&apos;ve reached the end of your cards
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CardsPage;