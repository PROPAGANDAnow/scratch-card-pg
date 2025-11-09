import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '~/lib/validations';
import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { ApiResponse, ActivityResponse } from '~/app/interface/api';

const GetActivitySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  type: z.enum(['all', 'mint', 'scratch', 'win']).default('all'),
});

export async function GET(request: NextRequest) {
  const validation = await validateRequest(request, GetActivitySchema, { method: 'GET' });

  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error } as ApiResponse,
      { status: validation.status }
    );
  }

  const { limit, offset, type } = validation.data;

  try {
    // Build the where clause based on type filter
    let whereClause: any = {
      OR: [
        { scratched: true }, // Scratched cards
        { prize_amount: { gt: 0 } } // Cards with prizes
      ]
    };

    // If type is specified, filter further
    if (type === 'mint') {
      whereClause = {};
    } else if (type === 'scratch') {
      whereClause = {
        scratched: true
      };
    } else if (type === 'win') {
      whereClause = {
        scratched: true,
        prize_amount: { gt: 0 }
      };
    }

    // Fetch activities with user relations
    const activities = await prisma.card.findMany({
      where: whereClause,
      include: {
        scratched_by: {
          select: {
            address: true,
            fid: true
          }
        },
        minter: {
          select: {
            address: true,
            fid: true
          }
        }
      },
      orderBy: [
        { scratched_at: { sort: 'desc', nulls: 'first' } },
        { created_at: 'desc' }
      ],
      take: limit,
      skip: offset
    });

    // Collect all unique FIDs for Neynar API call
    const fidsToFetch = new Set<number>();
    activities.forEach(activity => {
      if (activity.scratched_by?.fid) fidsToFetch.add(activity.scratched_by.fid);
      if (activity.minter?.fid) fidsToFetch.add(activity.minter.fid);
    });

    // Fetch Farcaster user data from Neynar
    let farcasterUsers: any[] = [];
    if (fidsToFetch.size > 0) {
      try {
        const neynarApiKey = process.env.NEYNAR_API_KEY;
        if (neynarApiKey) {
          const fidParams = Array.from(fidsToFetch).join(',');
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
        }
      } catch (error) {
        console.error('Error fetching Farcaster user data:', error);
      }
    }

    // Create a map for quick lookup
    const userFarcasterData = new Map(
      farcasterUsers.map((user: any) => [user.fid, user])
    );

      // Transform activities into the expected format
    const transformedActivities = activities.map((activity, index) => {
      // Determine activity type and details
      let activityType: 'mint' | 'scratch' | 'win' = 'mint';
      let title = `Minted card`;
      let subtitle = '';
      let userAddress = activity.minter?.address || '';
      let timestamp = activity.created_at;
      let formattedAmount = '';
      let color = 'text-blue-400';

      if (activity.scratched) {
        activityType = 'scratch';
        title = 'Scratched card';
        subtitle = '';
        userAddress = activity.scratched_by?.address || activity.minter?.address || '';
        timestamp = activity.scratched_at || timestamp;
        color = 'text-yellow-400';

        if (activity.prize_amount && activity.prize_amount > 0) {
          activityType = 'win';
          title = `Won $${activity.prize_amount.toLocaleString()}!`;
          formattedAmount = `$${activity.prize_amount.toLocaleString()}`;
          color = 'text-green-400';
        }
      }

      // Get user data from Farcaster if available
      const userData = activity.scratched_by?.fid
        ? userFarcasterData.get(activity.scratched_by.fid)
        : activity.minter?.fid
        ? userFarcasterData.get(activity.minter.fid)
        : undefined;

      const username = userData?.username || '';
      const pfp = userData?.pfp_url || '';

      // Truncate address if no username
      const displayAddress = username ? `@${username}` :
        userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : '';

      return {
        id: `activity-${activity.id}-${index}`,
        type: activityType,
        title,
        subtitle: displayAddress,
        amount: formattedAmount,
        timestamp: timestamp?.toISOString() || new Date().toISOString(),
        transactionHash: activity.payment_tx || '',
        color,
        userAddress,
        username,
        pfp,
        cardId: activity.token_id,
        prizeAmount: activity.prize_amount || 0
      };
    });

    // Get total count
    const totalEntries = await prisma.card.count({
      where: whereClause
    });

    const response: ActivityResponse = {
      activities: transformedActivities,
      totalEntries,
      type: type!,
      lastUpdated: new Date()
    };

    return NextResponse.json({
      success: true,
      data: response
    } as ApiResponse<ActivityResponse>);

  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity' } as ApiResponse,
      { status: 500 }
    );
  }
}