import { createConfig, http } from 'wagmi';
import { base, mainnet, polygon, arbitrum, optimism } from 'wagmi/chains';
import farcasterConnector from '@farcaster/miniapp-wagmi-connector';

// Create Wagmi configuration
export const config = createConfig({
  chains: [base, mainnet, polygon, arbitrum, optimism],
  connectors: [
    farcasterConnector(),
  ],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
  },
  ssr: false, // Disable SSR for wagmi to avoid hydration issues
});

// Export the config for use in providers
export { config as wagmiConfig };