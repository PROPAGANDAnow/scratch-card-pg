import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { PRIZE_ASSETS } from "~/lib/constants";
import { USDC_ADDRESS } from "~/lib/blockchain";
import { drawPrize } from "~/lib/drawPrize";
import { generateNumbers } from "~/lib/generateNumbers";
import { prisma } from "~/lib/prisma";
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

    const { tokenIds, userWallet, friends = [] } = validation.data;

    // Ensure user exists and get their ID for minter relationship
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { address: userWallet.toLowerCase() },
        select: { id: true, address: true }
      });
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found. Please check or create user first.' },
          { status: 404 }
        );
      }
    } catch (userEnsureError) {
      console.error('Error finding user:', userEnsureError);
      return NextResponse.json(
        { error: 'Unable to verify user for card purchase' },
        { status: 500 }
      );
    }

    // Check if any cards already exist for these tokenIds
    const existingCards = await prisma.card.findMany({
      where: {
        token_id: { in: tokenIds }
      }
    });

    if (existingCards.length > 0) {
      const existingTokenIds = existingCards.map(card => card.token_id);
      return NextResponse.json(
        {
          error: "Cards already exist for these tokenIds",
          existingTokenIds
        },
        { status: 400 }
      );
    }

    // Generate cards data for each tokenId
    const cardsData: Prisma.CardCreateInput[] = [];

    for (const tokenId of tokenIds) {
      // Generate prize and card data for each token
      const prize = drawPrize(friends.length > 0); // e.g., 0 | 0.5 | 1 | 2 (check if friends available for free cards)
      // pick prize asset randomly (today pool contains USDC; add more later)
      // const prizeAsset =
      //   PRIZE_ASSETS[Math.floor(Math.random() * PRIZE_ASSETS.length)] || USDC_ADDRESS;
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

      // Note: Gift logic disabled for now - will be implemented with gifted_to relation
      // const gifted_to: GiftedUser | null = null;
      // if (prize === -1) {
      //   const winningRow = findWinningRow(numbers, prize, prizeAsset);
      //   if (winningRow !== null && winningRow !== -1) {
      //     const friendCell = numbers[winningRow * 3];
      //     gifted_to = {
      //       fid: friendCell.friend_fid?.toString() || "0",
      //       username: friendCell.friend_username || "",
      //       pfp: friendCell.friend_pfp || "",
      //       wallet: friendCell.friend_wallet || ""
      //     };
      //   }
      // }

      // Create card data for this token
      const cardData: Prisma.CardCreateInput = {
        payment_tx: "MINTED_NFT", // Indicate it's from NFT minting
        prize_amount: prize,
        prize_asset_contract: prizeAsset,
        numbers_json: numbers as Prisma.InputJsonValue,
        token_id: tokenId, // Use tokenId as token_id
        contract_address: "0x0000000000000000000000000000000000000000", // Placeholder for NFT contract
        prize_won: prize > 0, // Set prize_won based on prize amount
        minter: {
          connect: { id: user.id }
        }
      };

      cardsData.push(cardData);
    }

    // Create cards individually to handle relations properly
    const createdCards = [];
    for (const cardData of cardsData) {
      const createdCard = await prisma.card.create({
        data: cardData
      });
      createdCards.push(createdCard);
    }

    // Update user's cards_count - field removed from schema
    // try {
    //   await prisma.user.update({
    //     where: { address: userWallet },
    //     data: {
    //       cards_count: { increment: tokenIds.length },
    //       last_active: new Date()
    //     }
    //   });
    // } catch (updateError) {
    //   console.error('Error updating user cards count:', updateError);
    //   // Non-critical error, don't fail the request
    // }

    // Update app stats - increment cards count
    try {
      await prisma.stats.upsert({
        where: { id: 1 },
        update: {
          cards: { increment: tokenIds.length },
          updated_at: new Date()
        },
        create: {
          id: 1,
          cards: tokenIds.length,
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
      cards: createdCards,
      count: createdCards.length
    });

  } catch (error) {
    console.error('Error in buy cards:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}