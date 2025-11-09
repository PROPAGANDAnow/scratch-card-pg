'use client'

import { useQuery } from '@tanstack/react-query'
import { LeaderboardEntry } from '~/app/interface/api'

interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  totalEntries: number
  timeframe: string
  lastUpdated: string
}

interface UseLeaderboardOptions {
  limit?: number
  offset?: number
  timeframe?: 'all' | 'daily' | 'weekly' | 'monthly'
  refetchInterval?: number
}

interface UseLeaderboardReturn {
  entries: LeaderboardEntry[]
  totalEntries: number
  loading: boolean
  error: Error | null
  refetch: () => void
  hasMore: boolean
}

export type { UseLeaderboardOptions, UseLeaderboardReturn }

export function useLeaderboard(options: UseLeaderboardOptions = {}): UseLeaderboardReturn {
  const {
    limit = 100,
    offset = 0,
    timeframe = 'all',
    refetchInterval = 30000 // Refresh every 30 seconds
  } = options

  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['leaderboard', { limit, offset, timeframe }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        timeframe
      })

      const response = await fetch(`/api/leaderboard?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch leaderboard')
      }

      return result.data as LeaderboardResponse
    },
    refetchInterval,
    retry: 3,
    staleTime: 10000, // Consider data stale after 10 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (formerly cacheTime)
  })

  const entries = data?.entries || []
  const totalEntries = data?.totalEntries || 0
  const hasMore = offset + entries.length < totalEntries

  return {
    entries,
    totalEntries,
    loading,
    error,
    refetch,
    hasMore
  }
}