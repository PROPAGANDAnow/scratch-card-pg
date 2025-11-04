// API Response Interfaces

// Base API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Token API Responses
export interface TokenData {
  id: number;
  token_id: number;
  owner_wallet: string;
  prize_amount: number;
  scratched: boolean;
  scratched_at?: Date | null;
  claimed: boolean;
  claimed_at?: Date | null;
  created_at: Date;
  updated_at: Date;
  numbers_json: any;
}

export interface TokensResponse {
  tokens: TokenData[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ProofData {
  tokenId: number;
  proof: string;
  owner: string;
  isValid: boolean;
  expiresAt?: number;
}

export interface ScratchResponse {
  tokenId: number;
  scratched: boolean;
  prizeAmount: number;
  scratchedAt: Date;
  revealed: {
    amount: number;
    asset: string;
  }[];
}

export interface BatchClaimResponse {
  successful: number[];
  failed: {
    tokenId: number;
    error: string;
  }[];
  totalPrize: number;
  signatures: {
    tokenId: number;
    signature: string;
    prizeAmount: number;
    tokenAddress: string;
    deadline: number;
  }[];
}

// Leaderboard API Response
export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  fid: number;
  username: string;
  pfp: string;
  totalWon: number;
  totalScratched: number;
  totalWins: number;
  winRate: number;
  biggestWin: number;
  lastActive: Date;
  level: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  userRank?: LeaderboardEntry;
  totalEntries: number;
  timeframe: 'all' | 'daily' | 'weekly' | 'monthly';
  lastUpdated: Date;
}

// Stats API Response
export interface AppStats {
  totalUsers: number;
  totalCards: number;
  totalScratched: number;
  totalWon: number;
  totalClaimed: number;
  activeUsers24h: number;
  topPrize: number;
  averagePrize: number;
  cardsCreatedToday: number;
  winnersToday: number;
}

export interface UserStats {
  totalCards: number;
  totalScratched: number;
  totalWon: number;
  totalClaimed: number;
  winRate: number;
  averagePrize: number;
  biggestWin: number;
  currentStreak: number;
  level: number;
  revealsToNextLevel: number;
}

// Activity Feed Response
export interface ActivityEntry {
  id: string;
  type: 'scratch' | 'win' | 'claim' | 'buy';
  user: {
    fid: number;
    username: string;
    pfp: string;
    wallet: string;
  };
  tokenId?: number;
  amount?: number;
  timestamp: Date;
  metadata?: any;
}

export interface ActivityResponse {
  activities: ActivityEntry[];
  total: number;
  hasMore: boolean;
}