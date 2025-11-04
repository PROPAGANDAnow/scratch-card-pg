import { Card, Prisma } from "@prisma/client";
import { Address, createPublicClient, http, isAddress } from "viem";
import { base } from "viem/chains";
import { SCRATCH_CARD_NFT_ABI, ZERO_ADDRESS } from "~/lib/blockchain";
import { PRIZE_ASSETS } from "~/lib/constants";
import { drawPrize } from "~/lib/drawPrize";
import { generateNumbers } from "~/lib/generateNumbers";
import { prisma } from "~/lib/prisma";

interface GetTokensInBatchArgs {
  tokenIds: number[];
  friends: number[];
  recipient: string;
  contractAddress: string;
}

/**
 * Creates multiple scratch card tokens in batch
 * @param args - The arguments for token creation
 * @returns Promise<Card[]> - Array of created card records
 * @throws Error - If contract address is invalid or payment token is not found
 */
export const getTokensInBatch = async (args: GetTokensInBatchArgs): Promise<Card[]> => {
  const { tokenIds, friends = [], recipient, contractAddress } = args;

  const publicClient = await createPublicClient({
    chain: base,
    transport: http(),
  });

  if (!isAddress(contractAddress)) {
    throw new Error(`not a valid nft contract address, got: ${contractAddress}`);
  }

  const paymentToken = await publicClient.readContract({
    address: isAddress(contractAddress) ? contractAddress : ZERO_ADDRESS,
    abi: SCRATCH_CARD_NFT_ABI,
    functionName: 'getPaymentTokenAddress',
    args: [],
  }) as Address;

  if (!paymentToken) {
    throw new Error(`payment token from the nft contract is not valid, got ${paymentToken}`);
  }

  const cardsData: Prisma.CardCreateInput[] = [];

  for (const tokenId of tokenIds) {
    // Generate prize and card data for each token
    const prize = drawPrize(friends.length > 0); // e.g., 0 | 0.5 | 1 | 2 (check if friends available for free cards)

    // build 12 cells (3x4) with one winning row if prize > 0
    const numbers = generateNumbers({
      prizeAmount: prize,
      prizeAsset: paymentToken,
      decoyAmounts: [0.5, 0.75, 1, 1.5, 2, 5, 10],
      decoyAssets: PRIZE_ASSETS as unknown as string[],
      friends: friends || [],
    });

    // Create card data for this token
    const cardData: Prisma.CardCreateInput = {
      prize_amount: prize,
      prize_asset_contract: paymentToken,
      numbers_json: numbers as Prisma.InputJsonValue,
      token_id: tokenId, // Use tokenId as token_id
      contract_address: contractAddress, // Placeholder for NFT contract
      minter: {
        connect: { address: recipient }
      }
    };

    cardsData.push(cardData);
  }

  // check how many have already in db
  const existingCards = await prisma.card.findMany({
    where: {
      token_id: { in: tokenIds },
      contract_address: contractAddress
    },
    select: { token_id: true }
  });

  const existingTokenIds = new Set(existingCards.map(card => card.token_id));

  // create a filtered array from the cards that are not in the db already
  const newCardsData = cardsData.filter(card => !existingTokenIds.has(card.token_id as number));

  // Create cards individually to handle relations properly
  const createdCards: Card[] = [];
  for (const cardData of newCardsData) {
    const createdCard = await prisma.card.create({
      data: cardData
    });
    createdCards.push(createdCard);
  }

  return createdCards;
};