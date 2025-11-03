import { NextRequest, NextResponse } from "next/server";

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

    const apiUrl = 'https://eth-mainnet.g.alchemy.com/nft/v3/docs-demo/getNFTsForOwner?owner=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const options = { method: 'GET' };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error(error);
    }

    try {
      const response = await fetch(apiUrl, options);
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error(error);
    }

    return NextResponse.json({
      success: true,
      existingCards: [],
      count: 0
    });

  } catch (error) {
    console.error('Error in batch check cards:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}