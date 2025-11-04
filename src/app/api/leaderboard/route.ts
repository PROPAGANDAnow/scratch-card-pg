import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '~/lib/validations';
import { GetLeaderboardSchema } from '~/lib/validations';
import { prisma } from '~/lib/prisma';
import { ApiResponse, LeaderboardResponse, LeaderboardEntry } from '~/app/interface/api';

export async function GET(request: NextRequest) {
  const validation = await validateRequest(request, GetLeaderboardSchema, { method: 'GET' });

  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error } as ApiResponse,
      { status: validation.status }
    );
  }

  const { limit, offset, timeframe } = validation.data;

  try {
    // Build the date filter based on timeframe
    let dateFilter: any = {};
    const now = new Date();

    switch (timeframe) {
      case 'daily':
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
        };
        break;
      case 'weekly':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = {
          gte: weekAgo
        };
        break;
      case 'monthly':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        dateFilter = {
          gte: monthAgo
        };
        break;
      case 'all':
      default:
        dateFilter = undefined;
        break;
    }

    // First, get all users with their card statistics
    const usersWithStats = await prisma.user.findMany({
      orderBy: {
        amount_won: 'desc'
      },
      take: limit! * 2, // Fetch more to account for filtering
      skip: offset!
    });

    // Get additional statistics for each user
    const leaderboardEntries: LeaderboardEntry[] = [];
    let rank = offset! + 1; // Start rank from offset

    for (const user of usersWithStats) {
      // Count scratched cards for this user
      const scratchedCount = await prisma.card.count({
        where: {
          user_wallet: user.wallet,
          scratched: true,
          ...(dateFilter && {
            scratched_at: dateFilter
          })
        }
      });

      // Only include users who have scratched at least one card
      if (scratchedCount > 0) {
        // Calculate biggest win for this user
        const biggestWinCard = await prisma.card.findFirst({
          where: {
            user_wallet: user.wallet,
            scratched: true,
            prize_amount: {
              gt: 0
            },
            ...(dateFilter && {
              scratched_at: dateFilter
            })
          },
          orderBy: {
            prize_amount: 'desc'
          },
          select: {
            prize_amount: true
          }
        });

        // Calculate win rate (wins / total scratched)
        const winRate = user.total_reveals && user.total_reveals > 0
          ? ((user.total_wins || 0) / user.total_reveals) * 100
          : 0;

        // Filter amount_won based on timeframe
        let filteredAmountWon = user.amount_won || 0;
        if (timeframe !== 'all') {
          const wonInTimeframe = await prisma.card.aggregate({
            where: {
              user_wallet: user.wallet,
              scratched: true,
              prize_amount: {
                gt: 0
              },
              ...(dateFilter && {
                scratched_at: dateFilter
              })
            },
            _sum: {
              prize_amount: true
            }
          });
          filteredAmountWon = Number(wonInTimeframe._sum.prize_amount || 0);
        }

        // Skip users with no wins in the selected timeframe
        if (timeframe !== 'all' && filteredAmountWon === 0) {
          continue;
        }

        const entry: LeaderboardEntry = {
          rank,
          wallet: user.wallet,
          fid: user.fid || 0,
          username: user.username || 'Anonymous',
          pfp: user.pfp || '',
          totalWon: filteredAmountWon,
          totalScratched: scratchedCount,
          totalWins: timeframe === 'all' ? (user.total_wins || 0) :
            (await prisma.card.count({
              where: {
                user_wallet: user.wallet,
                scratched: true,
                prize_amount: {
                  gt: 0
                },
                ...(dateFilter && {
                  scratched_at: dateFilter
                })
              }
            })),
          winRate: Number(winRate.toFixed(2)),
          biggestWin: biggestWinCard?.prize_amount || 0,
          lastActive: user.last_active || new Date(),
          level: user.current_level || 1
        };

        leaderboardEntries.push(entry);
        rank++;

        // Stop if we've reached the requested limit
        if (leaderboardEntries.length >= limit!) {
          break;
        }
      }
    }

    // Get total entries count
    const totalEntries = await prisma.user.count({
      where: {
        cards: {
          some: {
            scratched: true,
            ...(dateFilter && {
              scratched_at: dateFilter
            })
          }
        }
      }
    });

    const response: LeaderboardResponse = {
      entries: leaderboardEntries,
      totalEntries,
      timeframe: timeframe!,
      lastUpdated: new Date()
    };

    return NextResponse.json({
      success: true,
      data: response
    } as ApiResponse<LeaderboardResponse>);

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard' } as ApiResponse,
      { status: 500 }
    );
  }
}