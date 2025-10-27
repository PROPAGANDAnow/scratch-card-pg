# Frontend Subgraph Integration Guide

## 📋 Overview

This guide provides a simplified, step-by-step approach for integrating the ScratchCardNFT subgraph into your frontend application. The subgraph provides real-time indexing of contract events and enables efficient GraphQL queries for your dApp.

## 🎯 What This Guide Covers

✅ **Subgraph Basics**: Understanding what the subgraph indexes and why it's useful  
✅ **GraphQL Setup**: Setting up GraphQL client and queries  
✅ **React Integration**: Using subgraph data in React components  
✅ **Real-time Updates**: Listening for subgraph updates  
✅ **Performance Tips**: Optimizing subgraph queries  

---

## 🏗️ Subgraph Architecture Overview

### What Gets Indexed

The subgraph indexes these key events from your ScratchCardNFT contract:

1. **CardsMinted** - When users mint scratch cards
2. **PrizeClaimed** - When users claim prizes  
3. **ContractStateChanged** - When contract is paused/unpaused
4. **PriceUpdated** - When card prices change
5. **GameFunded** - When contract receives funding

### Why Use Subgraph?

**Without Subgraph:**
- Direct contract calls for historical data
- Slow and expensive RPC queries
- Limited pagination options
- Manual event filtering

**With Subgraph:**
- Fast GraphQL queries
- Built-in pagination
- Real-time event indexing
- Efficient data relationships

---

## 🛠️ Setup & Configuration

### 1. Install Dependencies

```bash
npm install @apollo/client graphql
# or
npm install @urql/core graphql
# or
npm install graphql-request graphql
```

### 2. GraphQL Client Setup

#### Using Apollo Client (Recommended)

```typescript
// lib/apollo-client.ts
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'

const httpLink = createHttpLink({
  uri: 'https://api.studio.thegraph.com/query/YOUR_SUBGRAPH_ID', // Replace with your subgraph URL
})

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
})
```

#### Using Simple GraphQL Request

```typescript
// lib/graphql-client.ts
import { GraphQLClient } from 'graphql-request'

export const graphqlClient = new GraphQLClient(
  'https://api.studio.thegraph.com/query/YOUR_SUBGRAPH_ID' // Replace with your subgraph URL
)
```

### 3. Provider Setup (for Apollo)

```typescript
// app/providers.tsx
'use client'

import { ApolloProvider } from '@apollo/client'
import { apolloClient } from '../lib/apollo-client'

export function GraphQLProvider({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      {children}
    </ApolloProvider>
  )
}
```

---

## 📊 GraphQL Queries

### 1. Get Contract Statistics

```graphql
# queries/getContractStats.graphql
query GetContractStats {
  contracts(first: 1) {
    id
    totalTokensMinted
    totalPrizesClaimed
    totalPrizesDistributed
    cardPrice
    paused
    paymentToken
    maxBatchSize
  }
}
```

### 2. Get User's Minted Cards

```graphql
# queries/getUserMints.graphql
query GetUserMints($userAddress: Bytes!) {
  mintOperations(
    where: { buyer: $userAddress }
    orderBy: timestamp
    orderDirection: desc
    first: 50
  ) {
    id
    buyer
    recipient
    quantity
    totalPrice
    timestamp
    transactionHash
    blockNumber
    isAdminMint
  }
}
```

### 3. Get User's Prize Claims

```graphql
# queries/getUserClaims.graphql
query GetUserClaims($userAddress: Bytes!) {
  prizeClaims(
    where: { winner: $userAddress }
    orderBy: claimedAt
    orderDirection: desc
    first: 50
  ) {
    id
    tokenId
    winner
    prizeToken
    prizeAmount
    claimedAt
    claimedAtBlock
    transactionHash
    blockNumber
  }
}
```

### 4. Get Recent Activity (All Users)

```graphql
# queries/getRecentActivity.graphql
query GetRecentActivity {
  mintOperations(
    orderBy: timestamp
    orderDirection: desc
    first: 10
  ) {
    id
    buyer
    quantity
    totalPrice
    timestamp
    transactionHash
  }
  
  prizeClaims(
    orderBy: claimedAt
    orderDirection: desc
    first: 10
  ) {
    id
    tokenId
    winner
    prizeAmount
    claimedAt
    transactionHash
  }
}
```

### 5. Get Contract State Changes

```graphql
# queries/getStateChanges.graphql
query GetStateChanges {
  contractStateChanges(
    orderBy: timestamp
    orderDirection: desc
    first: 20
  ) {
    id
    paused
    changedBy
    timestamp
    transactionHash
    blockNumber
  }
}
```

---

## ⚛️ React Integration Examples

### 1. Contract Statistics Hook

```typescript
// hooks/useContractStats.ts
'use client'

import { useQuery } from '@apollo/client'
import { GET_CONTRACT_STATS } from '../queries/getContractStats'

interface ContractStats {
  totalTokensMinted: string
  totalPrizesClaimed: string
  totalPrizesDistributed: string
  cardPrice: string
  paused: boolean
  paymentToken: string
  maxBatchSize: string
}

export function useContractStats() {
  const { data, loading, error } = useQuery(GET_CONTRACT_STATS)

  return {
    stats: data?.contracts?.[0] as ContractStats | null,
    loading,
    error,
  }
}
```

### 2. User Activity Hook

```typescript
// hooks/useUserActivity.ts
'use client'

import { useQuery } from '@apollo/client'
import { GET_USER_MINTS, GET_USER_CLAIMS } from '../queries'
import { useAccount } from 'wagmi'

export function useUserActivity() {
  const { address } = useAccount()

  const { data: mintsData, loading: mintsLoading } = useQuery(GET_USER_MINTS, {
    variables: { userAddress: address?.toLowerCase() || '' },
    skip: !address,
  })

  const { data: claimsData, loading: claimsLoading } = useQuery(GET_USER_CLAIMS, {
    variables: { userAddress: address?.toLowerCase() || '' },
    skip: !address,
  })

  return {
    mints: mintsData?.mintOperations || [],
    claims: claimsData?.prizeClaims || [],
    loading: mintsLoading || claimsLoading,
  }
}
```

### 3. Real-time Updates Hook

```typescript
// hooks/useRealtimeUpdates.ts
'use client'

import { useSubscription } from '@apollo/client'
import { gql } from '@apollo/client'

const MINT_SUBSCRIPTION = gql`
  subscription OnMint {
    mintOperations(orderBy: timestamp, orderDirection: desc, first: 1) {
      id
      buyer
      quantity
      totalPrice
      timestamp
      transactionHash
    }
  }
`

export function useRealtimeUpdates() {
  const { data, loading } = useSubscription(MINT_SUBSCRIPTION)

  return {
    latestMint: data?.mintOperations?.[0],
    loading,
  }
}
```

---

## 🎨 Component Examples

### 1. Contract Stats Display

```typescript
// components/ContractStats.tsx
'use client'

import { useContractStats } from '../hooks/useContractStats'
import { formatEther, formatUnits } from 'viem'

export function ContractStats() {
  const { stats, loading } = useContractStats()

  if (loading) return <div>Loading stats...</div>
  if (!stats) return <div>No stats available</div>

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500">Total Minted</h3>
        <p className="text-2xl font-bold text-blue-600">
          {stats.totalTokensMinted}
        </p>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500">Prizes Claimed</h3>
        <p className="text-2xl font-bold text-green-600">
          {stats.totalPrizesClaimed}
        </p>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500">Total Distributed</h3>
        <p className="text-2xl font-bold text-purple-600">
          {formatEther(BigInt(stats.totalPrizesDistributed))} ETH
        </p>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500">Card Price</h3>
        <p className="text-2xl font-bold text-orange-600">
          {formatEther(BigInt(stats.cardPrice))} ETH
        </p>
      </div>
    </div>
  )
}
```

### 2. User Activity Feed

```typescript
// components/UserActivity.tsx
'use client'

import { useUserActivity } from '../hooks/useUserActivity'
import { formatEther } from 'viem'
import { formatDistanceToNow } from 'date-fns'

export function UserActivity() {
  const { mints, claims, loading } = useUserActivity()

  if (loading) return <div>Loading activity...</div>

  const allActivity = [...mints, ...claims]
    .sort((a, b) => 
      new Date(Number(b.timestamp) * 1000).getTime() - 
      new Date(Number(a.timestamp) * 1000).getTime()
    )

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Your Activity</h2>
      
      {allActivity.length === 0 ? (
        <p className="text-gray-500">No activity yet</p>
      ) : (
        <div className="space-y-3">
          {allActivity.map((activity) => {
            const isMint = 'quantity' in activity
            const date = new Date(Number(activity.timestamp) * 1000)
            
            return (
              <div key={activity.id} className="bg-white p-4 rounded-lg shadow border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {isMint ? 'Minted Cards' : 'Claimed Prize'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(date, { addSuffix: true })}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    {isMint ? (
                      <div>
                        <p className="font-medium">
                          {activity.quantity} cards
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatEther(BigInt(activity.totalPrice))} ETH
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-green-600">
                          Prize Won!
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatEther(BigInt(activity.prizeAmount))} ETH
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-2">
                  <a
                    href={`https://basescan.org/tx/${activity.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    View on Basescan →
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

### 3. Recent Global Activity

```typescript
// components/RecentActivity.tsx
'use client'

import { useQuery } from '@apollo/client'
import { GET_RECENT_ACTIVITY } from '../queries/getRecentActivity'
import { formatEther } from 'viem'
import { formatDistanceToNow } from 'date-fns'

export function RecentActivity() {
  const { data, loading } = useQuery(GET_RECENT_ACTIVITY)

  if (loading) return <div>Loading recent activity...</div>

  const recentMints = data?.mintOperations || []
  const recentClaims = data?.prizeClaims || []

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-3">Recent Mints</h3>
        <div className="space-y-2">
          {recentMints.map((mint) => (
            <div key={mint.id} className="bg-blue-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {mint.buyer.slice(0, 6)}...{mint.buyer.slice(-4)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Minted {mint.quantity} cards
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {formatEther(BigInt(mint.totalPrice))} ETH
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(
                      new Date(Number(mint.timestamp) * 1000),
                      { addSuffix: true }
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-3">Recent Claims</h3>
        <div className="space-y-2">
          {recentClaims.map((claim) => (
            <div key={claim.id} className="bg-green-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {claim.winner.slice(0, 6)}...{claim.winner.slice(-4)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Token #{claim.tokenId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">
                    {formatEther(BigInt(claim.prizeAmount))} ETH
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(
                      new Date(Number(claim.claimedAt) * 1000),
                      { addSuffix: true }
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

## 🔄 Real-time Updates

### 1. Polling Strategy

```typescript
// hooks/usePollingUpdates.ts
'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@apollo/client'
import { GET_CONTRACT_STATS } from '../queries/getContractStats'

export function usePollingUpdates(pollInterval = 5000) {
  const { data, refetch } = useQuery(GET_CONTRACT_STATS, {
    pollInterval,
    notifyOnNetworkStatusChange: true,
  })

  return {
    stats: data?.contracts?.[0],
    refetch,
  }
}
```

### 2. Event-based Updates

```typescript
// hooks/useEventUpdates.ts
'use client'

import { useEffect } from 'react'
import { useSubscription } from '@apollo/client'
import { gql } from '@apollo/client'

const MINT_EVENT_SUBSCRIPTION = gql`
  subscription OnMint {
    mintOperations(
      orderBy: timestamp
      orderDirection: desc
      first: 1
    ) {
      id
      buyer
      quantity
      totalPrice
      timestamp
      transactionHash
    }
  }
`

export function useEventUpdates(onNewMint: (mint: any) => void) {
  const { data } = useSubscription(MINT_EVENT_SUBSCRIPTION)

  useEffect(() => {
    if (data?.mintOperations?.[0]) {
      onNewMint(data.mintOperations[0])
    }
  }, [data, onNewMint])
}
```

---

## 📈 Performance Optimization

### 1. Query Optimization

```typescript
// Good: Specific fields only
const GET_USER_MINTS_OPTIMIZED = gql`
  query GetUserMints($userAddress: Bytes!, $first: Int!) {
    mintOperations(
      where: { buyer: $userAddress }
      orderBy: timestamp
      orderDirection: desc
      first: $first
    ) {
      id
      quantity
      totalPrice
      timestamp
      transactionHash
    }
  }
`

// Bad: Fetching all fields
const GET_USER_MINTS_SLOW = gql`
  query GetUserMints($userAddress: Bytes!) {
    mintOperations(where: { buyer: $userAddress }) {
      id
      buyer
      recipient
      contract
      batchId
      tokenIds
      quantity
      totalPrice
      timestamp
      transactionHash
      blockNumber
      isAdminMint
    }
  }
`
```

### 2. Pagination Implementation

```typescript
// hooks/usePaginatedMints.ts
'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@apollo/client'
import { GET_USER_MINTS } from '../queries/getUserMints'

export function usePaginatedMints(userAddress: string) {
  const [page, setPage] = useState(0)
  const pageSize = 20

  const { data, loading, fetchMore } = useQuery(GET_USER_MINTS, {
    variables: {
      userAddress,
      first: pageSize,
      skip: page * pageSize,
    },
  })

  const loadMore = useCallback(() => {
    if (fetchMore) {
      fetchMore({
        variables: {
          skip: (page + 1) * pageSize,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev
          
          return {
            mintOperations: [
              ...prev.mintOperations,
              ...fetchMoreResult.mintOperations,
            ],
          }
        },
      })
      setPage(page + 1)
    }
  }, [fetchMore, page])

  return {
    mints: data?.mintOperations || [],
    loading,
    loadMore,
    hasMore: data?.mintOperations?.length === pageSize,
  }
}
```

### 3. Caching Strategy

```typescript
// lib/apollo-cache.ts
import { InMemoryCache, makeVar } from '@apollo/client'

export const contractStatsVar = makeVar<any>(null)

export const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        contractStats: {
          read() {
            return contractStatsVar()
          },
        },
      },
    },
  },
})
```

---

## 🔧 Advanced Integration

### 1. Combining On-chain and Subgraph Data

```typescript
// hooks/useHybridData.ts
'use client'

import { useReadContract } from 'wagmi'
import { useQuery } from '@apollo/client'
import { CONTRACT_ADDRESS, SCRATCH_CARD_NFT_ABI } from '../constants/contracts'

export function useHybridUserData(userAddress: string) {
  // Real-time data from contract
  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SCRATCH_CARD_NFT_ABI,
    functionName: 'balanceOf',
    args: [userAddress as Address],
  })

  // Historical data from subgraph
  const { data: subgraphData } = useQuery(GET_USER_ACTIVITY, {
    variables: { userAddress: userAddress.toLowerCase() },
  })

  return {
    currentBalance: balance,
    historicalActivity: subgraphData,
  }
}
```

### 2. Error Handling & Retry Logic

```typescript
// hooks/useRobustQuery.ts
'use client'

import { useQuery } from '@apollo/client'
import { useEffect, useState } from 'react'

export function useRobustQuery(query, variables, options = {}) {
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  const { data, loading, error, refetch } = useQuery(query, {
    variables,
    errorPolicy: 'all',
    ...options,
  })

  useEffect(() => {
    if (error && retryCount < maxRetries) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1)
        refetch()
      }, Math.pow(2, retryCount) * 1000) // Exponential backoff
      
      return () => clearTimeout(timer)
    }
  }, [error, retryCount, refetch])

  return {
    data,
    loading,
    error,
    retryCount,
    refetch: () => {
      setRetryCount(0)
      refetch()
    },
  }
}
```

---

## 📱 Mobile Considerations

### 1. Responsive Data Display

```typescript
// components/ResponsiveActivity.tsx
'use client'

import { useMediaQuery } from '../hooks/useMediaQuery'
import { UserActivity } from './UserActivity'
import { CompactActivity } from './CompactActivity'

export function ResponsiveActivity() {
  const isMobile = useMediaQuery('(max-width: 768px)')

  return isMobile ? <CompactActivity /> : <UserActivity />
}
```

### 2. Touch-friendly Interactions

```typescript
// components/MobileActivityCard.tsx
'use client'

export function MobileActivityCard({ activity }) {
  return (
    <div className="touch-manipulation">
      <div className="min-h-[44px] min-w-[44px] p-4">
        {/* Activity content */}
      </div>
    </div>
  )
}
```

---

## 🧪 Testing Subgraph Integration

### 1. Mock GraphQL Responses

```typescript
// __tests__/mocks/subgraph.ts
export const mockContractStats = {
  contracts: [{
    id: '0x...',
    totalTokensMinted: '1000',
    totalPrizesClaimed: '250',
    totalPrizesDistributed: '500000000000000000000',
    cardPrice: '1000000000000000',
    paused: false,
  }],
}

export const mockUserMints = {
  mintOperations: [{
    id: '1',
    buyer: '0x...',
    quantity: '5',
    totalPrice: '5000000000000000',
    timestamp: '1698451200',
    transactionHash: '0x...',
  }],
}
```

### 2. Component Testing

```typescript
// __tests__/components/ContractStats.test.tsx
import { render, screen } from '@testing-library/react'
import { MockedProvider } from 'wagmi'
import { ContractStats } from '../../components/ContractStats'
import { mockContractStats } from '../mocks/subgraph'

describe('ContractStats', () => {
  it('displays contract statistics', () => {
    render(
      <MockedProvider>
        <ContractStats />
      </MockedProvider>
    )

    expect(screen.getByText('Total Minted')).toBeInTheDocument()
    expect(screen.getByText('1000')).toBeInTheDocument()
  })
})
```

---

## 📋 Implementation Checklist

### Phase 1: Basic Setup
- [ ] Install GraphQL client dependencies
- [ ] Set up Apollo/GraphQL client
- [ ] Configure subgraph endpoint
- [ ] Create basic queries
- [ ] Test connection to subgraph

### Phase 2: Component Integration
- [ ] Create contract stats component
- [ ] Build user activity feed
- [ ] Add recent global activity
- [ ] Implement error handling
- [ ] Add loading states

### Phase 3: Advanced Features
- [ ] Add real-time updates
- [ ] Implement pagination
- [ ] Add caching strategies
- [ ] Optimize query performance
- [ ] Add mobile responsiveness

### Phase 4: Testing & Polish
- [ ] Write unit tests
- [ ] Test error scenarios
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Production deployment

---

## 🔗 Useful Resources

### Subgraph Documentation
- [The Graph Docs](https://thegraph.com/docs/)
- [GraphQL Queries](https://thegraph.com/docs/en/querying/graphql-api)
- [Subgraph Studio](https://thegraph.com/studio/)

### Frontend Libraries
- [Apollo Client](https://www.apollographql.com/docs/react/)
- [URQL](https://formidable.com/open-source/urql/docs/)
- [GraphQL Request](https://github.com/jasonkuhrt/graphql-request)

### React Integration
- [Wagmi Documentation](https://wagmi.sh/)
- [Viem Documentation](https://viem.sh/)
- [React Query](https://tanstack.com/query/latest)

---

## 🎯 Quick Start Example

```typescript
// app/page.tsx
'use client'

import { GraphQLProvider } from '../providers'
import { ContractStats } from '../components/ContractStats'
import { RecentActivity } from '../components/RecentActivity'

export default function Home() {
  return (
    <GraphQLProvider>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Scratch Card NFT</h1>
        
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Contract Statistics</h2>
          <ContractStats />
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
          <RecentActivity />
        </section>
      </main>
    </GraphQLProvider>
  )
}
```

---

This guide provides a comprehensive yet simplified approach to integrating the ScratchCardNFT subgraph into your frontend. Start with the basic setup and gradually add advanced features as needed. The subgraph will significantly improve your dApp's performance and user experience! 🚀