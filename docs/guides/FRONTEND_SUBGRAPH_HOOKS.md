# Frontend Subgraph Hooks Guide

## 📋 Overview

This guide focuses specifically on creating custom hooks for integrating with the ScratchCardNFT subgraph. It provides practical, production-ready hooks that handle data fetching, caching, error handling, and real-time updates.

## 🎯 What This Guide Covers

✅ **Hook Architecture**: Patterns for subgraph data hooks  
✅ **Data Fetching**: Efficient GraphQL queries with hooks  
✅ **State Management**: Local state + subgraph data integration  
✅ **Error Handling**: Robust error handling and retry logic  
✅ **Performance**: Caching, pagination, and optimization  
✅ **Real-time Updates**: Polling and subscription hooks  

---

## 🔗 Subgraph Configuration

### 1. Subgraph Endpoints

#### Production (Mainnet)
```typescript
// config/subgraph.ts
export const SUBGRAPH_ENDPOINTS = {
  // The Graph Studio (Recommended)
  studio: 'https://api.studio.thegraph.com/query/YOUR_SUBGRAPH_ID',
  
  // The Graph Hosted Service
  hosted: 'https://api.thegraph.com/subgraphs/name/YOUR_GITHUB_USERNAME/scratch-card-nft',
  
  // Decentralized Network
  decentralized: 'https://gateway.thegraph.com/ipfs/api/Qm.../subgraphs/name/YOUR_GITHUB_USERNAME/scratch-card-nft',
} as const

// Current active endpoint
export const SUBGRAPH_URL = SUBGRAPH_ENDPOINTS.studio
```

#### Development (Testnet)
```typescript
export const SUBGRAPH_ENDPOINTS = {
  // Base Sepolia Testnet
  baseSepolia: 'https://api.studio.thegraph.com/query/YOUR_TESTNET_SUBGRAPH_ID',
  
  // Local Development
  local: 'http://localhost:8000/subgraphs/name/scratch-card-nft/graphql',
} as const
```

### 2. GraphQL Client Configuration

#### Apollo Client Setup
```typescript
// lib/apollo-client.ts
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'
import { SUBGRAPH_URL } from '../config/subgraph'

const httpLink = createHttpLink({
  uri: SUBGRAPH_URL,
  headers: {
    // Optional: Add authentication headers if required
    // 'Authorization': `Bearer ${process.env.SUBGRAPH_API_KEY}`,
  },
})

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Cache contract stats for 30 seconds
          contracts: {
            merge(existing, incoming) {
              return incoming
            },
          },
          // Cache user activity with pagination
          mintOperations: {
            keyArgs: ['userAddress'],
            merge(existing, incoming, { args }) {
              const existingOps = existing?.[args.userAddress] || []
              const incomingOps = incoming?.mintOperations || []
              return [...existingOps, ...incomingOps]
            },
          },
          prizeClaims: {
            keyArgs: ['userAddress'],
            merge(existing, incoming, { args }) {
              const existingClaims = existing?.[args.userAddress] || []
              const incomingClaims = incoming?.prizeClaims || []
              return [...existingClaims, ...incomingClaims]
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
    },
  },
})

// Environment-specific clients
export const createApolloClient = (endpoint: string) => {
  return new ApolloClient({
    link: createHttpLink({ uri: endpoint }),
    cache: new InMemoryCache(),
  })
}
```

#### Simple GraphQL Request Client
```typescript
// lib/graphql-client.ts
import { GraphQLClient } from 'graphql-request'
import { SUBGRAPH_URL } from '../config/subgraph'

export const graphqlClient = new GraphQLClient(SUBGRAPH_URL, {
  headers: {
    // Optional headers
    'User-Agent': 'ScratchCardNFT-Frontend/1.0.0',
  },
})

// For multiple environments
export const createGraphQLClient = (endpoint: string) => {
  return new GraphQLClient(endpoint)
}
```

### 3. Environment Configuration

#### Development Environment
```typescript
// config/environment.ts
interface EnvironmentConfig {
  subgraphUrl: string
  contractAddress: string
  networkId: number
  blockExplorer: string
  rpcUrl: string
}

export const environments = {
  development: {
    subgraphUrl: 'http://localhost:8000/subgraphs/name/scratch-card-nft',
    contractAddress: '0x...', // Local contract
    networkId: 31337,
    blockExplorer: 'http://localhost:8545',
    rpcUrl: 'http://localhost:8545',
  },
  
  testnet: {
    subgraphUrl: 'https://api.studio.thegraph.com/query/YOUR_TESTNET_ID',
    contractAddress: '0x...', // Base Sepolia contract
    networkId: 84532,
    blockExplorer: 'https://sepolia.basescan.org',
    rpcUrl: 'https://sepolia.base.org',
  },
  
  production: {
    subgraphUrl: 'https://api.studio.thegraph.com/query/YOUR_MAINNET_ID',
    contractAddress: '0xca6FFD32f5070c862865eb86A89265962B33C8fb', // Base mainnet contract
    networkId: 8453,
    blockExplorer: 'https://basescan.org',
    rpcUrl: 'https://mainnet.base.org',
  },
} as const

export const currentEnv = (process.env.NODE_ENV as keyof typeof environments) || 'development'
export const config = environments[currentEnv]
```

#### Environment Variables
```bash
# .env.local
# Subgraph Configuration
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/YOUR_SUBGRAPH_ID
NEXT_PUBLIC_SUBGRAPH_API_KEY=your_api_key_here

# Environment Detection
NEXT_PUBLIC_NODE_ENV=production
NEXT_PUBLIC_NETWORK_ID=8453

# Fallback Endpoints
NEXT_PUBLIC_SUBGRAPH_BACKUP=https://api.thegraph.com/subgraphs/name/YOUR_USERNAME/scratch-card-nft

# Performance Settings
NEXT_PUBLIC_SUBGRAPH_CACHE_TIME=30000
NEXT_PUBLIC_SUBGRAPH_RETRY_ATTEMPTS=3
NEXT_PUBLIC_SUBGRAPH_POLL_INTERVAL=5000
```

### 4. Network Detection and Fallback

```typescript
// hooks/useNetworkConfig.ts
'use client'

import { useMemo } from 'react'
import { useNetwork } from 'wagmi'
import { environments, config } from '../config/environment'

export function useNetworkConfig() {
  const { chain } = useNetwork()

  const networkConfig = useMemo(() => {
    // Auto-detect environment based on network
    if (chain?.id === 8453) {
      return environments.production
    } else if (chain?.id === 84532) {
      return environments.testnet
    } else {
      return environments.development
    }
  }, [chain])

  const isCorrectNetwork = useMemo(() => {
    return chain?.id === networkConfig.networkId
  }, [chain, networkConfig])

  return {
    config: networkConfig,
    isCorrectNetwork,
    chain,
    switchNetwork: () => {
      // Implement network switching logic
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.request?.({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${networkConfig.networkId.toString(16)}` }],
        })
      }
    },
  }
}
```

### 5. Health Check and Monitoring

```typescript
// hooks/useSubgraphHealth.ts
'use client'

import { useState, useEffect } from 'react'
import { config } from '../config/environment'

interface SubgraphHealth {
  isHealthy: boolean
  latency: number
  lastCheck: Date
  error: string | null
}

export function useSubgraphHealth(pollInterval = 30000): SubgraphHealth {
  const [health, setHealth] = useState<SubgraphHealth>({
    isHealthy: false,
    latency: 0,
    lastCheck: new Date(),
    error: null,
  })

  useEffect(() => {
    const checkHealth = async () => {
      const startTime = Date.now()
      
      try {
        const response = await fetch(config.subgraphUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query HealthCheck {
                _meta {
                  block {
                    number
                    timestamp
                  }
                }
              }
            `,
          }),
        })

        const latency = Date.now() - startTime
        
        if (response.ok) {
          setHealth({
            isHealthy: true,
            latency,
            lastCheck: new Date(),
            error: null,
          })
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
      } catch (error) {
        setHealth(prev => ({
          ...prev,
          isHealthy: false,
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        }))
      }
    }

    // Initial check
    checkHealth()

    // Periodic health checks
    const interval = setInterval(checkHealth, pollInterval)

    return () => clearInterval(interval)
  }, [config.subgraphUrl, pollInterval])

  return health
}
```

### 6. Error Handling and Fallback

```typescript
// hooks/useRobustSubgraph.ts
'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@apollo/client'
import { environments } from '../config/environment'

interface UseRobustSubgraphOptions<T> {
  query: any
  variables?: any
  fallbackData?: T
  maxRetries?: number
}

export function useRobustSubgraph<T>({
  query,
  variables = {},
  fallbackData,
  maxRetries = 3,
}: UseRobustSubgraphOptions<T>) {
  const [currentEndpoint, setCurrentEndpoint] = useState(0)
  const endpoints = [
    environments.production.subgraphUrl,
    environments.testnet.subgraphUrl,
    environments.development.subgraphUrl,
  ].filter(Boolean)

  const { data, loading, error, refetch } = useQuery(query, {
    variables,
    context: {
      uri: endpoints[currentEndpoint],
    },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  })

  const switchEndpoint = useCallback(() => {
    const nextEndpoint = (currentEndpoint + 1) % endpoints.length
    setCurrentEndpoint(nextEndpoint)
  }, [currentEndpoint, endpoints.length])

  const robustRefetch = useCallback(() => {
    // Try current endpoint first
    refetch()
      .catch(() => {
        // If failed, switch to next endpoint
        switchEndpoint()
        setTimeout(() => refetch(), 1000)
      })
  }, [refetch, switchEndpoint])

  return {
    data: data || fallbackData,
    loading,
    error,
    currentEndpoint: endpoints[currentEndpoint],
    switchEndpoint,
    refetch: robustRefetch,
    hasFallback: !!fallbackData,
  }
}
```

---  

---

## 🏗️ Hook Architecture Patterns

### 1. Basic Hook Structure

```typescript
// hooks/useContractData.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@apollo/client'
import { GET_CONTRACT_STATS } from '../queries/contractStats'
import { SUBGRAPH_URL } from '../config/subgraph'

interface UseContractDataReturn {
  data: any | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useContractData(): UseContractDataReturn {
  const { data, loading, error, refetch } = useQuery(GET_CONTRACT_STATS, {
    context: {
      uri: SUBGRAPH_URL,
    },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  })

  return {
    data: data?.contracts?.[0] || null,
    loading,
    error,
    refetch,
  }
}
```

### 2. Advanced Hook with Caching

```typescript
// hooks/useCachedData.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@apollo/client'

interface UseCachedDataOptions<T> {
  query: any
  variables?: any
  cacheKey: string
  staleTime?: number // in milliseconds
}

interface UseCachedDataReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
  isStale: boolean
}

export function useCachedData<T>({
  query,
  variables = {},
  cacheKey,
  staleTime = 30000, // 30 seconds default
}: UseCachedDataOptions<T>): UseCachedDataReturn<T> {
  const [localCache, setLocalCache] = useState<Map<string, { data: T; timestamp: number }>>(new Map())

  const { data, loading, error, refetch, networkStatus } = useQuery(query, {
    variables,
    errorPolicy: 'all',
    fetchPolicy: 'cache-first',
  })

  const getCachedData = useCallback(() => {
    const cached = localCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < staleTime) {
      return cached.data
    }
    return null
  }, [localCache, cacheKey, staleTime])

  const setCachedData = useCallback((newData: T) => {
    setLocalCache(prev => new Map(prev).set(cacheKey, {
      data: newData,
      timestamp: Date.now(),
    }))
  }, [cacheKey])

  useEffect(() => {
    if (data && !loading) {
      setCachedData(data)
    }
  }, [data, loading, setCachedData])

  const effectiveData = data || getCachedData()
  const isStale = !getCachedData() && networkStatus !== 7 // 7 = ready

  return {
    data: effectiveData,
    loading,
    error,
    refetch,
    isStale,
  }
}
```

---

## 📊 Contract Data Hooks

### 1. Contract Statistics Hook

```typescript
// hooks/useContractStats.ts
'use client'

import { useQuery } from '@apollo/client'
import { GET_CONTRACT_STATS } from '../queries/getContractStats'

interface ContractStats {
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

interface UseContractStatsReturn {
  stats: ContractStats | null
  loading: boolean
  error: Error | null
  refetch: () => void
  isPaused: boolean
  formattedStats: {
    totalMinted: number
    totalClaimed: number
    totalDistributed: string
    currentPrice: string
    maxBatch: number
  } | null
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

// Helper function for formatting
function formatEther(value: bigint): string {
  const ethValue = Number(value) / 1e18
  return ethValue.toFixed(6) + ' ETH'
}
```

### 2. Contract State Hook

```typescript
// hooks/useContractState.ts
'use client'

import { useState, useEffect } from 'react'
import { useSubscription } from '@apollo/client'
import { CONTRACT_STATE_CHANGED } from '../subscriptions/contractState'

interface ContractState {
  paused: boolean
  lastChangedBy: string
  lastChangedAt: number
}

interface UseContractStateReturn {
  state: ContractState
  isPaused: boolean
  loading: boolean
}

export function useContractState(): UseContractStateReturn {
  const [state, setState] = useState<ContractState>({
    paused: false,
    lastChangedBy: '',
    lastChangedAt: 0,
  })

  const { data, loading } = useSubscription(CONTRACT_STATE_CHANGED, {
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData?.contractStateChanges?.[0]) {
        const change = subscriptionData.contractStateChanges[0]
        setState(prev => ({
          paused: change.paused,
          lastChangedBy: change.changedBy,
          lastChangedAt: Number(change.timestamp) * 1000,
        }))
      }
    },
  })

  return {
    state,
    isPaused: state.paused,
    loading,
  }
}
```

---

## 👤 User Data Hooks

### 1. User Activity Hook

```typescript
// hooks/useUserActivity.ts
'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@apollo/client'
import { useAccount } from 'wagmi'
import { GET_USER_MINTS, GET_USER_CLAIMS } from '../queries/userActivity'

interface UserActivity {
  mints: MintOperation[]
  claims: PrizeClaim[]
  loading: boolean
  error: Error | null
  refetch: () => void
  loadMore: () => void
  hasMore: boolean
}

interface MintOperation {
  id: string
  buyer: string
  recipient: string
  quantity: string
  totalPrice: string
  timestamp: string
  transactionHash: string
  isAdminMint: boolean
}

interface PrizeClaim {
  id: string
  tokenId: string
  winner: string
  prizeToken: string
  prizeAmount: string
  claimedAt: string
  transactionHash: string
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
```

### 2. User Balance Hook (Hybrid)

```typescript
// hooks/useUserBalance.ts
'use client'

import { useState, useEffect } from 'react'
import { useReadContract } from 'wagmi'
import { useQuery } from '@apollo/client'
import { CONTRACT_ADDRESS, SCRATCH_CARD_NFT_ABI } from '../constants/contracts'
import { GET_USER_TOKENS } from '../queries/getUserTokens'

interface UserBalance {
  currentBalance: number
  ownedTokens: string[]
  totalMinted: number
  totalSpent: string
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useUserBalance(userAddress?: string): UserBalance {
  // Real-time balance from contract
  const { data: contractBalance, isLoading: balanceLoading, error: balanceError } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SCRATCH_CARD_NFT_ABI,
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
    query: {
      enabled: !!userAddress,
      refetchOnWindowFocus: false,
    },
  })

  // Historical data from subgraph
  const { data: subgraphData, loading: subgraphLoading, error: subgraphError, refetch } = useQuery(GET_USER_TOKENS, {
    variables: { userAddress: userAddress?.toLowerCase() || '' },
    skip: !userAddress,
    errorPolicy: 'all',
  })

  const ownedTokens = subgraphData?.tokens?.map((token: any) => token.id) || []
  const totalMinted = subgraphData?.mintOperations?.reduce((sum: number, op: any) => sum + Number(op.quantity), 0) || 0
  const totalSpent = subgraphData?.mintOperations?.reduce((sum: string, op: any) => {
    const sumBigInt = BigInt(sum) + BigInt(op.totalPrice)
    return sumBigInt.toString()
  }, '0') || '0'

  const loading = balanceLoading || subgraphLoading
  const error = balanceError || subgraphError

  return {
    currentBalance: Number(contractBalance || 0),
    ownedTokens,
    totalMinted,
    totalSpent,
    loading,
    error,
    refetch,
  }
}
```

---

## 🔄 Real-time Update Hooks

### 1. Polling Hook

```typescript
// hooks/usePollingData.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@apollo/client'

interface UsePollingDataOptions<T> {
  query: any
  variables?: any
  interval?: number
  enabled?: boolean
}

interface UsePollingDataReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  isPolling: boolean
  startPolling: () => void
  stopPolling: () => void
  refetch: () => void
}

export function usePollingData<T>({
  query,
  variables = {},
  interval = 5000,
  enabled = true,
}: UsePollingDataOptions<T>): UsePollingDataReturn<T> {
  const [isPolling, setIsPolling] = useState(enabled)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const { data, loading, error, refetch, startPolling, stopPolling } = useQuery(query, {
    variables,
    pollInterval: isPolling ? interval : 0,
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  })

  const handleStartPolling = useCallback(() => {
    setIsPolling(true)
    startPolling?.()
  }, [startPolling])

  const handleStopPolling = useCallback(() => {
    setIsPolling(false)
    stopPolling?.()
  }, [stopPolling])

  useEffect(() => {
    setIsPolling(enabled)
  }, [enabled])

  return {
    data: data || null,
    loading,
    error,
    isPolling,
    startPolling: handleStartPolling,
    stopPolling: handleStopPolling,
    refetch,
  }
}
```

### 2. Event Subscription Hook

```typescript
// hooks/useEventSubscription.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSubscription } from '@apollo/client'
import { gql } from '@apollo/client'

interface EventSubscriptionOptions {
  eventName: string
  filters?: Record<string, any>
  onEvent?: (event: any) => void
}

interface UseEventSubscriptionReturn {
  events: any[]
  connected: boolean
  error: Error | null
  clearEvents: () => void
}

export function useEventSubscription({
  eventName,
  filters = {},
  onEvent,
}: EventSubscriptionOptions): UseEventSubscriptionReturn {
  const [events, setEvents] = useState<any[]>([])
  const [connected, setConnected] = useState(false)

  // Create subscription query dynamically
  const subscriptionQuery = gql`
    subscription ${eventName} {
      ${eventName}(
        orderBy: timestamp
        orderDirection: desc
        first: 10
        ${Object.keys(filters).length > 0 ? `where: ${JSON.stringify(filters).replace(/"/g, '')}` : ''}
      ) {
        id
        timestamp
        transactionHash
        ${Object.keys(filters).map(key => key).join('\n        ')}
      }
    }
  `

  const { data, error } = useSubscription(subscriptionQuery, {
    variables: filters,
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData?.[eventName]) {
        const newEvent = subscriptionData[eventName]
        setEvents(prev => [newEvent, ...prev.slice(0, 49)]) // Keep last 50 events
        onEvent?.(newEvent)
      }
    },
    onSubscriptionComplete: () => {
      setConnected(false)
    },
    onSubscriptionError: (error) => {
      setConnected(false)
    },
  })

  useEffect(() => {
    setConnected(!error && data !== undefined)
  }, [error, data])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  return {
    events,
    connected,
    error,
    clearEvents,
  }
}
```

---

## 📈 Pagination Hooks

### 1. Infinite Scroll Hook

```typescript
// hooks/useInfiniteScroll.ts
'use client'

import { useState, useCallback, useRef } from 'react'
import { useQuery } from '@apollo/client'

interface UseInfiniteScrollOptions<T> {
  query: any
  variables?: any
  pageSize?: number
  enabled?: boolean
}

interface UseInfiniteScrollReturn<T> {
  data: T[]
  loading: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => void
  refetch: () => void
}

export function useInfiniteScroll<T>({
  query,
  variables = {},
  pageSize = 20,
  enabled = true,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [allData, setAllData] = useState<T[]>([])
  const [page, setPage] = useState(0)
  const loadingRef = useRef(false)

  const { data, loading, error, fetchMore, refetch } = useQuery(query, {
    variables: {
      ...variables,
      first: pageSize,
      skip: page * pageSize,
    },
    skip: !enabled,
    errorPolicy: 'all',
  })

  const loadMore = useCallback(() => {
    if (loadingRef.current || loading) return

    loadingRef.current = true

    if (fetchMore) {
      fetchMore({
        variables: {
          ...variables,
          first: pageSize,
          skip: (page + 1) * pageSize,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev
          
          const newData = [...(prev?.[Object.keys(prev)[0]] || []), ...(fetchMoreResult?.[Object.keys(fetchMoreResult)[0]] || [])]
          setAllData(newData)
          setPage(prev => prev + 1)
          
          return {
            [Object.keys(prev)[0]]: newData,
          }
        },
      })
    }

    setTimeout(() => {
      loadingRef.current = false
    }, 100)
  }, [fetchMore, page, pageSize, variables])

  useEffect(() => {
    if (data && !loading) {
      const queryKey = Object.keys(data)[0]
      const newData = data[queryKey] || []
      setAllData(prev => page === 0 ? newData : prev)
    }
  }, [data, loading, page])

  const hasMore = data ? Object.values(data)[0]?.length === pageSize : false

  return {
    data: allData,
    loading,
    error,
    hasMore,
    loadMore,
    refetch: () => {
      setPage(0)
      setAllData([])
      refetch?.()
    },
  }
}
```

### 2. Cursor-based Pagination Hook

```typescript
// hooks/useCursorPagination.ts
'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@apollo/client'

interface UseCursorPaginationOptions<T> {
  query: any
  variables?: any
  pageSize?: number
}

interface UseCursorPaginationReturn<T> {
  data: T[]
  loading: boolean
  error: Error | null
  hasNext: boolean
  next: () => void
  prev: () => void
  refetch: () => void
}

export function useCursorPagination<T>({
  query,
  variables = {},
  pageSize = 20,
}: UseCursorPaginationOptions<T>): UseCursorPaginationReturn<T> {
  const [cursor, setCursor] = useState<string | null>(null)
  const [allData, setAllData] = useState<T[]>([])

  const { data, loading, error, refetch } = useQuery(query, {
    variables: {
      ...variables,
      first: pageSize,
      after: cursor,
    },
    errorPolicy: 'all',
  })

  const queryData = data?.[Object.keys(data)[0]] || []
  const edges = queryData.edges || []
  const pageInfo = queryData.pageInfo || {}

  const next = useCallback(() => {
    if (pageInfo.hasNextPage && pageInfo.endCursor) {
      setCursor(pageInfo.endCursor)
    }
  }, [pageInfo])

  const prev = useCallback(() => {
    // Implement previous cursor logic if needed
    setCursor(null)
  }, [])

  useEffect(() => {
    if (edges.length > 0) {
      const newData = edges.map((edge: any) => edge.node)
      setAllData(prev => cursor ? [...prev, ...newData] : newData)
    }
  }, [edges, cursor])

  return {
    data: allData,
    loading,
    error,
    hasNext: pageInfo.hasNextPage || false,
    next,
    prev,
    refetch: () => {
      setCursor(null)
      setAllData([])
      refetch?.()
    },
  }
}
```

---

## 🛡️ Error Handling Hooks

### 1. Retry Hook

```typescript
// hooks/useRetryQuery.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@apollo/client'

interface UseRetryQueryOptions<T> {
  query: any
  variables?: any
  maxRetries?: number
  retryDelay?: number
}

interface UseRetryQueryReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  retryCount: number
  retry: () => void
}

export function useRetryQuery<T>({
  query,
  variables = {},
  maxRetries = 3,
  retryDelay = 1000,
}: UseRetryQueryOptions<T>): UseRetryQueryReturn<T> {
  const [retryCount, setRetryCount] = useState(0)

  const { data, loading, error, refetch } = useQuery(query, {
    variables,
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  })

  const retry = useCallback(() => {
    setRetryCount(0)
    refetch()
  }, [refetch])

  useEffect(() => {
    if (error && retryCount < maxRetries) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1)
        refetch()
      }, retryDelay * Math.pow(2, retryCount)) // Exponential backoff

      return () => clearTimeout(timer)
    }
  }, [error, retryCount, maxRetries, retryDelay, refetch])

  return {
    data: data || null,
    loading,
    error,
    retryCount,
    retry,
  }
}
```

### 2. Error Boundary Hook

```typescript
// hooks/useErrorBoundary.ts
'use client'

import { useState, useCallback } from 'react'

interface ErrorState {
  hasError: boolean
  error: Error | null
  errorInfo: any
}

interface UseErrorBoundaryReturn {
  errorState: ErrorState
  resetError: () => void
  captureError: (error: Error, errorInfo?: any) => void
}

export function useErrorBoundary(): UseErrorBoundaryReturn {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    errorInfo: null,
  })

  const resetError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }, [])

  const captureError = useCallback((error: Error, errorInfo?: any) => {
    console.error('Subgraph Error:', error, errorInfo)
    setErrorState({
      hasError: true,
      error,
      errorInfo,
    })
  }, [])

  return {
    errorState,
    resetError,
    captureError,
  }
}
```

---

## 📊 Analytics Hooks

### 1. User Stats Hook

```typescript
// hooks/useUserStats.ts
'use client'

import { useMemo } from 'react'
import { useUserActivity } from './useUserActivity'

interface UserStats {
  totalMinted: number
  totalSpent: string
  totalWon: string
  averageCardPrice: string
  winRate: number
  lastActivity: Date | null
}

export function useUserStats(userAddress?: string): UserStats {
  const { mints, claims } = useUserActivity(userAddress)

  const stats = useMemo(() => {
    const totalMinted = mints.reduce((sum, mint) => sum + Number(mint.quantity), 0)
    const totalSpent = mints.reduce((sum, mint) => {
      return BigInt(sum) + BigInt(mint.totalPrice)
    }, BigInt(0))
    const totalWon = claims.reduce((sum, claim) => {
      return BigInt(sum) + BigInt(claim.prizeAmount)
    }, BigInt(0))
    
    const averageCardPrice = totalMinted > 0 ? totalSpent / BigInt(totalMinted) : BigInt(0)
    const winRate = totalMinted > 0 ? (claims.length / totalMinted) * 100 : 0
    
    const allTimestamps = [
      ...mints.map(m => Number(m.timestamp)),
      ...claims.map(c => Number(c.claimedAt))
    ]
    const lastActivity = allTimestamps.length > 0 
      ? new Date(Math.max(...allTimestamps) * 1000) 
      : null

    return {
      totalMinted,
      totalSpent: formatEther(totalSpent),
      totalWon: formatEther(totalWon),
      averageCardPrice: formatEther(averageCardPrice),
      winRate: Math.round(winRate * 100) / 100,
      lastActivity,
    }
  }, [mints, claims])

  return stats
}

function formatEther(value: bigint): string {
  const ethValue = Number(value) / 1e18
  return ethValue.toFixed(6)
}
```

### 2. Contract Analytics Hook

```typescript
// hooks/useContractAnalytics.ts
'use client'

import { useMemo } from 'react'
import { useContractStats } from './useContractStats'
import { useQuery } from '@apollo/client'
import { GET_RECENT_ACTIVITY } from '../queries/getRecentActivity'

interface ContractAnalytics {
  dailyMints: Array<{ date: string; count: number }>
  dailyClaims: Array<{ date: string; count: number }>
  topMinters: Array<{ address: string; count: number; totalSpent: string }>
  revenueMetrics: {
    daily: Array<{ date: string; revenue: string }>
    weekly: Array<{ week: string; revenue: string }>
    monthly: Array<{ month: string; revenue: string }>
  }
}

export function useContractAnalytics(days = 30): ContractAnalytics {
  const { stats } = useContractStats()
  
  const { data: recentActivity } = useQuery(GET_RECENT_ACTIVITY, {
    variables: { days },
    errorPolicy: 'all',
  })

  const analytics = useMemo(() => {
    const mints = recentActivity?.mintOperations || []
    const claims = recentActivity?.prizeClaims || []

    // Daily mints and claims
    const dailyMints = groupByDay(mints, 'timestamp')
    const dailyClaims = groupByDay(claims, 'claimedAt')

    // Top minters
    const minterStats = mints.reduce((acc, mint) => {
      const address = mint.buyer
      if (!acc[address]) {
        acc[address] = { count: 0, totalSpent: BigInt(0) }
      }
      acc[address].count += 1
      acc[address].totalSpent += BigInt(mint.totalPrice)
      return acc
    }, {} as Record<string, { count: number; totalSpent: bigint }>)

    const topMinters = Object.entries(minterStats)
      .map(([address, stats]) => ({
        address,
        count: stats.count,
        totalSpent: formatEther(stats.totalSpent),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Revenue metrics
    const revenueMetrics = calculateRevenueMetrics(mints)

    return {
      dailyMints,
      dailyClaims,
      topMinters,
      revenueMetrics,
    }
  }, [recentActivity])

  return analytics
}

function groupByDay(items: any[], timestampField: string) {
  const grouped = items.reduce((acc, item) => {
    const date = new Date(Number(item[timestampField]) * 1000).toISOString().split('T')[0]
    if (!acc[date]) acc[date] = 0
    acc[date] += 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(grouped).map(([date, count]) => ({ date, count }))
}

function calculateRevenueMetrics(mints: any[]) {
  // Implementation for daily, weekly, monthly revenue calculations
  // This would group mints by time periods and sum totalPrice
  return {
    daily: [],
    weekly: [],
    monthly: [],
  }
}
```

---

## 🎯 Usage Examples

### 1. Basic Usage

```typescript
// app/page.tsx
'use client'

import { useContractStats, useUserActivity } from '../hooks'

export default function Home() {
  const { stats, loading: statsLoading } = useContractStats()
  const { mints, loading: activityLoading } = useUserActivity()

  if (statsLoading || activityLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Contract Stats</h1>
      <p>Total Minted: {stats?.totalTokensMinted}</p>
      <p>Total Prizes: {stats?.totalPrizesClaimed}</p>
      
      <h2>Your Activity</h2>
      <p>Your Mints: {mints.length}</p>
    </div>
  )
}
```

### 2. Advanced Usage with Error Handling

```typescript
// components/Dashboard.tsx
'use client'

import { useContractStats, useErrorBoundary } from '../hooks'

export function Dashboard() {
  const { stats, loading, error } = useContractStats()
  const { errorState, resetError } = useErrorBoundary()

  if (errorState.hasError) {
    return (
      <div>
        <h2>Something went wrong</h2>
        <p>{errorState.error?.message}</p>
        <button onClick={resetError}>Try Again</button>
      </div>
    )
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {/* Render dashboard with stats */}
    </div>
  )
}
```

### 3. Real-time Updates

```typescript
// components/LiveActivity.tsx
'use client'

import { useEventSubscription } from '../hooks'

export function LiveActivity() {
  const { events, connected } = useEventSubscription({
    eventName: 'mintOperations',
    onEvent: (event) => {
      console.log('New mint:', event)
    },
  })

  return (
    <div>
      <h2>Live Activity</h2>
      <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>
      <div>
        {events.slice(0, 5).map((event, index) => (
          <div key={`${event.id}-${index}`}>
            <p>Mint: {event.quantity} cards</p>
            <p>By: {event.buyer}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 📋 Implementation Checklist

### Hook Development
- [ ] Set up basic query hooks
- [ ] Add error handling and retry logic
- [ ] Implement caching strategies
- [ ] Add pagination support
- [ ] Create real-time update hooks
- [ ] Build analytics hooks
- [ ] Add TypeScript types
- [ ] Write comprehensive tests

### Performance Optimization
- [ ] Implement query debouncing
- [ ] Add request deduplication
- [ ] Use appropriate caching policies
- [ ] Optimize re-renders with useMemo
- [ ] Add loading state management
- [ ] Implement error boundaries

### Testing
- [ ] Unit tests for all hooks
- [ ] Integration tests with mock data
- [ ] Error scenario testing
- [ ] Performance testing
- [ ] Accessibility testing

---

This hooks-focused guide provides production-ready patterns for integrating with the ScratchCardNFT subgraph. Each hook is designed to be reusable, performant, and easy to test! 🚀