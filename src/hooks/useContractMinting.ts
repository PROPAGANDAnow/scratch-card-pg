/**
 * Contract Minting Hook
 * 
 * Replaces /api/cards/buy with smart contract minting functionality
 * Handles card purchasing, batch minting, and transaction tracking
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { Address, formatUnits } from 'viem';
import {
  SCRATCH_CARD_NFT_ADDRESS,
  SCRATCH_CARD_NFT_ABI,
  GAME_CONFIG
} from '~/lib/contracts';
import { AddressPatterns } from '~/lib/blockchain-addresses';

/**
 * Minting transaction states
 */
export type MintingState = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

/**
 * Enhanced transaction receipt information
 */
export interface TransactionReceipt {
  /** Transaction hash */
  hash: `0x${string}`;
  /** Block number */
  blockNumber: bigint;
  /** Block hash */
  blockHash: `0x${string}`;
  /** Gas used */
  gasUsed: bigint;
  /** Effective gas price */
  effectiveGasPrice: bigint;
  /** Transaction status */
  status: 'success' | 'reverted';
  /** Logs from the transaction */
  logs: readonly unknown[];
  /** Transaction index */
  transactionIndex: number;
  /** Type of transaction */
  type: string;
  /** Cumulative gas used */
  cumulativeGasUsed: bigint;
}

/**
 * Minting hook return type
 */
export interface UseContractMintingReturn {
  /** Current minting state */
  state: MintingState;

  /** Transaction hash if pending/confirming */
  transactionHash: `0x${string}` | null;

  /** Transaction receipt when confirmed */
  receipt: TransactionReceipt | null;

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
  // Get public client for enhanced transaction handling
  const publicClient = usePublicClient();




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
    error: confirmError,
    data: viemReceipt
  } = useWaitForTransactionReceipt({
    hash: hash || undefined,
    confirmations: 2, // Wait for 2 confirmations on Base
    retryCount: 3, // Retry up to 3 times
    retryDelay: 1000, // 1 second delay between retries
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
  const [enhancedReceipt, setEnhancedReceipt] = useState<TransactionReceipt | null>(null);

  // Auto-switch to Base network for mini-app users


  // Format card price for display
  const cardPrice = useMemo(() => {
    if (!cardPriceRaw) return '0.00';
    return formatUnits(cardPriceRaw, 6); // USDC has 6 decimals
  }, [cardPriceRaw]);

  // Maximum batch size
  const maxBatchSize = useMemo(() => {
    return Number(maxBatchSizeRaw || GAME_CONFIG.MAX_BATCH_SIZE);
  }, [maxBatchSizeRaw]);

  // Enhanced receipt processing using publicClient
  useEffect(() => {
    const processReceipt = async () => {
      if (viemReceipt && publicClient) {
        try {
          // Get additional transaction details using publicClient
          const transaction = await publicClient.getTransaction({
            hash: viemReceipt.transactionHash
          });

          const enhanced: TransactionReceipt = {
            hash: viemReceipt.transactionHash,
            blockNumber: viemReceipt.blockNumber,
            blockHash: viemReceipt.blockHash,
            gasUsed: viemReceipt.gasUsed,
            effectiveGasPrice: viemReceipt.effectiveGasPrice,
            status: viemReceipt.status === 'success' ? 'success' : 'reverted',
            logs: viemReceipt.logs,
            transactionIndex: Number(viemReceipt.transactionIndex),
            type: transaction?.type || 'legacy',
            cumulativeGasUsed: viemReceipt.cumulativeGasUsed,
          };

          setEnhancedReceipt(enhanced);

          console.log('Enhanced transaction receipt:', {
            hash: enhanced.hash,
            blockNumber: enhanced.blockNumber,
            gasUsed: enhanced.gasUsed.toString(),
            effectiveGasPrice: enhanced.effectiveGasPrice.toString(),
            status: enhanced.status,
            transactionType: enhanced.type,
            logsCount: enhanced.logs.length,
          });

        } catch (error) {
          console.error('Error processing receipt:', error);
          // Fallback to basic receipt if enhanced processing fails
          setEnhancedReceipt({
            hash: viemReceipt.transactionHash,
            blockNumber: viemReceipt.blockNumber,
            blockHash: viemReceipt.blockHash,
            gasUsed: viemReceipt.gasUsed,
            effectiveGasPrice: viemReceipt.effectiveGasPrice,
            status: viemReceipt.status === 'success' ? 'success' : 'reverted',
            logs: viemReceipt.logs,
            transactionIndex: Number(viemReceipt.transactionIndex),
            type: 'unknown',
            cumulativeGasUsed: viemReceipt.cumulativeGasUsed,
          });
        }
      }
    };

    processReceipt();
  }, [viemReceipt, publicClient]);

  // Update state based on transaction status
  useEffect(() => {
    if (isWritePending) {
      setState('pending');
      setError(null);
      setIsWaitingForReceipt(false);
      setEnhancedReceipt(null);
    } else if (hash && !isConfirming && !isConfirmed) {
      // Transaction submitted but not yet confirming
      setState('confirming');
      setError(null);
    } else if (isConfirming) {
      setState('confirming');
      setError(null);
    } else if (isConfirmed && viemReceipt) {
      setState('success');
      setError(null);
    } else if (writeError || confirmError) {
      setState('error');
      setError(writeError?.message || confirmError?.message || 'Transaction failed');
      setEnhancedReceipt(null);
    } else {
      setState('idle');
      setError(null);
      setEnhancedReceipt(null);
    }
  }, [isWritePending, isConfirming, isConfirmed, writeError, confirmError, hash, viemReceipt]);

  // Mint single card
  const mintCard = useCallback(async (recipient?: Address) => {
    try {
      setState('pending');
      setError(null);
      setEnhancedReceipt(null);

      const txHash = await writeContract({
        address: SCRATCH_CARD_NFT_ADDRESS,
        abi: SCRATCH_CARD_NFT_ABI,
        functionName: 'mintCard',
        args: [AddressPatterns.safeRecipient(recipient)], // Use zero address for self
      });

      console.log('Transaction submitted:', txHash);

      // Wait for transaction receipt using publicClient for enhanced monitoring
      if (publicClient && txHash) {
        console.log('Waiting for transaction receipt using publicClient...');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mint card';
      setError(errorMessage);
      setState('error');
      setEnhancedReceipt(null);
      console.error('Minting error:', err);
    }
  }, [writeContract, publicClient]);

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
      setEnhancedReceipt(null);

      console.log("🚀 ~ useContractMinting ~ SCRATCH_CARD_NFT_ADDRESS:", SCRATCH_CARD_NFT_ADDRESS)
      const txHash = await writeContract({
        address: SCRATCH_CARD_NFT_ADDRESS,
        abi: SCRATCH_CARD_NFT_ABI,
        functionName: 'mintCardsBatch',
        args: [BigInt(quantity), AddressPatterns.safeRecipient(recipient)], // Use zero address for self
      });

      console.log('Batch transaction submitted:', txHash);

      // Wait for transaction receipt using publicClient for enhanced monitoring
      if (publicClient && txHash) {
        console.log('Waiting for batch transaction receipt using publicClient...');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mint cards';
      setError(errorMessage);
      setState('error');
      setEnhancedReceipt(null);
      console.error('Batch minting error:', err);
    }
  }, [writeContract, maxBatchSize, publicClient]);

  // Reset state
  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setIsWaitingForReceipt(false);
    setEnhancedReceipt(null);
  }, []);

  // Can mint if not currently processing
  const canMint = useMemo(() => {
    return state === 'idle' || state === 'success';
  }, [state]);

  return {
    state,
    transactionHash: hash || null,
    receipt: enhancedReceipt,
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