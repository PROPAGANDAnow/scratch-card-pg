import { useQuery } from '@tanstack/react-query';
import { OwnedNft } from '~/types/alchemy';

interface UseUserNftsParams {
  userWallet: string | undefined | null;
  contractAddress?: string;
  enabled?: boolean;
}

interface NftWithDetails extends OwnedNft {
  scratched: boolean;
  prizeAmount: number | null;
  claimed: boolean;
  prizeWon: boolean;
  existsInDb: boolean;
  createdAt: string | null;
  scratchedAt: string | null;
}

interface UserNftsResponse {
  ownedNfts: NftWithDetails[];
  totalCount: number;
  validAt: {
    blockNumber: number;
    blockHash: string;
    blockTimestamp: string;
  };
}

export function useUserNfts({
  userWallet,
  contractAddress,
  enabled = true
}: UseUserNftsParams) {
  return useQuery({
    queryKey: ['userNfts', userWallet, contractAddress],
    queryFn: async (): Promise<UserNftsResponse> => {
      if (!userWallet) {
        throw new Error('userWallet is required');
      }

      // Validate wallet address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(userWallet)) {
        throw new Error('Invalid wallet address format');
      }

      // Build API URL
      const apiUrl = `/api/cards/get-by-owner?userWallet=${userWallet}`;
      if (contractAddress) {
        // The API endpoint already uses the contract address from blockchain config
        // but we keep it here for flexibility if needed in the future
      }

      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch NFTs');
      }

      return data.data;
    },
    enabled: enabled && !!userWallet,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message.includes('403')) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
}