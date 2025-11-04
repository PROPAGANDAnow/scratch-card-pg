import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '~/lib/validations';
import { ScratchTokenSchema } from '~/lib/validations';
import { verifyTokenOwnership } from '~/lib/auth-utils';
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
    // Verify ownership with quickauth
    const ownership = await verifyTokenOwnership(request, userWallet, tokenId);

    if (!ownership.success) {
      return NextResponse.json(
        { success: false, error: ownership.error || 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx: any) => {
      // Get the token and lock it for update
      const token = await tx.card.findUnique({
        where: {
          token_id: tokenId
        },
        select: {
          id: true,
          token_id: true,
          user_wallet: true,
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
          scratched_at: now
        },
        select: {
          id: true,
          token_id: true,
          user_wallet: true,
          prize_amount: true,
          scratched: true,
          scratched_at: true,
          numbers_json: true,
          created_at: true
        }
      });

      // Update user statistics
      await tx.user.update({
        where: {
          wallet: userWallet.toLowerCase()
        },
        data: {
          total_reveals: {
            increment: 1
          },
          last_active: now
        }
      });

      // If the prize is greater than 0, update win statistics
      if (token.prize_amount > 0) {
        await tx.user.update({
          where: {
            wallet: userWallet.toLowerCase()
          },
          data: {
            total_wins: {
              increment: 1
            },
            amount_won: {
              increment: token.prize_amount
            }
          }
        });

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
      const numbers = result.numbers_json as any[];
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

  } catch (error: any) {
    console.error('Error scratching token:', error);

    // Handle specific errors
    if (error.message === 'Token not found') {
      return NextResponse.json(
        { success: false, error: 'Token not found' } as ApiResponse,
        { status: 404 }
      );
    }

    if (error.message === 'Token has already been scratched') {
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