'use client';

import { MiniAppProvider } from '@neynar/react';
import { ApolloProvider } from '@apollo/client/react/context';
import { ANALYTICS_ENABLED } from '~/lib/constants';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '~/lib/wagmi';
import { apolloClient } from '~/lib/apollo-client';

const queryClient = new QueryClient();

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ApolloProvider client={apolloClient}>
          <MiniAppProvider
            analyticsEnabled={ANALYTICS_ENABLED}
            backButtonEnabled={true}
          >
            {children}
          </MiniAppProvider>
        </ApolloProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
