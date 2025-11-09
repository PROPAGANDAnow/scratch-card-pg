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
    let dateFilter: { gte?: Date } | undefined = {};
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

    // Get all users and calculate their winnings
    const users = await prisma.user.findMany({
      select: {
        id: true,
        address: true,
        fid: true,
        created_at: true
      }
    });

    // Calculate total winnings for each user
    const usersWithWinnings = await Promise.all(
      users.map(async (user) => {
        const wonInTimeframe = await prisma.card.aggregate({
          where: {
            minter_user_id: user.id,
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

        return {
          ...user,
          totalWon: Number(wonInTimeframe._sum?.prize_amount || 0)
        };
      })
    );

    // Sort by total winnings descending
    usersWithWinnings.sort((a, b) => b.totalWon - a.totalWon);

    // Apply pagination
    const paginatedUsers = usersWithWinnings.slice(offset!, offset! + limit!);

    // Collect FIDs for Neynar API call
    const fidsToFetch = paginatedUsers
      .filter(user => user.fid && user.fid > 0)
      .map(user => user.fid!);

    // Fetch Farcaster user data from Neynar
    let farcasterUsers: any[] = [];
    if (fidsToFetch.length > 0) {
      try {
        const neynarApiKey = process.env.NEYNAR_API_KEY;
        if (neynarApiKey) {
          const fidParams = fidsToFetch.join(',');
          const response = await fetch(
            `https://api.neynar.com/v2/farcaster/user/bulk/?fids=${fidParams}`,
            {
              headers: {
                'x-api-key': neynarApiKey,
                'x-neynar-experimental': 'false'
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            farcasterUsers = data.users || [];
          } else {
            console.error('Neynar API error:', response.status, response.statusText);
          }
        } else {
          console.warn('NEYNAR_API_KEY not configured, skipping Farcaster user data fetch');
        }
      } catch (error) {
        console.error('Error fetching Farcaster user data:', error);
      }
    }

    // Create a map for quick lookup
    const userFarcasterData = new Map(
      farcasterUsers.map((user: any) => [user.fid, user])
    );

    // Get additional statistics for each user
    const leaderboardEntries: LeaderboardEntry[] = [];
    let rank = offset! + 1; // Start rank from offset

    for (const user of paginatedUsers) {
      // Count scratched cards for this user
      // Note: user_wallet field removed, need to use userId relation
      const scratchedCount = await prisma.card.count({
        where: {
          minter_user_id: user.id,
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
            minter_user_id: user.id,
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

        // Calculate wins for win rate
        const totalWins = await prisma.card.count({
          where: {
            minter_user_id: user.id,
            scratched: true,
            prize_amount: {
              gt: 0
            },
            ...(dateFilter && {
              scratched_at: dateFilter
            })
          }
        });

        // Calculate win rate (wins / total scratched)
        const winRate = scratchedCount > 0 ? (totalWins / scratchedCount) * 100 : 0;

        // Use pre-calculated totalWon
        const filteredAmountWon = user.totalWon || 0;

        // Skip users with no wins in the selected timeframe
        if (timeframe !== 'all' && filteredAmountWon === 0) {
          continue;
        }

        // Get Farcaster user data if available
        const farcasterData = user.fid ? userFarcasterData.get(user.fid) : undefined;

        const entry: LeaderboardEntry = {
          rank,
          wallet: user.address,
          fid: user.fid || 0,
          username: farcasterData?.username || 'Anonymous',
          pfp: farcasterData?.pfp_url || '',
          totalWon: filteredAmountWon,
          totalScratched: scratchedCount,
          totalWins: totalWins,
          winRate: Number(winRate.toFixed(2)),
          biggestWin: biggestWinCard?.prize_amount || 0,
          lastActive: user.created_at || new Date(), // use created_at as fallback
          level: 1 // level field removed from schema
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
    // Note: cards relation should be Card (capital C) based on schema
    // Count users with at least one scratched card
    const usersWithScratchedCards = await prisma.card.groupBy({
      by: ['minter_user_id'],
      where: {
        scratched: true,
        ...(dateFilter && {
          scratched_at: dateFilter
        })
      }
    });
    
    const totalEntries = usersWithScratchedCards.length;

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