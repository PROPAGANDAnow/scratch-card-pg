/**
 * Wagmi Configuration
 * 
 * Sets up Web3 providers, connectors, and chains for the application
 * Integrates with existing Farcaster Mini App architecture
 */

import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';
import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';

// Use Base Sepolia for development, Base for production
const isDevelopment = process.env.NODE_ENV === 'development';

// Create Wagmi configuration
export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    miniAppConnector()
  ]
})

// Export chain IDs for easy access
export const CHAIN_IDS = {
  BASE: base.id,
} as const;

// Export chain objects for easy access
export const CHAINS = {
  BASE: base,
} as const;

// Helper function to get current chain
export const getCurrentChain = () => {
  return base;
};

// Helper function to check if we're on testnet
export const isTestnet = () => {
  return isDevelopment;
};

// Helper function to get block explorer URL
export const getBlockExplorerUrl = (chainId: number, type: 'tx' | 'address', value: string) => {
  const chain = base.id === chainId ? base : null;
  if (!chain) return '';

  const baseUrl = chain.blockExplorers?.default.url;
  if (!baseUrl) return '';

  return `${baseUrl}/${type}/${value}`;
};

// Helper function to format chain name
export const formatChainName = (chainId: number): string => {
  switch (chainId) {
    case base.id:
      return 'Base';
    case baseSepolia.id:
      return 'Base Sepolia';
    default:
      return 'Unknown';
  }
};

// Helper function to validate chain
export const isValidChain = (chainId: number): boolean => {
  return Object.values(CHAINS).some(chain => chain.id === chainId);
};