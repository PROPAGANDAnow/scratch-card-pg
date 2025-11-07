'use client'

import { Card } from '@prisma/client'
import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useCardStore } from '~/stores/card-store'

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
  availableCards: TokenWithState[];
  totalCount: number;
  loading: boolean;
  error: Error | null
  refetch: (address?: string) => Promise<void>
}

export interface TokenWithState { id: string, state: Card, metadata: Token }

export function useUserTokens(): UseUserTokensReturn {
  const { address } = useAccount()
  const { cards, loading, error, refetchCards, totalCount } = useCardStore()

  useEffect(() => {
    if (address)
      refetchCards(address)
  }, [address, refetchCards])

  // Convert cards to TokenWithState format
  const availableCards: TokenWithState[] = cards

  return {
    availableCards,
    totalCount,
    loading,
    error,
    refetch: refetchCards
  }
}