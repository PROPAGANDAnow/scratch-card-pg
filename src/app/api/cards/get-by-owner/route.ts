import { NextRequest, NextResponse } from "next/server";
import { SCRATCH_CARD_NFT_ADDRESS } from "~/lib/blockchain";
import { prisma } from "~/lib/prisma";
import { AlchemyNftResponse, OwnedNft } from "~/types/alchemy";

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

    // Combine Alchemy data with our database data
    const cardsWithDetails = data.ownedNfts.map((nft: OwnedNft) => {
      const dbCard = existingCardsInDb.find(card => card.token_id === parseInt(nft.tokenId));

      return {
        // Alchemy NFT fields
        tokenId: nft.tokenId,
        name: nft.name,
        description: nft.description,
        image: nft.image.cachedUrl || nft.image.originalUrl || null,
        contractAddress: nft.contract.address,
        tokenType: nft.tokenType,
        balance: nft.balance,
        timeLastUpdated: nft.timeLastUpdated,

        // Contract metadata
        contract: {
          address: nft.contract.address,
          name: nft.contract.name,
          symbol: nft.contract.symbol,
          tokenType: nft.contract.tokenType,
          openSeaMetadata: nft.contract.openSeaMetadata,
        },

        // Raw metadata
        raw: nft.raw,
        tokenUri: nft.tokenUri,

        // Database-specific fields
        scratched: dbCard?.scratched ?? false,
        prizeAmount: dbCard?.prize_amount ?? null,
        claimed: dbCard?.claimed ?? false,
        prizeWon: dbCard?.prize_won ?? false,
        existsInDb: !!dbCard,
        createdAt: dbCard?.created_at?.toISOString() || null,
        scratchedAt: dbCard?.scratched_at?.toISOString() || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ownedNfts: cardsWithDetails,
        totalCount: cardsWithDetails.length,
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