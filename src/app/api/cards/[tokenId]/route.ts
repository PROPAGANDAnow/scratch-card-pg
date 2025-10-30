import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params;

    if (!tokenId) {
      return NextResponse.json(
        { error: "Missing tokenId parameter" },
        { status: 400 }
      );
    }

    // Fetch the card by tokenId (card_no)
    const card = await prisma.card.findUnique({
      where: { card_no: parseInt(tokenId) },
      select: {
        id: true,
        user_wallet: true,
        prize_amount: true,
        prize_asset_contract: true,
        numbers_json: true,
        scratched: true,
        card_no: true
      }
    });

    if (!card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    // Return the card grid data
    return NextResponse.json({
      success: true,
      card: {
        id: card.id,
        tokenId: card.card_no,
        userWallet: card.user_wallet,
        prizeAmount: card.prize_amount,
        prizeAsset: card.prize_asset_contract,
        numbersJson: card.numbers_json,
        scratched: card.scratched
      }
    });

  } catch (error) {
    console.error('Error in get card:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}