import { gql, request } from 'graphql-request'

// Subgraph configuration
export const SUBGRAPH_CONFIG = {
  // Production URL from The Graph (Base network)
  url: process.env.NEXT_PUBLIC_SUBGRAPH_URL || 'https://gateway.thegraph.com/api/subgraphs/id/Go4V8UMVoFXFSoRsMHpFVmdQD9dcFDQojWzxNFZUmxTp',

  // Development URL from The Graph Studio
  devUrl: 'https://api.studio.thegraph.com/query/89373/scratch-card-pg/version/latest',

  // Authentication token for The Graph Studio
  authToken: process.env.SUBGRAPH_API_KEY,

  // Local development fallback
  localUrl: 'http://localhost:8000/subgraphs/name/scratch-card-nft/graphql',
} as const

// Get the appropriate URL based on environment
export const getSubgraphUrl = () => {
  // Use production URL by default
  if (process.env.NEXT_PUBLIC_SUBGRAPH_URL) {
    return process.env.NEXT_PUBLIC_SUBGRAPH_URL
  }
  
  // For development, you can switch to devUrl
  if (process.env.NODE_ENV === 'development') {
    return SUBGRAPH_CONFIG.devUrl
  }
  
  return SUBGRAPH_CONFIG.url
}

// Get headers for GraphQL requests
export const getSubgraphHeaders = () => {
  const headers: Record<string, string> = {}

  if (SUBGRAPH_CONFIG.authToken) {
    headers['Authorization'] = `Bearer ${SUBGRAPH_CONFIG.authToken}`
  }

  return headers
}

// Generic GraphQL request function with error handling
export async function makeGraphQLRequest<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  try {
    const url = getSubgraphUrl()
    const headers = getSubgraphHeaders()

    const data = await request<T>(url, query, variables, headers)
    return data
  } catch (error) {
    console.error('GraphQL Request Error:', error)

    // If it's a network error, try the fallback URL
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.log('Trying fallback URL...')
      try {
        const fallbackData = await request<T>(
          SUBGRAPH_CONFIG.localUrl,
          query,
          variables,
          getSubgraphHeaders()
        )
        return fallbackData
      } catch (fallbackError) {
        console.error('Fallback URL also failed:', fallbackError)
      }
    }

    throw error
  }
}

// Export gql for use in query files
export { gql }