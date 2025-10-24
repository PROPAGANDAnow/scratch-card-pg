'use client';

import { MiniAppProvider } from '@neynar/react';
import { ANALYTICS_ENABLED } from '~/lib/constants';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '~/lib/wagmi';

const queryClient = new QueryClient();

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MiniAppProvider
          analyticsEnabled={ANALYTICS_ENABLED}
          backButtonEnabled={true}
        >
          {children}
        </MiniAppProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
