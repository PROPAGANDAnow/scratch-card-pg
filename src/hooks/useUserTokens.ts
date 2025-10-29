'use client'

import { useCallback, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GET_USER_TOKENS, GET_USER_AVAILABLE_CARDS } from '../queries'
import { makeGraphQLRequest } from '~/lib/graphql-client'
import { AppContext } from '~/app/context'

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
}

export interface UseUserTokensReturn {
  tokens: Token[]
  availableCards: Token[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useUserTokens(): UseUserTokensReturn {
  const [state] = useContext(AppContext)
  const userAddress = state.user?.wallet

  const { data: tokensData, isLoading: tokensLoading, error: tokensError, refetch: refetchTokens } = useQuery({
    queryKey: ['userTokens', userAddress?.toLowerCase()],
    queryFn: () => makeGraphQLRequest<{ tokens: Token[] }>(GET_USER_TOKENS, {
      userAddress: userAddress?.toLowerCase() || '',
    }),
    enabled: !!userAddress,
    retry: 3,
    staleTime: 30000,
  })

  const { data: availableCardsData, isLoading: availableCardsLoading, error: availableCardsError, refetch: refetchAvailableCards } = useQuery({
    queryKey: ['userAvailableCards', userAddress?.toLowerCase()],
    queryFn: () => makeGraphQLRequest<{ tokens: Token[] }>(GET_USER_AVAILABLE_CARDS, {
      userAddress: userAddress?.toLowerCase() || '',
    }),
    enabled: !!userAddress,
    retry: 3,
    staleTime: 30000,
  })

  const tokens = tokensData?.tokens || []
  const availableCards = availableCardsData?.tokens || []
  const loading = tokensLoading || availableCardsLoading
  const error = tokensError || availableCardsError

  const refetch = useCallback(() => {
    refetchTokens()
    refetchAvailableCards()
  }, [refetchTokens, refetchAvailableCards])

  return {
    tokens,
    availableCards,
    loading,
    error,
    refetch,
  }
}