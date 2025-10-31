import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";
import { drawPrize } from "~/lib/drawPrize";
import { generateNumbers } from "~/lib/generateNumbers";
import { PRIZE_ASSETS, USDC_ADDRESS } from "~/lib/constants";
import { findWinningRow } from "~/lib/winningRow";
import { SharedUser } from "~/app/interface/card";
import { Prisma } from "@prisma/client";
import { BuyCardSchema, validateRequest } from "~/lib/validations";

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequest(request, BuyCardSchema, { method: 'POST' });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { tokenId, userWallet, friends } = validation.data;

    // Check if card already exists for this tokenId
    const existingCard = await prisma.card.findUnique({
      where: { token_id: tokenId }
    });

    if (existingCard) {
      return NextResponse.json(
        { error: "Card already exists for this tokenId" },
        { status: 400 }
      );
    }

    // Generate prize and card data
    const prize = drawPrize(friends && friends.length > 0); // e.g., 0 | 0.5 | 1 | 2 (check if friends available for free cards)
    // pick prize asset randomly (today pool contains USDC; add more later)
    const prizeAsset =
      PRIZE_ASSETS[Math.floor(Math.random() * PRIZE_ASSETS.length)] || USDC_ADDRESS;
    // build 12 cells (3x4) with one winning row if prize > 0
    const numbers = generateNumbers({
      prizeAmount: prize,
      prizeAsset,
      decoyAmounts: [0.5, 0.75, 1, 1.5, 2, 5, 10],
      decoyAssets: PRIZE_ASSETS as unknown as string[],
      friends: friends || [],
    });

    let shared_to: SharedUser | null = null;
    if (prize === -1) {
      const winningRow = findWinningRow(numbers, prize, prizeAsset);
      if (winningRow !== null && winningRow !== -1) {
        const friendCell = numbers[winningRow * 3];
        shared_to = {
          fid: friendCell.friend_fid?.toString() || "0",
          username: friendCell.friend_username || "",
          pfp: friendCell.friend_pfp || "",
          wallet: friendCell.friend_wallet || ""
        };
      }
    }

    // Create the card
    const cardData: Prisma.CardUncheckedCreateInput = {
      user_wallet: userWallet,
      payment_tx: "MINTED_NFT", // Indicate it's from NFT minting
      prize_amount: prize,
      prize_asset_contract: prizeAsset,
      numbers_json: numbers as Prisma.InputJsonValue,
      token_id: tokenId, // Use tokenId as token_id
      contract_address: "0x0000000000000000000000000000000000000000", // Placeholder for NFT contract
      prize_won: prize > 0, // Set prize_won based on prize amount
      shared_to: shared_to as unknown as Prisma.InputJsonValue,
    };

    const newCard = await prisma.card.create({
      data: cardData
    });

    // Update user's cards_count
    try {
      await prisma.user.update({
        where: { wallet: userWallet },
        data: {
          cards_count: { increment: 1 },
          last_active: new Date()
        }
      });
    } catch (userUpdateError) {
      console.error('Error updating user card count:', userUpdateError);
      // Don't fail the request if user update fails
    }

    // Update app stats - increment cards count
    try {
      await prisma.stats.upsert({
        where: { id: 1 },
        update: {
          cards: { increment: 1 },
          updated_at: new Date()
        },
        create: {
          id: 1,
          cards: 1,
          reveals: 0,
          winnings: 0
        }
      });
    } catch (statsError) {
      console.error('Error updating app stats:', statsError);
      // Don't fail the request if stats update fails
    }

    return NextResponse.json({
      success: true,
      card: newCard
    });

  } catch (error) {
    console.error('Error in buy cards:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}