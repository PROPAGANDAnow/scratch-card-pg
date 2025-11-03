import { NextRequest, NextResponse } from "next/server";
import { SCRATCH_CARD_NFT_ADDRESS } from "~/lib/blockchain";
import { prisma } from "~/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const tokenIdsParam = url.searchParams.get('tokenIds');
    const userWallet = url.searchParams.get('userWallet');

    if (!tokenIdsParam || !userWallet) {
      return NextResponse.json(
        { error: 'tokenIds and userWallet are required' },
        { status: 400 }
      );
    }

    const tokenIds = tokenIdsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0);

    if (tokenIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid token ID is required' },
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

    const apiUrl = 'https://eth-mainnet.g.alchemy.com/nft/v3/sRkRYI0S4IB-LNkxhcjlE/getNFTMetadataBatch';
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens: tokenIds.map(tokenId => ({ tokenId, contractAddress: SCRATCH_CARD_NFT_ADDRESS }))
      })
    };

    try {
      const response = await fetch(apiUrl, options);
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error(error);
    }

    const existingCards: any[] = []; // TODO: Implement actual NFT checking logic

    return NextResponse.json({
      success: true,
      existingCards,
      count: existingCards.length
    });

  } catch (error) {
    console.error('Error in batch check cards:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}