import { GraphQLClient } from 'graphql-request';
import { SUBGRAPH_CONFIG } from './graphql-client';

// Create a GraphQL client instance for the subgraph
export const subgraphClient = new GraphQLClient(
  SUBGRAPH_CONFIG.url,
  {
    headers: SUBGRAPH_CONFIG.authToken ? {
      Authorization: `Bearer ${SUBGRAPH_CONFIG.authToken}`
    } : {}
  }
);

// Alternative client for local development
export const localSubgraphClient = new GraphQLClient(
  SUBGRAPH_CONFIG.localUrl,
  {
    headers: SUBGRAPH_CONFIG.authToken ? {
      Authorization: `Bearer ${SUBGRAPH_CONFIG.authToken}`
    } : {}
  }
);

// Function to get the appropriate client based on environment
export function getSubgraphClient() {
  // For now, use the main client
  // Add logic here to switch between main and local clients if needed
  return subgraphClient;
}