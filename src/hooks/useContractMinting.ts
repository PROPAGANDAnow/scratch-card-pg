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
  GAME_CONFIG,
  AddressPatterns
} from '~/lib/blockchain';
import { useERC20Approval } from './useERC20Approval';

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
 * Simulation result interface
 */
export interface SimulationResult {
  /** Estimated gas cost */
  estimatedGas: bigint;
  /** Estimated gas price */
  estimatedGasPrice: bigint;
  /** Estimated total cost in wei */
  estimatedTotalCost: bigint;
  /** Success prediction */
  willSucceed: boolean;
  /** Error message if simulation fails */
  simulationError?: string;
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

  /** Approval state and functions */
  approval: {
    state: 'idle' | 'checking' | 'pending' | 'confirming' | 'success' | 'error';
    needsApproval: boolean;
    hasSufficientApproval: boolean;
    allowance: bigint;
    approve: (amount: bigint) => Promise<void>;
    approveUnlimited: () => Promise<void>;
    error: string | null;
  };

  /** Simulation functions */
  simulate: {
    /** Simulate single card minting */
    mintCard: (recipient?: Address) => Promise<SimulationResult>;
    /** Simulate batch card minting */
    mintCardsBatch: (quantity: number, recipient?: Address) => Promise<SimulationResult>;
  };
}

/**
 * Custom hook for contract minting functionality
 * Replaces the traditional API-based card purchasing
 */
export const useContractMinting = (userAddress: Address | null): UseContractMintingReturn => {
  // Get public client for enhanced transaction handling
  const publicClient = usePublicClient();

  // Feature flag: skip viem simulations to avoid pre-approval failures
  const SKIP_SIMULATION = process.env.NEXT_PUBLIC_SKIP_MINT_SIMULATION !== 'false';

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

  // Get minting cost for approval amount calculation
  const { calculateCostBigInt } = useMintingCost();

  // Maximum batch size
  const maxBatchSize = useMemo(() => {
    return Number(maxBatchSizeRaw || GAME_CONFIG.MAX_BATCH_SIZE);
  }, [maxBatchSizeRaw]);

  // Calculate required approval amount (for max batch size to avoid repeated approvals)
  const requiredApprovalAmount = useMemo(() => {
    return calculateCostBigInt(maxBatchSize);
  }, [calculateCostBigInt, maxBatchSize]);

  // ERC20 approval hook
  const approvalHook = useERC20Approval(userAddress, SCRATCH_CARD_NFT_ADDRESS, requiredApprovalAmount);

  // Auto-switch to Base network for mini-app users


  // Format card price for display
  const cardPrice = useMemo(() => {
    if (!cardPriceRaw) return '0.00';
    return formatUnits(cardPriceRaw, 6); // USDC has 6 decimals
  }, [cardPriceRaw]);

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

  // Simulation function for single card minting
  const simulateMintCard = useCallback(async (recipient?: Address): Promise<SimulationResult> => {
    if (!publicClient || !userAddress) {
      return {
        estimatedGas: BigInt(0),
        estimatedGasPrice: BigInt(0),
        estimatedTotalCost: BigInt(0),
        willSucceed: false,
        simulationError: 'Public client or user address not available'
      };
    }
    if (SKIP_SIMULATION) {
      return {
        estimatedGas: BigInt(0),
        estimatedGasPrice: BigInt(0),
        estimatedTotalCost: BigInt(0),
        willSucceed: true,
      };
    }

    try {
      const gasEstimate = await publicClient.estimateContractGas({
        address: SCRATCH_CARD_NFT_ADDRESS,
        abi: SCRATCH_CARD_NFT_ABI,
        functionName: 'mintCard',
        args: [AddressPatterns.safeRecipient(recipient)],
        account: userAddress,
      });

      // Get current gas price
      const gasPrice = await publicClient.getGasPrice();

      // Calculate total cost (gas only, no token cost for simulation)
      const totalCost = gasEstimate * gasPrice;

      return {
        estimatedGas: gasEstimate,
        estimatedGasPrice: gasPrice,
        estimatedTotalCost: totalCost,
        willSucceed: true,
      };
    } catch (error) {
      console.error('Simulation error for mintCard:', error);
      return {
        estimatedGas: BigInt(0),
        estimatedGasPrice: BigInt(0),
        estimatedTotalCost: BigInt(0),
        willSucceed: false,
        simulationError: error instanceof Error ? error.message : 'Simulation failed'
      };
    }
  }, [publicClient, userAddress]);

  // Simulation function for batch card minting
  const simulateMintCardsBatch = useCallback(async (quantity: number, recipient?: Address): Promise<SimulationResult> => {
    if (!publicClient || !userAddress) {
      return {
        estimatedGas: BigInt(0),
        estimatedGasPrice: BigInt(0),
        estimatedTotalCost: BigInt(0),
        willSucceed: false,
        simulationError: 'Public client or user address not available'
      };
    }

    if (SKIP_SIMULATION) {
      return {
        estimatedGas: BigInt(0),
        estimatedGasPrice: BigInt(0),
        estimatedTotalCost: BigInt(0),
        willSucceed: true,
      };
    }

    try {
      // Validate quantity
      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      if (quantity > maxBatchSize) {
        throw new Error(`Maximum batch size is ${maxBatchSize}`);
      }

      const gasEstimate = await publicClient.estimateContractGas({
        address: SCRATCH_CARD_NFT_ADDRESS,
        abi: SCRATCH_CARD_NFT_ABI,
        functionName: 'mintCardsBatch',
        args: [BigInt(quantity), AddressPatterns.safeRecipient(recipient)],
        account: userAddress,
      });

      // Get current gas price
      const gasPrice = await publicClient.getGasPrice();

      // Calculate total cost (gas only, no token cost for simulation)
      const totalCost = gasEstimate * gasPrice;

      return {
        estimatedGas: gasEstimate,
        estimatedGasPrice: gasPrice,
        estimatedTotalCost: totalCost,
        willSucceed: true,
      };
    } catch (error) {
      console.error('Simulation error for mintCardsBatch:', error);
      return {
        estimatedGas: BigInt(0),
        estimatedGasPrice: BigInt(0),
        estimatedTotalCost: BigInt(0),
        willSucceed: false,
        simulationError: error instanceof Error ? error.message : 'Simulation failed'
      };
    }
  }, [publicClient, userAddress, maxBatchSize]);

  // Update state based on transaction status
  useEffect(() => {
    if (isWritePending) {
      setState('pending');
      setError(null);
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

  // Mint single card with simulation
  const mintCard = useCallback(async (recipient?: Address) => {
    try {
      // Calculate required approval = exact USDC cost
      const actualCost = calculateCostBigInt(1);
      const requiredApproval = actualCost;

      // Start single pending state covering approval + mint
      setState('pending');
      setError(null);
      setEnhancedReceipt(null);

      // Approve exact required amount first
      await approvalHook.approve(requiredApproval);

      const txHash = await writeContract({
        address: SCRATCH_CARD_NFT_ADDRESS,
        abi: SCRATCH_CARD_NFT_ABI,
        functionName: 'mintCard',
        args: [AddressPatterns.safeRecipient(recipient)],
      });

      console.log('Transaction submitted:', txHash);

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
  }, [writeContract, publicClient, approvalHook.allowance, approvalHook.approve, approvalHook.checkAllowance, calculateCostBigInt, simulateMintCard]);

  // Mint multiple cards with simulation
  const mintCardsBatch = useCallback(async (quantity: number, recipient?: Address) => {
    try {
      // Validate quantity
      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      if (quantity > maxBatchSize) {
        throw new Error(`Maximum batch size is ${maxBatchSize}`);
      }

      // Start single pending state covering approval + mint
      setState('pending');
      setError(null);
      setEnhancedReceipt(null);

      // Approve exact required amount first
      await approvalHook.approveUnlimited();

      // Optionally simulate tx (skipped by default)
      if (!SKIP_SIMULATION) {
        const simulation = await simulateMintCardsBatch(quantity, recipient);
        if (!simulation.willSucceed) {
          throw new Error(simulation.simulationError || 'Transaction simulation failed');
        }
        console.log('Simulation result:', formatSimulationResult(simulation));
      }

      console.log("🚀 ~ useContractMinting ~ SCRATCH_CARD_NFT_ADDRESS:", SCRATCH_CARD_NFT_ADDRESS)
      const txHash = await writeContract({
        address: SCRATCH_CARD_NFT_ADDRESS,
        abi: SCRATCH_CARD_NFT_ABI,
        functionName: 'mintCardsBatch',
        args: [BigInt(quantity), AddressPatterns.safeRecipient(recipient)],
      });

      console.log('Batch transaction submitted:', txHash);

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
  }, [writeContract, maxBatchSize, publicClient, approvalHook.allowance, approvalHook.approve, approvalHook.checkAllowance, calculateCostBigInt, simulateMintCardsBatch]);

  // Reset state
  const reset = useCallback(() => {
    setState('idle');
    setError(null);
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
    approval: {
      allowance: approvalHook.allowance,
      state: approvalHook.state,
      needsApproval: approvalHook.needsApproval,
      hasSufficientApproval: approvalHook.hasSufficientApproval,
      approve: approvalHook.approve,
      approveUnlimited: approvalHook.approveUnlimited,
      error: approvalHook.error,
    },
    simulate: {
      mintCard: simulateMintCard,
      mintCardsBatch: simulateMintCardsBatch,
    },
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
 * Minting hook return type
 */
export const formatSimulationResult = (simulation: SimulationResult): string => {
  if (!simulation.willSucceed) {
    return `❌ Simulation failed: ${simulation.simulationError || 'Unknown error'}`;
  }

  const gasInEth = formatUnits(simulation.estimatedTotalCost, 18);
  const gasInGwei = Number(formatUnits(simulation.estimatedGasPrice, 9));

  return `✅ Success predicted • Gas: ${simulation.estimatedGas.toString()} • ~${gasInEth} ETH (~${gasInGwei} Gwei)`;
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