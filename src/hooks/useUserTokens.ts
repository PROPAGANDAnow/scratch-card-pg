'use client'

import { useQuery } from '@tanstack/react-query'
import { useUserStore } from '~/stores/user-store'

export interface TokenMetadata {
  tokenId: string
  name?: string
  description?: string
  image?: string | null
  contractAddress: string
  tokenType: string
  balance: string
  timeLastUpdated: string
  contract: {
    address: string
    name?: string
    symbol?: string
    tokenType: string
    openSeaMetadata?: Record<string, unknown>
  }
  raw?: Record<string, unknown>
  tokenUri?: string
  scratched?: boolean
  prizeWon?: boolean
  existsInDb?: boolean
  createdAt?: string | null
  scratchedAt?: string | null
}

export interface Token {
  id: string
  owner: string
  contract: string
  batchId: string
  prizeToken: string
  prizeAmount: string
  claimed: boolean
  mintedAt: string
  claimedAt: string | null
  stateChanges: Array<{
    id: string
    state: string
    timestamp: string
  }>
  metadata?: TokenMetadata
}

export interface UseUserTokensReturn {
  tokens: Token[]
  availableCards: Token[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface GetByOwnerResponse {
  data: {
    availableCards: Token[]
    tokens: Token[]
  }
}

export function useUserTokens(): UseUserTokensReturn {
  const userAddress = useUserStore((s) => s.user?.address)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['userTokens', userAddress?.toLowerCase()],
    queryFn: async () => {
      if (!userAddress) return null

      const response = await fetch(`/api/cards/get-by-owner?userWallet=${userAddress}`)
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }
      const data = response.json() as Promise<GetByOwnerResponse>
      return data
    },
    enabled: !!userAddress,
    retry: 3,
    staleTime: 30000,
  })

  const tokens = data?.data?.tokens || []
  const availableCards = data?.data?.tokens || []

  return {
    tokens,
    availableCards,
    loading: isLoading,
    error,
    refetch,
  }
}