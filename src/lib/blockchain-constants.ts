/**
 * Blockchain Environment Constants
 * 
 * Configuration for blockchain integration
 * Replaces traditional API endpoints with smart contract interactions
 */

import { Address } from 'viem';

// ========== Network Configuration ==========

/**
 * Current environment
 */
export const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Whether we're in development mode
 */
export const IS_DEVELOPMENT = NODE_ENV === 'development';

/**
 * Base network configuration
 */
export const BASE_CONFIG = {
  chainId: 8453,
  name: 'Base',
  rpcUrls: [
    process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
    'https://base.gateway.tenderly.co',
    'https://base.blockpi.network/v1/rpc/public'
  ],
  blockExplorer: 'https://basescan.org',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
} as const;



// ========== Contract Configuration ==========

/**
 * Scratch Card NFT contract address
 * Update this based on your deployment
 */
export const SCRATCH_CARD_NFT_ADDRESS = (process.env.NEXT_PUBLIC_SCRATCH_CARD_NFT_ADDRESS || '0xca6ffd32f5070c862865eb86a89265962b33c8fb') as Address;

/**
 * USDC contract address on Base
 */
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') as Address;

/**
 * Signer address for claim verification
 */
export const SIGNER_ADDRESS = (process.env.NEXT_PUBLIC_SIGNER_ADDRESS || '0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF') as Address;

/**
 * Admin wallet address for payments
 */
export const ADMIN_WALLET_ADDRESS = (process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || '0x...') as Address;

// ========== WalletConnect Configuration ==========

/**
 * WalletConnect Project ID
 */
export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

/**
 * Application metadata for WalletConnect
 */
export const WALLETCONNECT_METADATA = {
  name: 'Scratch Off',
  description: 'Scratch to win big!',
  url: process.env.NEXT_PUBLIC_URL || 'https://localhost:3000',
  icons: [`${process.env.NEXT_PUBLIC_URL || 'https://localhost:3000'}/icon.png`],
} as const;

// ========== Game Configuration ==========

/**
 * Card pricing configuration
 */
export const CARD_PRICING = {
  /** Base price in USDC (6 decimals) */
  BASE_PRICE: 1_000_000, // 1 USDC

  /** Maximum batch size */
  MAX_BATCH_SIZE: 50,

  /** Price tiers for bulk discounts */
  BULK_DISCOUNTS: [
    { min: 1, max: 4, discount: 0 },      // No discount for 1-4 cards
    { min: 5, max: 9, discount: 0.05 },  // 5% discount for 5-9 cards
    { min: 10, max: 24, discount: 0.1 }, // 10% discount for 10-24 cards
    { min: 25, max: 50, discount: 0.15 }, // 15% discount for 25-50 cards
  ],
} as const;

/**
 * Prize configuration
 */
export const PRIZE_CONFIG = {
  /** Prize pool configuration */
  PRIZE_POOL: [
    { amount: 0, weight: 70, type: 'no-win' },      // 70% chance of no win
    { amount: 0.5, weight: 15, type: 'small-win' },  // 15% chance of 0.5 USDC
    { amount: 1, weight: 10, type: 'medium-win' }, // 10% chance of 1 USDC
    { amount: 5, weight: 4, type: 'big-win' },     // 4% chance of 5 USDC
    { amount: -1, weight: 1, type: 'free-card' },   // 1% chance of free card
  ],

  /** Maximum prize amount */
  MAX_PRIZE: 5, // 5 USDC

  /** Free card configuration */
  FREE_CARD_CHANCE: 0.01, // 1%
} as const;

// ========== API Configuration ==========

/**
 * Base API URLs
 */
export const API_CONFIG = {
  /** Base URL for API calls */
  BASE_URL: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',

  /** Neynar API configuration */
  NEYNAR_API_KEY: process.env.NEYNAR_API_KEY || '',
  NEYNAR_CLIENT_ID: process.env.NEYNAR_CLIENT_ID || '',

  /** Basescan API key for transaction details */
  BASESCAN_API_KEY: process.env.NEXT_PUBLIC_BASESCAN_API_KEY || '',
} as const;

// ========== Feature Flags ==========

/**
 * Feature flags for Web3 functionality
 */
export const FEATURES = {
  /** Enable Web3 minting */
  WEB3_MINTING: process.env.NEXT_PUBLIC_ENABLE_WEB3_MINTING !== 'false',

  /** Enable on-chain prize claiming */
  ON_CHAIN_CLAIMING: process.env.NEXT_PUBLIC_ENABLE_ON_CHAIN_CLAIMING !== 'false',

  /** Enable social features */
  SOCIAL_FEATURES: process.env.NEXT_PUBLIC_ENABLE_SOCIAL_FEATURES !== 'false',

  /** Enable analytics */
  ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'false',

  /** Enable testnet mode */
  TESTNET_MODE: false, // Always use Base mainnet
} as const;

// ========== Utility Functions ==========

/**
 * Get current network configuration
 */
export const getCurrentNetwork = () => {
  return BASE_CONFIG; // Always use Base mainnet
};

/**
 * Get current contract addresses
 */
export const getContractAddresses = () => {
  return {
    scratchCardNFT: SCRATCH_CARD_NFT_ADDRESS,
    usdc: USDC_ADDRESS,
    signer: SIGNER_ADDRESS,
    adminWallet: ADMIN_WALLET_ADDRESS,
  };
};

/**
 * Calculate price with bulk discounts
 */
export const calculatePrice = (quantity: number): { price: number; discount: number } => {
  const basePrice = CARD_PRICING.BASE_PRICE / 1_000_000; // Convert from USDC units

  // Find applicable discount
  const discountTier = CARD_PRICING.BULK_DISCOUNTS.find(
    tier => quantity >= tier.min && quantity <= tier.max
  );

  const discount = discountTier?.discount || 0;
  const discountedPrice = basePrice * (1 - discount);
  const totalPrice = discountedPrice * quantity;

  return {
    price: totalPrice,
    discount: discount,
  };
};

/**
 * Format price for display
 */
export const formatPrice = (price: number | bigint): string => {
  const priceInUSDC = typeof price === 'bigint'
    ? Number(price) / 1_000_000
    : price;

  return priceInUSDC.toFixed(2);
};

/**
 * Convert price to contract units
 */
export const priceToContractUnits = (price: number): bigint => {
  return BigInt(Math.floor(price * 1_000_000));
};

/**
 * Validate address format
 */
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Get block explorer URL
 */
export const getBlockExplorerUrl = (type: 'tx' | 'address', value: string): string => {
  const network = getCurrentNetwork();
  return `${network.blockExplorer}/${type}/${value}`;
};

/**
 * Get network name for display
 */
export const getNetworkName = (): string => {
  const network = getCurrentNetwork();
  return network.name;
};

/**
 * Check if address is contract admin
 */
export const isAdminAddress = (address: Address): boolean => {
  const adminAddresses = [
    ADMIN_WALLET_ADDRESS,
    // Add other admin addresses here
  ].filter(Boolean);

  return adminAddresses.includes(address);
};