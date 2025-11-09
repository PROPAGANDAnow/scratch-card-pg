// Centralized export for all subgraph hooks
export { useContractStats } from './useContractStats'
export { useRecentActivity } from './useRecentActivity'
export { useUserActivity } from './useUserActivity'
export { useUserStats } from './useUserStats'
export { useUserTokens } from './useUserTokens'

// Export contract and blockchain hooks
export { useContractMinting, useMintingCost, useMintingEvents, useUserCards } from './useContractMinting'
export { useERC20Approval, useUSDCBalance } from './useERC20Approval'

// Export UI actions hook
export { useUIActions } from './useUIActions'
export { useUpdateCardClaimStatus } from './useUpdateCardClaimStatus'
export { useTrackScratch } from './useTrackScratch'

// Export types
export type { MintingState, TransactionReceipt, UseContractMintingReturn } from './useContractMinting'
export type { ContractStats, FormattedContractStats, UseContractStatsReturn } from './useContractStats'
export type { ApprovalState, UseERC20ApprovalReturn } from './useERC20Approval'
export type { FormattedRecentClaim, FormattedRecentMint, RecentClaim, RecentMint, UseRecentActivityReturn } from './useRecentActivity'
export type { MintOperation, PrizeClaim, UserActivity } from './useUserActivity'
export type { UserStats } from './useUserStats'
export type { Token, TokenWithState, UseUserTokensReturn } from './useUserTokens'
export type {
  UpdateCardClaimStatusPayload,
  UpdateCardClaimStatusResult,
  ClaimStatusMutationError,
} from './useUpdateCardClaimStatus'
export type {
  UpdateCardScratchStatusPayload,
  UpdateCardScratchStatusResult,
  ScratchStatusMutationError,
} from './useTrackScratch'
