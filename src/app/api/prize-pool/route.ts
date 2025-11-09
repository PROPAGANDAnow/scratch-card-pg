import { NextResponse } from 'next/server';
import { ApiResponse } from '~/app/interface/api';
import { prisma } from '~/lib/prisma';

export async function GET() {
  try {
    // Aggregate total prize amount from all claimed cards
    const prizePoolResult = await prisma.card.aggregate({
      where: {
        scratched: true,
        prize_amount: {
          gt: 0
        }
      },
      _sum: {
        prize_amount: true
      },
      _count: {
        id: true
      }
    });

    const totalPrizePool = prizePoolResult._sum.prize_amount || 0;
    const claimedCardsCount = prizePoolResult._count.id;

    // Also get total cards minted for context
    const totalCardsResult = await prisma.card.aggregate({
      _count: {
        id: true
      }
    });

    const totalCardsMinted = totalCardsResult._count.id;

    return NextResponse.json({
      success: true,
      data: {
        totalPrizePool,
        claimedCardsCount,
        totalCardsMinted,
        lastUpdated: new Date()
      }
    } as ApiResponse<{
      totalPrizePool: number;
      claimedCardsCount: number;
      totalCardsMinted: number;
      lastUpdated: Date;
    }>);

  } catch (error) {
    console.error('Error fetching prize pool:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prize pool data' } as ApiResponse,
      { status: 500 }
    );
  }
}