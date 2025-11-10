import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { getBestFriends } from "~/lib/best-friends";
import { SCRATCH_CARD_NFT_ADDRESS, ZERO_ADDRESS } from "~/lib/blockchain";
import { prisma } from "~/lib/prisma";
import { getTokensInBatch, BestFriend } from "~/lib/token-batch";
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
        },
        scratched: false,
        claimed: false
      },
    });

    const totalCardCount = await prisma.card.count({
      where: {
        minter: {
          address: userWallet
        }
      }
    })

    // Get user with fid to fetch friends if needed
    const user = await prisma.user.findUnique({
      where: { address: userWallet.toLowerCase() },
      select: { fid: true }
    });

    console.log('👤 User lookup result:', {
      address: userWallet,
      hasUser: !!user,
      fid: user?.fid
    });

    // Fetch friends if user has fid
    let friends: BestFriend[] = [];
    if (user?.fid) {
      try {
        const bestFriends = await getBestFriends(user.fid);
        console.log('🎯 Fetched best friends:', bestFriends.length, 'friends for FID:', user.fid);
        friends = bestFriends; // Pass full friend objects
      } catch (error) {
        console.error('Failed to fetch friends:', error);
        // Continue without friends if fetching fails
      }
    } else {
      console.log('⚠️ No FID found for user, no friends will be available');
    }

    // Check for test mode (force friends to appear)
    const forceFriends = url.searchParams.get('forceFriends') === 'true' ||
      process.env.NODE_ENV === 'development'; // Auto-enable in dev

    const newlyCreatedTokens = await getTokensInBatch({
      tokenIds,
      friends, // Pass full friend objects
      recipient: userWallet,
      contractAddress: isAddress(SCRATCH_CARD_NFT_ADDRESS) && SCRATCH_CARD_NFT_ADDRESS || ZERO_ADDRESS,
      forceFriends
    })

    // Combine Alchemy data with our database data and transform to Token interface
    const tokens = data.ownedNfts.map((nft: OwnedNft) => {
      const dbCard = [...existingCardsInDb, ...newlyCreatedTokens].find(card => card.token_id === parseInt(nft.tokenId));

      // Debug: Log friend data for newly created cards
      if (dbCard && newlyCreatedTokens.includes(dbCard)) {
        const friendCells = (dbCard.numbers_json as Array<{ friend_fid?: number; friend_username?: string; friend_pfp?: string }>).filter(cell => cell.friend_fid && cell.friend_fid > 0);
        console.log(`🆕 New card ${dbCard.token_id} has ${friendCells.length} friend cells:`,
          friendCells.map(cell => ({ fid: cell.friend_fid, username: cell.friend_username, hasPfp: !!cell.friend_pfp })));
      }

      return {
        id: nft.tokenId,
        state: dbCard,
        metadata: nft
      };
    });

    // Filter available cards (unscratched)
    const availableCards = tokens.filter(a => !a.state?.scratched);

    return NextResponse.json({
      success: true,
      data: {
        availableCards,
        totalCount: totalCardCount,
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