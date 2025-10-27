'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@apollo/client/react'
import { useAccount } from 'wagmi'
import { GET_USER_MINTS, GET_USER_CLAIMS } from '../queries'

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

  const { data: mintsData, loading: mintsLoading, error: mintsError, fetchMore: fetchMoreMints } = useQuery(GET_USER_MINTS, {
    variables: {
      userAddress: address?.toLowerCase() || '',
      first: limit,
      skip: page * limit,
    },
    skip: !address,
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  })

  const { data: claimsData, loading: claimsLoading, error: claimsError, fetchMore: fetchMoreClaims } = useQuery(GET_USER_CLAIMS, {
    variables: {
      userAddress: address?.toLowerCase() || '',
      first: limit,
      skip: page * limit,
    },
    skip: !address,
    errorPolicy: 'all',
  })

  const mints = mintsData?.mintOperations || []
  const claims = claimsData?.prizeClaims || []
  const loading = mintsLoading || claimsLoading
  const error = mintsError || claimsError

  const refetch = useCallback(() => {
    fetchMoreMints?.()
    fetchMoreClaims?.()
    setPage(0)
  }, [fetchMoreMints, fetchMoreClaims])

  const loadMore = useCallback(() => {
    if (fetchMoreMints && mints.length === limit) {
      fetchMoreMints({
        variables: {
          skip: (page + 1) * limit,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev
          return {
            mintOperations: [
              ...(prev?.mintOperations || []),
              ...(fetchMoreResult.mintOperations || []),
            ],
          }
        },
      })
    }

    if (fetchMoreClaims && claims.length === limit) {
      fetchMoreClaims({
        variables: {
          skip: (page + 1) * limit,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev
          return {
            prizeClaims: [
              ...(prev?.prizeClaims || []),
              ...(fetchMoreResult.prizeClaims || []),
            ],
          }
        },
      })
    }

    setPage(prev => prev + 1)
  }, [fetchMoreMints, fetchMoreClaims, mints.length, claims.length, page, limit])

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