import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'

// Subgraph endpoints - replace with your actual subgraph URL
const SUBGRAPH_ENDPOINTS = {
  // The Graph Studio (Recommended for production)
  studio: process.env.NEXT_PUBLIC_SUBGRAPH_URL || 'https://api.studio.thegraph.com/query/YOUR_SUBGRAPH_ID',
  
  // The Graph Hosted Service (Fallback)
  hosted: 'https://api.thegraph.com/subgraphs/name/YOUR_GITHUB_USERNAME/scratch-card-nft',
  
  // Local Development
  local: 'http://localhost:8000/subgraphs/name/scratch-card-nft/graphql',
} as const

// Current active endpoint based on environment
const getSubgraphUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return SUBGRAPH_ENDPOINTS.local
  }
  return SUBGRAPH_ENDPOINTS.studio
}

const httpLink = createHttpLink({
  uri: getSubgraphUrl(),
  headers: {
    // Optional: Add authentication headers if required
    // 'Authorization': `Bearer ${process.env.SUBGRAPH_API_KEY}`,
  },
})

// Cache configuration with type policies for optimal performance
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Cache contract stats with merge strategy
        contracts: {
          merge(existing, incoming) {
            return incoming
          },
        },
        // Cache user activity with pagination support
        mintOperations: {
          keyArgs: ['userAddress'],
          merge(existing, incoming, { args }) {
            const existingOps = existing?.[args?.userAddress] || []
            const incomingOps = incoming?.mintOperations || []
            return [...existingOps, ...incomingOps]
          },
        },
        prizeClaims: {
          keyArgs: ['userAddress'],
          merge(existing, incoming, { args }) {
            const existingClaims = existing?.[args?.userAddress] || []
            const incomingClaims = incoming?.prizeClaims || []
            return [...existingClaims, ...incomingClaims]
          },
        },
      },
    },
  },
})

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache,
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

// Environment-specific client creation
export const createApolloClient = (endpoint: string) => {
  return new ApolloClient({
    link: createHttpLink({ uri: endpoint }),
    cache: new InMemoryCache(),
  })
}

export { SUBGRAPH_ENDPOINTS }