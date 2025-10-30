// Subgraph Integration Demo Page
// This page demonstrates the full integration with The Graph subgraph

import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { gql, request } from 'graphql-request';
import Data from '~/components/Data';

const query = gql`
  {
    contracts(first: 5) {
      id
      owner
      signerAddress
      paymentToken
    }
    users(first: 5) {
      id
      totalTokensOwned
      totalSpent
      totalPrizesWon
    }
  }
`;

const url = 'https://gateway.thegraph.com/api/subgraphs/id/Go4V8UMVoFXFSoRsMHpFVmdQD9dcFDQojWzxNFZUmxTp';
const headers = { Authorization: 'Bearer ••••••••••••••••••••••••••••••••' };

export default async function SubgraphDemoPage() {
  const queryClient = new QueryClient();
  
  await queryClient.prefetchQuery({
    queryKey: ['subgraph-data'],
    async queryFn() {
      return await request(url, query, {}, headers);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Subgraph Integration Demo
        </h1>
        
        <HydrationBoundary state={dehydrate(queryClient)}>
          <SubgraphData />
        </HydrationBoundary>
      </div>
    </div>
  );
}

// Client component to display the data
function SubgraphData() {
  return (
    <div className="space-y-8">
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Live Subgraph Data</h2>
        <p className="text-white/60 mb-4">
          This data is fetched from the Scratch Card subgraph on Base network.
        </p>
        <Data />
      </div>
      
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Subgraph Configuration</h2>
        <div className="space-y-2 text-white/80">
          <p><strong>Network:</strong> Base</p>
          <p><strong>Subgraph ID:</strong> Go4V8UMVoFXFSoRsMHpFVmdQD9dcFDQojWzxNFZUmxTp</p>
          <p><strong>Status:</strong> Published</p>
          <p><strong>Version:</strong> 0.1.1</p>
        </div>
      </div>
    </div>
  );
}