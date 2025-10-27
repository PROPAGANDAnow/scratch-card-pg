/**
 * ERC20 Approval Hook
 * 
 * Handles ERC20 token approvals before contract interactions
 * Specifically for USDC approval before NFT minting
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { Address, formatUnits, maxUint256 } from 'viem';
import { USDC_ADDRESS, USDC_ABI, SCRATCH_CARD_NFT_ADDRESS } from '~/lib/contracts';

/**
 * Approval transaction states
 */
export type ApprovalState = 'idle' | 'checking' | 'pending' | 'confirming' | 'success' | 'error';

/**
 * Approval hook return type
 */
export interface UseERC20ApprovalReturn {
  /** Current approval state */
  state: ApprovalState;

  /** Transaction hash if pending/confirming */
  transactionHash: `0x${string}` | null;

  /** Error message if failed */
  error: string | null;

  /** Current allowance amount */
  allowance: bigint;

  /** Whether approval is needed for the given amount */
  needsApproval: boolean;

  /** Whether approval is sufficient for the given amount */
  hasSufficientApproval: boolean;

  /** Approve USDC for contract */
  approve: (amount: bigint) => Promise<void>;

  /** Approve unlimited USDC for contract */
  approveUnlimited: () => Promise<void>;

  /** Reset state */
  reset: () => void;

  /** Check current allowance */
  checkAllowance: () => Promise<void>;
}

/**
 * Custom hook for ERC20 approval functionality
 * Handles USDC approval before NFT minting
 */
export const useERC20Approval = (
  userAddress: Address | null,
  spenderAddress: Address = SCRATCH_CARD_NFT_ADDRESS,
  requiredAmount: bigint = BigInt(0)
): UseERC20ApprovalReturn => {
  // Contract write hooks for approval
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
    confirmations: 1, // 1 confirmation is usually sufficient for approvals
    retryCount: 2,
    retryDelay: 1000,
  });

  // Read current allowance
  const { data: allowanceRaw } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: userAddress && spenderAddress ? [userAddress, spenderAddress] : undefined,
    query: {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  }) as { data: bigint | undefined; isLoading: boolean; error: Error | null };

  // Local state
  const [state, setState] = useState<ApprovalState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Current allowance
  const allowance = useMemo(() => {
    return allowanceRaw || BigInt(0);
  }, [allowanceRaw]);

  // Check if approval is needed
  const needsApproval = useMemo(() => {
    return allowance < requiredAmount;
  }, [allowance, requiredAmount]);

  // Check if has sufficient approval
  const hasSufficientApproval = useMemo(() => {
    return allowance >= requiredAmount;
  }, [allowance, requiredAmount]);

  // Update state based on transaction status
  useEffect(() => {
    if (isChecking) {
      setState('checking');
      setError(null);
    } else if (isWritePending) {
      setState('pending');
      setError(null);
    } else if (hash && !isConfirming && !isConfirmed) {
      setState('confirming');
      setError(null);
    } else if (isConfirming) {
      setState('confirming');
      setError(null);
    } else if (isConfirmed) {
      setState('success');
      setError(null);
      // Allowance will be automatically refetched by useReadContract when dependencies change
    } else if (writeError || confirmError) {
      setState('error');
      setError(writeError?.message || confirmError?.message || 'Approval failed');
    } else {
      setState('idle');
      setError(null);
    }
  }, [isChecking, isWritePending, isConfirming, isConfirmed, writeError, confirmError, hash]);

  // Check current allowance
  const checkAllowance = useCallback(async () => {
    if (!userAddress || !spenderAddress) return;
    
    setIsChecking(true);
    try {
      // The useReadContract hook will automatically refetch when dependencies change
      // We just trigger a state update to ensure the hook re-evaluates
      setState('checking');
      setTimeout(() => setState('idle'), 1000);
    } catch (error) {
      console.error('Error checking allowance:', error);
      setError('Failed to check allowance');
    } finally {
      setIsChecking(false);
    }
  }, [userAddress, spenderAddress]);

  // Approve specific amount
  const approve = useCallback(async (amount: bigint) => {
    if (!userAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      setState('pending');
      setError(null);

      const txHash = await writeContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [spenderAddress, amount],
      });

      console.log('Approval transaction submitted:', txHash);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve';
      setError(errorMessage);
      setState('error');
      console.error('Approval error:', err);
      throw err;
    }
  }, [writeContract, userAddress, spenderAddress]);

  // Approve unlimited amount
  const approveUnlimited = useCallback(async () => {
    await approve(maxUint256);
  }, [approve]);

  // Reset state
  const reset = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

  return {
    state,
    transactionHash: hash || null,
    error,
    allowance,
    needsApproval,
    hasSufficientApproval,
    approve,
    approveUnlimited,
    reset,
    checkAllowance,
  };
};

/**
 * Hook to get USDC balance
 */
export const useUSDCBalance = (userAddress: Address | null) => {
  const { data: balanceRaw, isLoading, error } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
  }) as { data: bigint | undefined; isLoading: boolean; error: Error | null };

  const { data: decimals } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'decimals',
  }) as { data: number | undefined; isLoading: boolean; error: Error | null };

  const balance = useMemo(() => {
    if (!balanceRaw || !decimals) return '0';
    return formatUnits(balanceRaw, decimals);
  }, [balanceRaw, decimals]);

  const balanceBigInt = useMemo(() => {
    return balanceRaw || BigInt(0);
  }, [balanceRaw]);

  return {
    balance,
    balanceBigInt,
    isLoading,
    error,
    decimals: decimals || 6, // USDC typically has 6 decimals
  };
};