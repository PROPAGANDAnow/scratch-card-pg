import { useQuery } from '@tanstack/react-query';

interface PrizePoolData {
  totalPrizePool: number;
  claimedCardsCount: number;
  totalCardsMinted: number;
  lastUpdated: Date;
}

interface PrizePoolResponse {
  success: boolean;
  data: PrizePoolData;
}

const fetchPrizePool = async (): Promise<PrizePoolData> => {
  const response = await fetch('/api/prize-pool');
  
  if (!response.ok) {
    throw new Error('Failed to fetch prize pool data');
  }
  
  const result: PrizePoolResponse = await response.json();
  
  if (!result.success) {
    throw new Error('Failed to fetch prize pool data');
  }
  
  return result.data;
};

export const usePrizePool = () => {
  return useQuery<PrizePoolData>({
    queryKey: ['prizePool'],
    queryFn: fetchPrizePool,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};