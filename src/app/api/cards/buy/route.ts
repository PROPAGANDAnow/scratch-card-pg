import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { ZERO_ADDRESS } from "~/lib/blockchain";
import { prisma } from "~/lib/prisma";
import { getTokensInBatch } from "~/lib/token-batch";
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

    const { tokenIds, userWallet, friends = [], contractAddress } = validation.data;

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
    const createdCards = await getTokensInBatch({
      tokenIds,
      friends: friends.map(fid => ({ fid })),
      recipient: userWallet,
      contractAddress: isAddress(contractAddress) && contractAddress || ZERO_ADDRESS
    })

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