/**
 * Smart contract configuration for Scratch Card NFT integration
 * 
 * This file contains all contract-related constants, ABI definitions,
 * and configuration for integrating with the Scratch Card NFT smart contract.
 */

import { Address } from 'viem';

// ========== Contract Addresses ==========

/**
 * Deployed Scratch Card NFT contract address on Base
 * Update this with your actual deployed contract address
 */
export const SCRATCH_CARD_NFT_ADDRESS = '0xca6ffd32f5070c862865eb86a89265962b33c8fb' as Address;

/**
 * USDC contract address on Base
 */
export const USDC_ADDRESS = '0x902C0EB8E7654B15EEc93499587e56eF75fa6AdD' as Address;

/**
 * USDC ERC20 ABI (minimal - only approve function needed)
 */
export const USDC_ABI = [
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
] as const;

/**
 * Signer address for prize claim verification
 */
export const SIGNER_ADDRESS = '0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF' as Address;

// ========== Contract ABI ==========

/**
 * Complete ABI for the Scratch Card NFT contract
 * Includes all read and write functions needed for the application
 */
export const SCRATCH_CARD_NFT_ABI = [
  // Read Functions
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'getUserTokens',
    outputs: [{ name: '', type: 'uint256[]' }],
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
      { name: 'claimSig', type: 'tuple' },
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
      { name: 'claimSig', type: 'tuple' },
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

// ========== Contract Configuration ==========

/**
 * Game configuration constants
 */
export const GAME_CONFIG = {
  /** Default card price in USDC (6 decimals) */
  CARD_PRICE: 1_000_000, // 1 USDC

  /** Maximum batch size for minting */
  MAX_BATCH_SIZE: 50,

  /** Contract name */
  NAME: 'Scratch Card NFT',

  /** Contract symbol */
  SYMBOL: 'SCRATCH',

  /** Base URI for token metadata */
  BASE_URI: 'https://api.scratchcards.com',
} as const;

// ========== Type Definitions ==========

/**
 * Token data structure from contract
 */
export interface TokenData {
  claimed: boolean;
  registeredAt: bigint;
  tokenAddress: Address;
}

/**
 * Claim signature structure for prize claiming
 */
export interface ClaimSignature {
  prizeAmount: bigint;
  tokenAddress: Address;
  deadline: bigint;
  signature: `0x${string}`;
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
  buyer: Address;
  recipient: Address;
  tokenIds: bigint[];
  timestamp: bigint;
}

/**
 * Prize claimed event data
 */
export interface PrizeClaimedEvent {
  tokenId: bigint;
  winner: Address;
  prizeAmount: bigint;
  tokenAddress: Address;
  timestamp: bigint;
}

/**
 * Bonus card minted event data
 */
export interface BonusCardMintedEvent {
  recipient: Address;
  tokenId: bigint;
  timestamp: bigint;
}

// ========== Utility Functions ==========

/**
 * Format price from contract units to display format
 */
export const formatPrice = (price: bigint): string => {
  return (Number(price) / 1_000_000).toFixed(2); // USDC has 6 decimals
};

/**
 * Convert display price to contract units
 */
export const priceToContractUnits = (price: number): bigint => {
  return BigInt(Math.floor(price * 1_000_000));
};

/**
 * Check if an address is a contract admin
 */
export const isAdminAddress = (address: Address): boolean => {
  // Add admin addresses here or fetch from contract
  const adminAddresses = [
    '0x...', // Add actual admin addresses
  ];
  return adminAddresses.includes(address);
};

/**
 * Generate claim signature structure
 */
export const createClaimSignature = (
  prizeAmount: number,
  tokenAddress: Address,
  deadline: number,
  signature: `0x${string}`
): ClaimSignature => ({
  prizeAmount: BigInt(prizeAmount),
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