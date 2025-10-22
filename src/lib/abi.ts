export const SCRATCH_CARD_ABI = [
  // Views
  "function cardPrice() view returns (uint256)",
  "function maxBatchSize() view returns (uint256)",
  "function getStats() view returns (uint256 totalRegistered, uint256 totalClaimed, uint256 totalDistributed, uint256 balance)",
  "function getCard(bytes32 recordId) view returns (address owner, uint256 prizeAmount, bool claimed, uint256 registeredAt)",
  "function getUserCards(address user) view returns (bytes32[])",

  // Actions
  "function registerCards(bytes32[] recordIds, uint256[] prizeAmounts, tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[2] publicSignals)[] proofs) payable",
  "function claimPrize(bytes32 recordId, tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[2] publicSignals) proof)",

  // Events
  "event CardsRegistered(address indexed buyer, bytes32[] recordIds, uint256[] prizeAmounts, uint256 totalPaid, uint256 timestamp)",
  "event PrizeClaimed(bytes32 indexed recordId, address indexed winner, uint256 prizeAmount, uint256 timestamp)",
] as const;

export const SCRATCH_CARD_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) ||
  ("0xA010347FA956fCd3E19a5d0311b7b68C459916Db" as `0x${string}`);

export const BASE_SEPOLIA_CHAIN_ID = 84532;