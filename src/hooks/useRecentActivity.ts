'use client'

import { useQuery } from '@tanstack/react-query'
import { GET_RECENT_ACTIVITY } from '../queries'
import { makeGraphQLRequest } from '~/lib/graphql-client'
import { formatEther, formatUnits } from 'viem'
import { formatDistanceToNow } from 'date-fns'

export interface RecentMint {
  id: string
  buyer: string
  quantity: string
  totalPrice: string
  timestamp: string
  transactionHash: string
  blockNumber: string
}

export interface RecentClaim {
  id: string
  tokenId: string
  winner: string
  prizeAmount: string
  claimedAt: string
  transactionHash: string
  blockNumber: string
}

export interface FormattedRecentMint extends RecentMint {
  formattedPrice: string
  formattedTime: string
  truncatedAddress: string
}

export interface FormattedRecentClaim extends RecentClaim {
  formattedPrize: string
  formattedTime: string
  truncatedAddress: string
}

export interface UseRecentActivityReturn {
  recentMints: FormattedRecentMint[]
  recentClaims: FormattedRecentClaim[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useRecentActivity(limit = 10): UseRecentActivityReturn {
  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['recentActivity', limit],
    queryFn: () => makeGraphQLRequest<{ mintOperations: RecentMint[], prizeClaims: RecentClaim[] }>(GET_RECENT_ACTIVITY, { first: limit }),
    refetchInterval: 15000, // Refresh every 15 seconds
    retry: 3,
    staleTime: 7000,
  })

  const recentMints = (data?.mintOperations || []).map((mint: RecentMint): FormattedRecentMint => ({
    ...mint,
    formattedPrice: formatEther(BigInt(mint.totalPrice)),
    formattedTime: formatDistanceToNow(new Date(Number(mint.timestamp) * 1000), { addSuffix: true }),
    truncatedAddress: `${mint.buyer.slice(0, 6)}...${mint.buyer.slice(-4)}`,
  }))

  const recentClaims = (data?.prizeClaims || []).map((claim: RecentClaim): FormattedRecentClaim => ({
    ...claim,
    formattedPrize: formatUnits(BigInt(claim.prizeAmount), 6), // USDC has 6 decimals
    formattedTime: formatDistanceToNow(new Date(Number(claim.claimedAt) * 1000), { addSuffix: true }),
    truncatedAddress: `${claim.winner.slice(0, 6)}...${claim.winner.slice(-4)}`,
  }))

  return {
    recentMints,
    recentClaims,
    loading,
    error,
    refetch,
  }
}