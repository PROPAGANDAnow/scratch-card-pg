/**
 * Blockchain Configuration Constants
 *
 * Consolidated blockchain-related constants, addresses, and utilities
 * Replaces contracts.ts, blockchain-addresses.ts, and blockchain-constants.ts
 */

import { Address as ViemAddress } from 'viem';

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

// ========== Contract Addresses ==========

/**
 * Scratch Card NFT contract address
 * Environment variable override for different deployments
 */
export const SCRATCH_CARD_NFT_ADDRESS = '0x00aD588484a71b3A22182f6413cb3616440f71eA' as ViemAddress;

/**
 * Payment token configuration
 * Update these values to change the payment token
 */
export const PAYMENT_TOKEN = {
  /** Token contract address on Base */
  ADDRESS: '0x902c0eb8e7654b15eec93499587e56ef75fa6add' as ViemAddress,
  /** Token decimals - affects how amounts are calculated */
  DECIMALS: 18,
  /** Token symbol - for display purposes */
  SYMBOL: 'SAMP',
  /** Token name - for display purposes */
  NAME: 'Sample Coin',
} as const;

/**
 * Signer address for prize claim verification
 */
export const SIGNER_ADDRESS = '0xB48B07A013275600945DFAb3385FFf00014986C5' as ViemAddress;

/**
 * Admin wallet address for payments
 */
export const ADMIN_WALLET_ADDRESS = '0x0000000000000000000000000000000000000000' as ViemAddress;

// ========== Address Utilities ==========

/**
 * Ethereum zero address (burn address)
 * Used as default value for recipient when minting to self
 */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

/**
 * Type for valid Ethereum addresses
 */
export type EthereumAddress = `0x${string}`;

/**
 * Type alias for better readability
 */
export type Address = EthereumAddress | ViemAddress;

/**
 * Validates if a string is a valid Ethereum address
 */
export const isValidEthereumAddress = (address: string): address is EthereumAddress => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validates if an address is the zero address
 */
export const isZeroAddress = (address: string): boolean => {
  return address.toLowerCase() === ZERO_ADDRESS.toLowerCase();
};

/**
 * Common address patterns and utilities
 */
export const AddressPatterns = {
  ZERO: ZERO_ADDRESS,
  /**
   * Validates address format and returns normalized address
   */
  normalize: (address: string): EthereumAddress | null => {
    if (!isValidEthereumAddress(address)) return null;
    return address.toLowerCase() as EthereumAddress;
  },
  /**
   * Returns a safe recipient address (zero address if undefined/empty)
   */
  safeRecipient: (address?: Address | string): EthereumAddress => {
    if (!address || address === '' || isZeroAddress(address)) {
      return ZERO_ADDRESS;
    }
    const normalized = AddressPatterns.normalize(address);
    return normalized || ZERO_ADDRESS;
  },
} as const;

// ========== Contract ABIs ==========

/**
 * ERC20 ABI for payment tokens (minimal - only functions needed)
 * Works with any ERC20 token used for payments
 */
export const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * @deprecated Use ERC20_ABI instead
 * Kept for backward compatibility
 */
export const USDC_ABI = ERC20_ABI;

/**
 * Complete ABI for the Scratch Card NFT contract
 */
export const SCRATCH_CARD_NFT_ABI = [
  // Struct definitions
  {
    name: 'ClaimSignature',
    type: 'tuple',
    components: [
      { name: 'prizeAmount', type: 'uint256' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' }
    ]
  },
  {
    name: 'TokenData',
    type: 'tuple',
    components: [
      { name: 'claimed', type: 'bool' },
      { name: 'registeredAt', type: 'uint256' },
      { name: 'tokenAddress', type: 'address' }
    ]
  },

  // Read Functions
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'getUserTokens',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'prizeAmount', type: 'uint256' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    name: 'getClaimMessageHash',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'prizeAmount', type: 'uint256' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    name: 'getClaimEthSignedMessageHash',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'prizeAmount', type: 'uint256' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' }
    ],
    name: 'verifyClaimSignature',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getTokenData',
    outputs: [
      { name: 'claimed', type: 'bool' },
      { name: 'registeredAt', type: 'uint256' },
      { name: 'tokenAddress', type: 'address' }
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPaymentTokenAddress',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCardPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getStats',
    outputs: [
      { name: 'totalMinted', type: 'uint256' },
      { name: 'totalClaimed', type: 'uint256' },
      { name: 'totalDistributed', type: 'uint256' },
      { name: 'paymentTokenBalance', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxBatchSize',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'isAdmin',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },

  // Write Functions
  {
    inputs: [{ name: 'recipient', type: 'address' }],
    name: 'mintCard',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'quantity', type: 'uint256' },
      { name: 'recipient', type: 'address' }
    ],
    name: 'mintCardsBatch',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      {
        name: 'claimSig',
        type: 'tuple',
        components: [
          { name: 'prizeAmount', type: 'uint256' },
          { name: 'tokenAddress', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'signature', type: 'bytes' }
        ]
      },
      { name: 'recipient', type: 'address' }
    ],
    name: 'claimPrize',
    outputs: [],
    stateMutability: 'nonReentrant',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      {
        name: 'claimSig',
        type: 'tuple',
        components: [
          { name: 'prizeAmount', type: 'uint256' },
          { name: 'tokenAddress', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'signature', type: 'bytes' }
        ]
      },
      { name: 'recipient', type: 'address' },
      { name: 'bonusRecipient', type: 'address' }
    ],
    name: 'claimPrizeWithBonus',
    outputs: [],
    stateMutability: 'nonReentrant',
    type: 'function',
  },

  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: true, name: 'recipient', type: 'address' },
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'timestamp', type: 'uint256' }
    ],
    name: 'CardsMinted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'winner', type: 'address' },
      { name: 'prizeAmount', type: 'uint256' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'timestamp', type: 'uint256' }
    ],
    name: 'PrizeClaimed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' }
    ],
    name: 'BonusCardMinted',
    type: 'event',
  },
] as const;

// ========== Game Configuration ==========

/**
 * Game configuration constants
 */
export const GAME_CONFIG = {
  /** Default card price in payment token units (depends on token decimals) */
  CARD_PRICE: 1_000_000, // 1 unit of payment token (e.g., 1 USDC if using USDC)

  /** Maximum batch size for minting */
  MAX_BATCH_SIZE: 50,

  /** Contract name */
  NAME: 'Scratch Card NFT',

  /** Contract symbol */
  SYMBOL: 'SCRATCH',

  /** Base URI for token metadata */
  BASE_URI: 'https://api.scratchcards.com',

  /** Payment token decimals - dynamically from payment token config */
  PAYMENT_TOKEN_DECIMALS: PAYMENT_TOKEN.DECIMALS,
} as const;

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

// ========== Type Definitions ==========

/**
 * Token data structure from contract
 */
export interface TokenData {
  claimed: boolean;
  registeredAt: bigint;
  tokenAddress: ViemAddress;
}

/**
 * Claim signature structure for prize claiming
 */
export interface ClaimSignature {
  prizeAmount: bigint;
  tokenAddress: ViemAddress;
  deadline: bigint;
  signature: `0x${string}` | Uint8Array; // Can be hex string or bytes array
}

/**
 * Contract statistics
 */
export interface ContractStats {
  totalMinted: bigint;
  totalClaimed: bigint;
  totalDistributed: bigint;
  paymentTokenBalance: bigint;
}

/**
 * Minted card event data
 */
export interface CardsMintedEvent {
  buyer: ViemAddress;
  recipient: ViemAddress;
  tokenIds: bigint[];
  timestamp: bigint;
}

/**
 * Prize claimed event data
 */
export interface PrizeClaimedEvent {
  tokenId: bigint;
  winner: ViemAddress;
  prizeAmount: bigint;
  tokenAddress: ViemAddress;
  timestamp: bigint;
}

/**
 * Bonus card minted event data
 */
export interface BonusCardMintedEvent {
  recipient: ViemAddress;
  tokenId: bigint;
  timestamp: bigint;
}

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
    paymentToken: PAYMENT_TOKEN.ADDRESS,
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
 * Format price from contract units to display format
 */
export const formatPrice = (price: number | bigint, decimals: number = GAME_CONFIG.PAYMENT_TOKEN_DECIMALS): string => {
  const priceInToken = typeof price === 'bigint'
    ? Number(price) / Math.pow(10, decimals)
    : price;

  return priceInToken.toFixed(2);
};

/**
 * Convert display price to contract units
 */
export const priceToContractUnits = (price: number, decimals: number = GAME_CONFIG.PAYMENT_TOKEN_DECIMALS): bigint => {
  return BigInt(Math.floor(price * Math.pow(10, decimals)));
};

/**
 * Validate address format
 */
export const isValidAddress = (address: string): boolean => {
  return isValidEthereumAddress(address);
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
export const isAdminAddress = (address: ViemAddress): boolean => {
  const adminAddresses = [
    ADMIN_WALLET_ADDRESS,
    // Add other admin addresses here
  ].filter(Boolean);

  return adminAddresses.includes(address);
};

/**
 * Generate claim signature structure
 */
export const createClaimSignature = (
  prizeAmount: number,
  tokenAddress: ViemAddress,
  deadline: number,
  signature: `0x${string}`
): ClaimSignature => ({
  prizeAmount: BigInt(Math.floor(prizeAmount * 1_000_000)), // Convert USDC amount to smallest unit (6 decimals)
  tokenAddress,
  deadline: BigInt(deadline),
  signature,
});

/**
 * Validate claim signature format
 */
export const validateClaimSignature = (claimSig: unknown): claimSig is ClaimSignature => {
  const sig = claimSig as ClaimSignature;
  return (
    sig &&
    typeof sig.prizeAmount === 'bigint' &&
    typeof sig.tokenAddress === 'string' &&
    typeof sig.deadline === 'bigint' &&
    typeof sig.signature === 'string' &&
    sig.signature.startsWith('0x') &&
    sig.signature.length === 132 // 66 bytes * 2 + 0x prefix
  );
};