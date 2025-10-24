/**
 * Contract Minting Hook
 * 
 * Replaces /api/cards/buy with smart contract minting functionality
 * Handles card purchasing, batch minting, and transaction tracking
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { Address, formatUnits } from 'viem';
import { 
  SCRATCH_CARD_NFT_ADDRESS, 
  SCRATCH_CARD_NFT_ABI, 
  GAME_CONFIG
} from '~/lib/contracts';

/**
 * Minting transaction states
 */
export type MintingState = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

/**
 * Minting hook return type
 */
export interface UseContractMintingReturn {
  /** Current minting state */
  state: MintingState;
  
  /** Transaction hash if pending/confirming */
  transactionHash: `0x${string}` | null;
  
  /** Error message if failed */
  error: string | null;
  
  /** Current card price in USDC */
  cardPrice: string;
  
  /** Maximum batch size */
  maxBatchSize: number;
  
  /** Mint single card */
  mintCard: (recipient?: Address) => Promise<void>;
  
  /** Mint multiple cards */
  mintCardsBatch: (quantity: number, recipient?: Address) => Promise<void>;
  
  /** Reset state */
  reset: () => void;
  
  /** Whether user can mint */
  canMint: boolean;
}

/**
 * Custom hook for contract minting functionality
 * Replaces the traditional API-based card purchasing
 */
export const useContractMinting = (): UseContractMintingReturn => {
  // Contract write hooks
  const { 
    writeContract, 
    data: hash, 
    isPending: isWritePending,
    error: writeError 
  } = useWriteContract();
  
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: confirmError 
  } = useWaitForTransactionReceipt({ 
    hash: hash || undefined,
    confirmations: 2, // Wait for 2 confirmations on Base
  });

  // Read contract data
  const { data: cardPriceRaw } = useReadContract({
    address: SCRATCH_CARD_NFT_ADDRESS,
    abi: SCRATCH_CARD_NFT_ABI,
    functionName: 'getCardPrice',
  }) as { data: bigint | undefined; isLoading: boolean; error: Error | null };

  const { data: maxBatchSizeRaw } = useReadContract({
    address: SCRATCH_CARD_NFT_ADDRESS,
    abi: SCRATCH_CARD_NFT_ABI,
    functionName: 'maxBatchSize',
  }) as { data: bigint | undefined; isLoading: boolean; error: Error | null };

  // Local state
  const [state, setState] = useState<MintingState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Format card price for display
  const cardPrice = useMemo(() => {
    if (!cardPriceRaw) return '0.00';
    return formatUnits(cardPriceRaw, 6); // USDC has 6 decimals
  }, [cardPriceRaw]);

  // Maximum batch size
  const maxBatchSize = useMemo(() => {
    return Number(maxBatchSizeRaw || GAME_CONFIG.MAX_BATCH_SIZE);
  }, [maxBatchSizeRaw]);

  // Update state based on transaction status
  useEffect(() => {
    if (isWritePending) {
      setState('pending');
      setError(null);
    } else if (isConfirming) {
      setState('confirming');
      setError(null);
    } else if (isConfirmed) {
      setState('success');
      setError(null);
    } else if (writeError || confirmError) {
      setState('error');
      setError(writeError?.message || confirmError?.message || 'Transaction failed');
    } else {
      setState('idle');
      setError(null);
    }
  }, [isWritePending, isConfirming, isConfirmed, writeError, confirmError]);

  // Mint single card
  const mintCard = useCallback(async (recipient?: Address) => {
    try {
      setState('pending');
      setError(null);

      writeContract({
        address: SCRATCH_CARD_NFT_ADDRESS,
        abi: SCRATCH_CARD_NFT_ABI,
        functionName: 'mintCard',
        args: [recipient || '0x'], // Use zero address for self
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mint card';
      setError(errorMessage);
      setState('error');
      console.error('Minting error:', err);
    }
  }, [writeContract]);

  // Mint multiple cards
  const mintCardsBatch = useCallback(async (quantity: number, recipient?: Address) => {
    try {
      // Validate quantity
      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }
      
      if (quantity > maxBatchSize) {
        throw new Error(`Maximum batch size is ${maxBatchSize}`);
      }

      setState('pending');
      setError(null);

      writeContract({
        address: SCRATCH_CARD_NFT_ADDRESS,
        abi: SCRATCH_CARD_NFT_ABI,
        functionName: 'mintCardsBatch',
        args: [BigInt(quantity), recipient || '0x'], // Use zero address for self
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mint cards';
      setError(errorMessage);
      setState('error');
      console.error('Batch minting error:', err);
    }
  }, [writeContract, maxBatchSize]);

  // Reset state
  const reset = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

  // Can mint if not currently processing
  const canMint = useMemo(() => {
    return state === 'idle' || state === 'success';
  }, [state]);

  return {
    state,
    transactionHash: hash || null,
    error,
    cardPrice,
    maxBatchSize,
    mintCard,
    mintCardsBatch,
    reset,
    canMint,
  };
};

/**
 * Hook to get user's NFT cards from contract
 * Replaces database card fetching
 */
export const useUserCards = (userAddress: Address | null) => {
  const { data: tokenIds, isLoading, error } = useReadContract({
    address: SCRATCH_CARD_NFT_ADDRESS,
    abi: SCRATCH_CARD_NFT_ABI,
    functionName: 'getUserTokens',
    args: userAddress ? [userAddress] : undefined,
  }) as { data: readonly bigint[] | undefined; isLoading: boolean; error: Error | null };

  return {
    tokenIds: tokenIds || [],
    isLoading,
    error,
  };
};

/**
 * Hook to listen for minting events
 * Replaces polling for new cards
 */
export const useMintingEvents = () => {
  // TODO: Implement event listening with useWatchContractEvent
  // This will replace current polling-based approach
  
  return {
    mintedCards: [],
  };
};

/**
 * Hook to calculate minting costs
 */
export const useMintingCost = () => {
  const { data: cardPriceRaw } = useReadContract({
    address: SCRATCH_CARD_NFT_ADDRESS,
    abi: SCRATCH_CARD_NFT_ABI,
    functionName: 'getCardPrice',
  }) as { data: bigint | undefined; isLoading: boolean; error: Error | null };

  const calculateCost = useCallback((quantity: number): string => {
    if (!cardPriceRaw) return '0';
    const totalCost = cardPriceRaw * BigInt(quantity);
    return formatUnits(totalCost, 6); // USDC has 6 decimals
  }, [cardPriceRaw]);

  const calculateCostBigInt = useCallback((quantity: number): bigint => {
    if (!cardPriceRaw) return BigInt(0);
    return cardPriceRaw * BigInt(quantity);
  }, [cardPriceRaw]);

  return {
    calculateCost,
    calculateCostBigInt,
    singleCardPrice: cardPriceRaw ? formatUnits(cardPriceRaw, 6) : '0',
  };
};