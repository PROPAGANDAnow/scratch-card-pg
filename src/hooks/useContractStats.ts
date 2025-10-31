'use client'

import { useQuery } from '@tanstack/react-query'
import { GET_CONTRACT_STATS } from '../queries'
import { makeGraphQLRequest } from '~/lib/graphql-client'
import { formatEther } from 'viem'

export interface ContractStats {
  id: string
  totalTokensMinted: string
  totalPrizesClaimed: string
  totalPrizesDistributed: string
  cardPrice: string
  paused: boolean
  paymentToken: string
  maxBatchSize: string
  createdAt: string
  updatedAt: string
}

export interface FormattedContractStats {
  totalMinted: number
  totalClaimed: number
  totalDistributed: string
  currentPrice: string
  maxBatch: number
}

export interface UseContractStatsReturn {
  stats: ContractStats | null
  loading: boolean
  error: Error | null
  refetch: () => void
  isPaused: boolean
  formattedStats: FormattedContractStats | null
}

export function useContractStats(): UseContractStatsReturn {
  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['contractStats'],
    queryFn: () => makeGraphQLRequest<{ contracts: ContractStats[] }>(GET_CONTRACT_STATS),
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 3,
    staleTime: 5000,
  })

  const stats = data?.contracts?.[0] || null

  const formattedStats = stats ? {
    totalMinted: Number(stats.totalTokensMinted),
    totalClaimed: Number(stats.totalPrizesClaimed),
    totalDistributed: formatEther(BigInt(stats.totalPrizesDistributed)),
    currentPrice: formatEther(BigInt(stats.cardPrice)),
    maxBatch: Number(stats.maxBatchSize),
  } : null

  return {
    stats,
    loading,
    error,
    refetch,
    isPaused: stats?.paused || false,
    formattedStats,
  }
}