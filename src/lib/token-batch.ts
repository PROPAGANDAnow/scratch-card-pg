import { Card, Prisma } from "@prisma/client";
import { Address, createPublicClient, http, isAddress } from "viem";
import { base } from "viem/chains";
import { SCRATCH_CARD_NFT_ABI, ZERO_ADDRESS } from "~/lib/blockchain";
import { PRIZE_ASSETS } from "~/lib/constants";
import { drawPrize } from "~/lib/drawPrize";
import { generateNumbers } from "~/lib/generateNumbers";
import { prisma } from "~/lib/prisma";
import { getOrCreateUserByAddress } from "./neynar-users";

// Configuration constants
const DECOY_AMOUNTS = [0.5, 0.75, 1, 1.5, 2, 5, 10] as const;
const DATABASE_RETRY_CODE = 'P2002';

interface GetTokensInBatchArgs {
  tokenIds: number[];
  friends: { fid: number }[];
  recipient: string;
  contractAddress: string;
}

interface CardDataInput {
  prize_amount: number;
  prize_asset_contract: Address;
  numbers_json: Prisma.InputJsonValue;
  token_id: number;
  contract_address: string;
}

interface BatchResult {
  existingCards: Card[];
  createdCards: Card[];
  allCards: Card[];
}

/**
 * Validates the contract address and retrieves payment token
 * @param contractAddress - The NFT contract address to validate
 * @returns Payment token address
 * @throws Error if contract address is invalid or payment token is not found
 */
async function validateContractAndGetPaymentToken(contractAddress: string): Promise<Address> {
  if (!isAddress(contractAddress)) {
    throw new Error(`Invalid NFT contract address: ${contractAddress}`);
  }

  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  try {
    const paymentToken = await publicClient.readContract({
      address: contractAddress,
      abi: SCRATCH_CARD_NFT_ABI,
      functionName: 'getPaymentTokenAddress',
    }) as Address;

    if (!paymentToken || paymentToken === ZERO_ADDRESS) {
      throw new Error(`Invalid payment token retrieved: ${paymentToken}`);
    }

    return paymentToken;
  } catch (error) {
    throw new Error(`Failed to retrieve payment token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Finds existing cards in the database for given token IDs and contract
 * @param tokenIds - Array of token IDs to search for
 * @param contractAddress - Contract address to filter by
 * @returns Array of existing cards
 */
async function findExistingCards(
  tokenIds: number[],
  contractAddress: string
): Promise<Card[]> {
  return prisma.card.findMany({
    where: {
      token_id: { in: tokenIds },
      contract_address: contractAddress,
    },
  });
}

/**
 * Generates card data for new tokens
 * @param newTokenIds - Token IDs that don't exist in the database
 * @param friends - Array of friends' FIDs
 * @param paymentToken - Payment token address
 * @param contractAddress - Contract address
 * @returns Array of card data ready for creation
 */
function generateCardsData(
  newTokenIds: number[],
  friends: { fid: number }[],
  paymentToken: Address,
  contractAddress: string
): CardDataInput[] {
  const hasFriends = friends.length > 0;

  return newTokenIds.map((tokenId) => {
    const prize = drawPrize(hasFriends);

    const numbers = generateNumbers({
      prizeAmount: prize,
      prizeAsset: paymentToken,
      decoyAmounts: DECOY_AMOUNTS,
      decoyAssets: PRIZE_ASSETS as unknown as string[],
      friends,
    });

    return {
      prize_amount: prize,
      prize_asset_contract: paymentToken,
      numbers_json: numbers as Prisma.InputJsonValue,
      token_id: tokenId,
      contract_address: contractAddress,
    };
  });
}

/**
 * Creates cards in the database with proper error handling for duplicates
 * @param cardsData - Array of card data to create
 * @param minterUserId - ID of the user creating the cards
 * @returns Array of successfully created or retrieved cards
 */
async function createCardsWithDuplicateHandling(
  cardsData: CardDataInput[],
  minterUserId: string
): Promise<Card[]> {
  const createdCards: Card[] = [];

  for (const cardData of cardsData) {
    try {
      // Try to create the card first
      const createdCard = await prisma.card.create({
        data: {
          ...cardData,
          minter_user_id: minterUserId,
        },
      });
      createdCards.push(createdCard);
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === DATABASE_RETRY_CODE) {
        const existingCard = await findExistingCardForRetry(cardData);
        if (existingCard) {
          createdCards.push(existingCard);
        } else {
          throw new Error(`Failed to create or find card with token_id: ${cardData.token_id}`);
        }
      } else {
        // Re-throw other errors
        throw new Error(`Failed to create card with token_id ${cardData.token_id}: ${error.message}`);
      }
    }
  }

  return createdCards;
}

/**
 * Helper function to find an existing card during retry
 * @param cardData - Card data to search for
 * @returns Existing card or null if not found
 */
async function findExistingCardForRetry(cardData: CardDataInput): Promise<Card | null> {
  // First try with the specific contract address
  let existingCard = await prisma.card.findFirst({
    where: {
      token_id: cardData.token_id,
      contract_address: cardData.contract_address,
    },
  });

  // If not found, try without contract address (fallback)
  if (!existingCard) {
    existingCard = await prisma.card.findUnique({
      where: { token_id: cardData.token_id },
    });
  }

  return existingCard;
}

/**
 * Combines and sorts cards by token ID
 * @param existingCards - Array of existing cards
 * @param createdCards - Array of newly created cards
 * @returns Combined and sorted array of all cards
 */
function combineAndSortCards(existingCards: Card[], createdCards: Card[]): Card[] {
  // Create a Map to deduplicate cards by token_id
  const allCardsMap = new Map<number, Card>();

  // Add existing cards
  existingCards.forEach(card => {
    allCardsMap.set(card.token_id, card);
  });

  // Add or override with created cards (in case they were already in existing)
  createdCards.forEach(card => {
    allCardsMap.set(card.token_id, card);
  });

  // Convert back to array and sort by token_id
  return Array.from(allCardsMap.values()).sort((a, b) => a.token_id - b.token_id);
}

/**
 * Creates multiple scratch card tokens in batch
 *
 * This function:
 * 1. Validates the contract address and retrieves payment token
 * 2. Checks which tokens already exist in the database
 * 3. Generates prize and card data for new tokens
 * 4. Creates new cards with proper duplicate handling
 * 5. Returns all cards (existing + new) sorted by token ID
 *
 * @param args - The arguments for token creation
 * @returns Promise<Card[]> - Array of all card records (existing + created)
 * @throws Error - If contract address is invalid, payment token is not found, or user not found
 */
export const getTokensInBatch = async (args: GetTokensInBatchArgs): Promise<Card[]> => {
  const { tokenIds, friends = [], recipient, contractAddress } = args;

  // Step 1: Validate inputs and get payment token
  const [paymentToken, minterUser] = await Promise.all([
    validateContractAndGetPaymentToken(contractAddress),
    getOrCreateUserByAddress(recipient),
  ]);

  if (!minterUser) {
    throw new Error(`User not found for address: ${recipient}`);
  }

  // Step 2: Find existing cards
  const existingCards = await findExistingCards(tokenIds, contractAddress);

  // Step 3: Identify which tokens need to be created
  const existingTokenIds = new Set(existingCards.map(card => card.token_id));
  const newTokenIds = tokenIds.filter(tokenId => !existingTokenIds.has(tokenId));

  // Step 4: Generate data for new cards (skip if no new cards)
  const cardsData = newTokenIds.length > 0
    ? generateCardsData(newTokenIds, friends, paymentToken, contractAddress)
    : [];

  // Step 5: Create new cards with duplicate handling
  const createdCards = cardsData.length > 0
    ? await createCardsWithDuplicateHandling(cardsData, minterUser.id)
    : [];

  // Step 6: Combine, deduplicate, and sort all cards
  return combineAndSortCards(existingCards, createdCards);
};

/**
 * Batch create cards for multiple recipients
 * @param requests - Array of batch requests for different recipients
 * @returns Promise<Array<Card[]>> - Array of card arrays, one for each recipient
 */
export const getTokensInBatchForMultipleRecipients = async (
  requests: GetTokensInBatchArgs[]
): Promise<Card[][]> => {
  const results = await Promise.allSettled(
    requests.map(request => getTokensInBatch(request))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`Failed to process batch ${index}:`, result.reason);
      throw new Error(`Batch ${index} failed: ${result.reason instanceof Error ? result.reason.message : 'Unknown error'}`);
    }
  });
};

// Export types for use in other modules
export type { GetTokensInBatchArgs, CardDataInput, BatchResult };