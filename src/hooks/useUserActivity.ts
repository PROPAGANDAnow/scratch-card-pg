'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { GET_USER_MINTS, GET_USER_CLAIMS } from '../queries'
import { makeGraphQLRequest } from '~/lib/graphql-client'

export interface MintOperation {
  id: string
  buyer: string
  recipient: string
  quantity: string
  totalPrice: string
  timestamp: string
  transactionHash: string
  blockNumber: string
  isAdminMint: boolean
}

export interface PrizeClaim {
  id: string
  tokenId: string
  winner: string
  prizeToken: string
  prizeAmount: string
  claimedAt: string
  claimedAtBlock: string
  transactionHash: string
  blockNumber: string
}

export interface UserActivity {
  mints: MintOperation[]
  claims: PrizeClaim[]
  loading: boolean
  error: Error | null
  refetch: () => void
  loadMore: () => void
  hasMore: boolean
}

export function useUserActivity(limit = 20): UserActivity {
  const { address } = useAccount()
  const [page, setPage] = useState(0)

  const { data: mintsData, isLoading: mintsLoading, error: mintsError, refetch: refetchMints } = useQuery({
    queryKey: ['userMints', address?.toLowerCase(), page, limit],
    queryFn: () => makeGraphQLRequest<{ mintOperations: MintOperation[] }>(GET_USER_MINTS, {
      userAddress: address?.toLowerCase() || '',
      first: limit,
      skip: page * limit,
    }),
    enabled: !!address,
    retry: 3,
    staleTime: 30000,
  })

  const { data: claimsData, isLoading: claimsLoading, error: claimsError, refetch: refetchClaims } = useQuery({
    queryKey: ['userClaims', address?.toLowerCase(), page, limit],
    queryFn: () => makeGraphQLRequest<{ prizeClaims: PrizeClaim[] }>(GET_USER_CLAIMS, {
      userAddress: address?.toLowerCase() || '',
      first: limit,
      skip: page * limit,
    }),
    enabled: !!address,
    retry: 3,
    staleTime: 30000,
  })

  const mints = mintsData?.mintOperations || []
  const claims = claimsData?.prizeClaims || []
  const loading = mintsLoading || claimsLoading
  const error = mintsError || claimsError

  const refetch = useCallback(() => {
    refetchMints()
    refetchClaims()
    setPage(0)
  }, [refetchMints, refetchClaims])

  const loadMore = useCallback(() => {
    setPage(prev => prev + 1)
  }, [])

  const hasMore = mints.length === limit || claims.length === limit

  return {
    mints,
    claims,
    loading,
    error,
    refetch,
    loadMore,
    hasMore,
  }
}