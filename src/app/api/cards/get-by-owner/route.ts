import { NextRequest, NextResponse } from "next/server";
import { SCRATCH_CARD_NFT_ADDRESS, USDC_ADDRESS } from "~/lib/blockchain";
import { prisma } from "~/lib/prisma";
import { AlchemyNftResponse, OwnedNft } from "~/types/alchemy";

interface Token {
  id: string
  owner: string
  contract: string
  batchId: string
  prizeToken: string
  prizeAmount: string
  claimed: boolean
  mintedAt: string
  claimedAt: string | null
  stateChanges: Array<{
    id: string
    state: string
    timestamp: string
  }>
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userWallet = url.searchParams.get('userWallet');

    if (!userWallet) {
      return NextResponse.json(
        { error: 'userWallet is required' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userWallet)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Fetch NFTs from Alchemy API on Base network
    const apiUrl = `https://base-mainnet.g.alchemy.com/nft/v3/j8Enyeq67txvTS5IlCNWZ/getNFTsForOwner?owner=${userWallet}&contractAddresses%5B%5D=${SCRATCH_CARD_NFT_ADDRESS}&withMetadata=true`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
    }

    const data: AlchemyNftResponse = await response.json();

    // Get token IDs from the NFTs
    const tokenIds = data.ownedNfts.map(nft => parseInt(nft.tokenId));

    // Check which cards exist in our database
    const existingCardsInDb = await prisma.card.findMany({
      where: {
        token_id: {
          in: tokenIds
        }
      },
      select: {
        token_id: true,
        scratched: true,
        prize_amount: true,
        claimed: true,
        prize_won: true,
        created_at: true,
        scratched_at: true,
      }
    });

    // Combine Alchemy data with our database data and transform to Token interface
    const tokens = data.ownedNfts.map((nft: OwnedNft) => {
      const dbCard = existingCardsInDb.find(card => card.token_id === parseInt(nft.tokenId));

      return {
        // Token interface fields
        id: `${SCRATCH_CARD_NFT_ADDRESS}-${nft.tokenId}`, // Composite ID to match GraphQL format
        owner: userWallet.toLowerCase(),
        contract: SCRATCH_CARD_NFT_ADDRESS,
        prizeToken: USDC_ADDRESS, // Not available from Alchemy
        prizeAmount: dbCard?.prize_amount?.toString() || '0',
        claimed: dbCard?.claimed ?? false,
        mintedAt: new Date(parseInt(nft.timeLastUpdated) * 1000).toISOString(),
        claimedAt: dbCard?.scratched_at?.toISOString() || null,
        stateChanges: [], // Not available from Alchemy

        // Additional metadata for UI
        metadata: {
          tokenId: nft.tokenId,
          name: nft.name,
          description: nft.description,
          image: nft.image.cachedUrl || nft.image.originalUrl || null,
          contractAddress: nft.contract.address,
          tokenType: nft.tokenType,
          balance: nft.balance,
          timeLastUpdated: nft.timeLastUpdated,
          contract: {
            address: nft.contract.address,
            name: nft.contract.name,
            symbol: nft.contract.symbol,
            tokenType: nft.contract.tokenType,
            openSeaMetadata: nft.contract.openSeaMetadata,
          },
          raw: nft.raw,
          tokenUri: nft.tokenUri,
          scratched: dbCard?.scratched ?? false,
          prizeWon: dbCard?.prize_won ?? false,
          existsInDb: !!dbCard,
          createdAt: dbCard?.created_at?.toISOString() || null,
          scratchedAt: dbCard?.scratched_at?.toISOString() || null,
        }
      };
    });

    // Filter available cards (unscratched)
    const availableCards = tokens.filter(token => !token.metadata?.scratched && !token.claimed);

    return NextResponse.json({
      success: true,
      data: {
        tokens,
        availableCards,
        totalCount: tokens.length,
        validAt: data.validAt
      }
    });

  } catch (error) {
    console.error('Error fetching NFTs for owner:', error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}