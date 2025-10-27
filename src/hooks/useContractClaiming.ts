/**
 * Contract Prize Claiming Hook
 * 
 * Replaces /api/cards/process-prize with on-chain prize claiming
 * Handles signature verification, prize transfers, and bonus card minting
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { Address, hashMessage, recoverAddress } from 'viem';
import { 
  SCRATCH_CARD_NFT_ADDRESS, 
  SCRATCH_CARD_NFT_ABI,
  SIGNER_ADDRESS,
  ClaimSignature,
  validateClaimSignature
} from '~/lib/contracts';
import { AddressPatterns } from '~/lib/blockchain-addresses';

/**
 * Claiming transaction states
 */
export type ClaimingState = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

/**
 * Claiming hook return type
 */
export interface UseContractClaimingReturn {
  /** Current claiming state */
  state: ClaimingState;
  
  /** Transaction hash if pending/confirming */
  transactionHash: `0x${string}` | null;
  
  /** Error message if failed */
  error: string | null;
  
  /** Claim prize for a token */
  claimPrize: (
    tokenId: number, 
    claimSig: ClaimSignature, 
    recipient?: Address
  ) => Promise<void>;
  
  /** Claim prize with bonus for friend */
  claimPrizeWithBonus: (
    tokenId: number, 
    claimSig: ClaimSignature, 
    recipient?: Address,
    bonusRecipient?: Address
  ) => Promise<void>;
  
  /** Reset state */
  reset: () => void;
  
  /** Whether user can claim */
  canClaim: boolean;
}

/**
 * Custom hook for contract prize claiming functionality
 * Replaces traditional API-based prize processing
 */
export const useContractClaiming = (): UseContractClaimingReturn => {
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

  // Local state
  const [state, setState] = useState<ClaimingState>('idle');
  const [error, setError] = useState<string | null>(null);

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

  // Claim prize
  const claimPrize = useCallback(async (
    tokenId: number, 
    claimSig: ClaimSignature, 
    recipient?: Address
  ) => {
    try {
      // Validate claim signature
      if (!validateClaimSignature(claimSig)) {
        throw new Error('Invalid claim signature format');
      }

      setState('pending');
      setError(null);

      writeContract({
        address: SCRATCH_CARD_NFT_ADDRESS,
        abi: SCRATCH_CARD_NFT_ABI,
        functionName: 'claimPrize',
        args: [
          BigInt(tokenId),
          claimSig,
          AddressPatterns.safeRecipient(recipient) // Use zero address for self
        ],
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim prize';
      setError(errorMessage);
      setState('error');
      console.error('Claiming error:', err);
    }
  }, [writeContract]);

  // Claim prize with bonus
  const claimPrizeWithBonus = useCallback(async (
    tokenId: number, 
    claimSig: ClaimSignature, 
    recipient?: Address,
    bonusRecipient?: Address
  ) => {
    try {
      // Validate inputs
      if (!validateClaimSignature(claimSig)) {
        throw new Error('Invalid claim signature format');
      }

      if (!bonusRecipient) {
        throw new Error('Bonus recipient address is required');
      }

      setState('pending');
      setError(null);

      writeContract({
        address: SCRATCH_CARD_NFT_ADDRESS,
        abi: SCRATCH_CARD_NFT_ABI,
        functionName: 'claimPrizeWithBonus',
        args: [
          BigInt(tokenId),
          claimSig,
          AddressPatterns.safeRecipient(recipient), // Use zero address for self
          bonusRecipient
        ],
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim prize with bonus';
      setError(errorMessage);
      setState('error');
      console.error('Bonus claiming error:', err);
    }
  }, [writeContract]);

  // Reset state
  const reset = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

  // Can claim if not currently processing
  const canClaim = useMemo(() => {
    return state === 'idle' || state === 'success';
  }, [state]);

  return {
    state,
    transactionHash: hash || null,
    error,
    claimPrize,
    claimPrizeWithBonus,
    reset,
    canClaim,
  };
};

/**
 * Hook to get token data for claiming
 */
export const useTokenData = (tokenId: number | null) => {
  const { data, isLoading, error } = useReadContract(
    tokenId ? {
      address: SCRATCH_CARD_NFT_ADDRESS,
      abi: SCRATCH_CARD_NFT_ABI,
      functionName: 'getTokenData',
      args: [BigInt(tokenId)],
    } : {
      address: SCRATCH_CARD_NFT_ADDRESS,
      abi: SCRATCH_CARD_NFT_ABI,
      functionName: 'getTokenData',
      args: undefined,
    }
  );

  return {
    tokenData: data,
    isLoading,
    error,
  };
};

/**
 * Hook to verify if token can be claimed
 */
export const useTokenClaimability = (tokenId: number | null, userAddress: Address | null) => {
  const { data: tokenData, isLoading: isLoadingTokenData } = useReadContract(
    tokenId ? {
      address: SCRATCH_CARD_NFT_ADDRESS,
      abi: SCRATCH_CARD_NFT_ABI,
      functionName: 'getTokenData',
      args: [BigInt(tokenId)],
    } : {
      address: SCRATCH_CARD_NFT_ADDRESS,
      abi: SCRATCH_CARD_NFT_ABI,
      functionName: 'getTokenData',
      args: undefined,
    }
  ) as {
    data: { claimed: boolean; registeredAt: bigint; tokenAddress: Address } | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  const { data: owner, isLoading: isLoadingOwner } = useReadContract(
    tokenId ? {
      address: SCRATCH_CARD_NFT_ADDRESS,
      abi: SCRATCH_CARD_NFT_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    } : {
      address: SCRATCH_CARD_NFT_ADDRESS,
      abi: SCRATCH_CARD_NFT_ABI,
      functionName: 'ownerOf',
      args: undefined,
    }
  ) as {
    data: Address | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  const canClaim = useMemo(() => {
    if (!tokenData || !owner || !userAddress) return false;
    
    return (
      !tokenData.claimed && // Not already claimed
      owner.toLowerCase() === userAddress.toLowerCase() // User owns the token
    );
  }, [tokenData, owner, userAddress]);

  return {
    canClaim,
    isClaimed: tokenData?.claimed || false,
    owner,
    tokenData,
    isLoading: isLoadingTokenData || isLoadingOwner,
  };
};

/**
 * Hook to create claim signatures (server-side replacement)
 * In production, this should be done by your backend server
 */
export const useClaimSignature = () => {
  const createSignature = useCallback(async (
    tokenId: number,
    _prizeAmount?: number,
    _tokenAddress?: Address,
    _deadline?: number
  ): Promise<ClaimSignature> => {
    try {
      // Get user wallet from localStorage (this should be passed from context in a better implementation)
      const userWallet = localStorage.getItem('user_wallet');
      
      if (!userWallet) {
        throw new Error('User wallet not found. Please connect your wallet.');
      }

      // Call the server endpoint to generate signature
      const response = await fetch('/api/cards/generate-claim-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId,
          userWallet,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate claim signature');
      }

      if (!result.success) {
        throw new Error('Failed to generate claim signature');
      }

      // Convert the returned signature to the expected format
      const claimSignature: ClaimSignature = {
        prizeAmount: BigInt(result.signature.prizeAmount),
        tokenAddress: result.signature.tokenAddress as Address,
        deadline: BigInt(result.signature.deadline),
        signature: result.signature.signature as `0x${string}`,
      };

      return claimSignature;
    } catch (error) {
      console.error('Error creating claim signature:', error);
      throw error;
    }
  }, []);

  return {
    createSignature,
  };
};

/**
 * Hook to listen for claiming events
 * Replaces polling for prize updates
 */
export const useClaimingEvents = () => {
  // TODO: Implement event listening with useWatchContractEvent
  // This will replace current API-based approach
  
  return {
    claimedPrizes: [],
    bonusCards: [],
  };
};

/**
 * Utility function to verify claim signature on client side
 */
export const verifyClaimSignature = async (
  tokenId: number,
  prizeAmount: number,
  tokenAddress: Address,
  deadline: number,
  signature: `0x${string}`
): Promise<boolean> => {
  try {
    // Recreate the message hash
    const message = hashMessage(
      JSON.stringify({
        tokenId,
        prizeAmount,
        tokenAddress,
        deadline
      })
    );

    // Recover the signer address
    const recoveredAddress = await recoverAddress({
      hash: message,
      signature,
    });

    // Check if the signer matches our expected signer
    return recoveredAddress.toLowerCase() === SIGNER_ADDRESS.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

/**
 * Hook to get contract statistics
 * Replaces app stats API
 */
export const useContractStats = () => {
  const { data, isLoading, error } = useReadContract({
    address: SCRATCH_CARD_NFT_ADDRESS,
    abi: SCRATCH_CARD_NFT_ABI,
    functionName: 'getStats',
  });

  return {
    stats: data,
    isLoading,
    error,
  };
};