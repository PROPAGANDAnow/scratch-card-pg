import { NextRequest, NextResponse } from "next/server";
import { getBestFriends } from "~/lib/best-friends";
import { generateNumbers } from "~/lib/generateNumbers";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const fid = url.searchParams.get('fid');

    if (!fid) {
      return NextResponse.json({
        error: 'fid parameter required. Usage: /api/test-friends?fid=123'
      }, { status: 400 });
    }

    console.log('🧪 Testing friend generation for FID:', fid);

    // Fetch friends
    const friends = await getBestFriends(parseInt(fid));
    console.log('📋 Fetched friends:', friends.length);

    // Generate a test card with friends
    const testCard = generateNumbers({
      prizeAmount: -1, // Friend win
      prizeAsset: '0x123' as `0x${string}`,
      decoyAmounts: [0.5, 1, 2],
      decoyAssets: ['0x123'],
      friends,
      forceFriends: true
    });

    // Count friend cells
    const friendCells = testCard.filter(cell => cell.friend_fid && cell.friend_fid > 0);

    return NextResponse.json({
      success: true,
      data: {
        fid: parseInt(fid),
        friendsCount: friends.length,
        friends: friends.map(f => ({ fid: f.fid, username: f.username, hasPfp: !!f.pfp })),
        cardCells: testCard.map((cell, index) => ({
          index,
          row: Math.floor(index / 3),
          col: index % 3,
          amount: cell.amount,
          friend_fid: cell.friend_fid,
          friend_username: cell.friend_username,
          hasPfp: !!cell.friend_pfp
        })),
        friendCellsCount: friendCells.length,
        friendCells: friendCells.map(cell => ({
          fid: cell.friend_fid,
          username: cell.friend_username,
          hasPfp: !!cell.friend_pfp
        }))
      }
    });

  } catch (error) {
    console.error('Test friends error:', error);
    return NextResponse.json({
      error: "Test failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}