import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '~/lib/validations';
import { ScratchTokenSchema } from '~/lib/validations';
import { verifyUserCardAction } from '~/lib/ownership-verifier';
import { prisma } from '~/lib/prisma';
import { ApiResponse, ScratchResponse } from '~/app/interface/api';

interface RouteParams {
  params: Promise<{ tokenId: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  // Get tokenId from URL params
  const { tokenId: tokenIdParam } = await params;
  const tokenId = parseInt(tokenIdParam);

  if (isNaN(tokenId) || tokenId <= 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid token ID' } as ApiResponse,
      { status: 400 }
    );
  }

  // Validate request body
  const validation = await validateRequest(request, ScratchTokenSchema, { method: 'POST' });

  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error } as ApiResponse,
      { status: validation.status }
    );
  }

  const { userWallet, timestamp } = validation.data;

  try {
    // Verify ownership and permission to scratch
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
    const ownership = await verifyUserCardAction(userWallet, contractAddress, tokenId, 'scratch');

    if (!ownership.canAct) {
      return NextResponse.json(
        { success: false, error: ownership.error || 'Unauthorized to scratch this card' } as ApiResponse,
        { status: 401 }
      );
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get the token and lock it for update
      const token = await tx.card.findFirst({
        where: {
          token_id: tokenId,
          contract_address: contractAddress
        },
        select: {
          id: true,
          token_id: true,
          prize_amount: true,
          scratched: true,
          scratched_at: true,
          numbers_json: true,
          created_at: true
        }
      });

      if (!token) {
        throw new Error('Token not found');
      }

      // Check if token is already scratched
      if (token.scratched) {
        throw new Error('Token has already been scratched');
      }

      // Update the token as scratched
      const now = new Date(timestamp);
      const updatedToken = await tx.card.update({
        where: {
          id: token.id
        },
        data: {
          scratched: true,
          scratched_at: now,
          scratched_by_user_id: (await tx.user.findUnique({
            where: { address: userWallet.toLowerCase() }
          }))?.id
        },
        select: {
          id: true,
          token_id: true,
          prize_amount: true,
          scratched: true,
          scratched_at: true,
          numbers_json: true,
          created_at: true
        }
      });

      // Update user statistics - Note: User model no longer has total_reveals, last_active fields
      // These updates have been removed as they don't exist in the new schema

      // If the prize is greater than 0, update win statistics
      if (token.prize_amount > 0) {
        // Note: User model no longer has total_wins, amount_won fields
        // These updates have been removed as they don't exist in the new schema

        // Update global stats
        await tx.stats.update({
          where: {
            id: 1
          },
          data: {
            reveals: {
              increment: 1
            },
            winnings: {
              increment: token.prize_amount
            }
          }
        });
      }

      return updatedToken;
    });

    // Parse the numbers_json to get the revealed items
    let revealedItems: { amount: number; asset: string }[] = [];
    if (result.numbers_json && typeof result.numbers_json === 'object' && Array.isArray(result.numbers_json)) {
      // numbers_json contains an array of items with amount and asset
      const numbers = result.numbers_json as Array<{ amount: number; asset_contract?: string }>;
      revealedItems = numbers.map(item => ({
        amount: item.amount || 0,
        asset: item.asset_contract || 'USDC'
      }));
    }

    const response: ScratchResponse = {
      tokenId: result.token_id,
      scratched: result.scratched,
      prizeAmount: result.prize_amount || 0,
      scratchedAt: result.scratched_at || new Date(),
      revealed: revealedItems
    };

    return NextResponse.json({
      success: true,
      data: response,
      message: (result.prize_amount && result.prize_amount > 0)
        ? `Congratulations! You won ${result.prize_amount} USDC!`
        : 'Better luck next time!'
    } as ApiResponse<ScratchResponse>);

  } catch (error: unknown) {
    console.error('Error scratching token:', error);

    // Handle specific errors
    if (error instanceof Error && error.message === 'Token not found') {
      return NextResponse.json(
        { success: false, error: 'Token not found' } as ApiResponse,
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message === 'Token has already been scratched') {
      return NextResponse.json(
        { success: false, error: 'Token has already been scratched' } as ApiResponse,
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to scratch token' } as ApiResponse,
      { status: 500 }
    );
  }
}