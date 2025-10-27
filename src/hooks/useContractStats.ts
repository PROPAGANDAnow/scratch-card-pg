'use client'

import { useQuery } from '@apollo/client/react'
import { GET_CONTRACT_STATS } from '../queries'
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
  const { data, loading, error, refetch } = useQuery(GET_CONTRACT_STATS, {
    errorPolicy: 'all',
    pollInterval: 10000, // Refresh every 10 seconds
    notifyOnNetworkStatusChange: true,
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