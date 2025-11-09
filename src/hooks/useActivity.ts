'use client'

import { useQuery } from '@tanstack/react-query'
import { ActivityEntry } from '~/app/interface/api'

interface ActivityResponse {
  activities: ActivityEntry[]
  totalEntries: number
  type: string
  lastUpdated: string
}

interface UseActivityOptions {
  limit?: number
  offset?: number
  type?: 'all' | 'mint' | 'scratch' | 'win'
  refetchInterval?: number
}

interface UseActivityReturn {
  activities: ActivityEntry[]
  totalEntries: number
  loading: boolean
  error: Error | null
  refetch: () => void
  hasMore: boolean
}

export type { UseActivityOptions, UseActivityReturn }

export function useActivity(options: UseActivityOptions = {}): UseActivityReturn {
  const {
    limit = 20,
    offset = 0,
    type = 'all',
    refetchInterval = 30000 // Refresh every 30 seconds
  } = options

  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['activity', { limit, offset, type }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        type
      })

      const response = await fetch(`/api/activity?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch activity')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch activity')
      }

      return result.data as ActivityResponse
    },
    refetchInterval,
    retry: 3,
    staleTime: 10000, // Consider data stale after 10 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (formerly cacheTime)
  })

  const activities = data?.activities || []
  const totalEntries = data?.totalEntries || 0
  const hasMore = offset + activities.length < totalEntries

  return {
    activities,
    totalEntries,
    loading,
    error,
    refetch,
    hasMore
  }
}