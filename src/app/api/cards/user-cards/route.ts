import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";
import { Card } from "~/app/interface/card";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userWallet = url.searchParams.get('userWallet');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const state = url.searchParams.get('state') as 'unscratched' | 'scratched' | 'claimed' | 'all' || 'all';

    if (!userWallet) {
      return NextResponse.json(
        { error: 'userWallet is required' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userWallet)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build where clause based on state filter
    const whereClause: any = {
      minter: {
        address: userWallet.toLowerCase()
      }
    };

    switch (state) {
      case 'unscratched':
        whereClause.scratched = false;
        break;
      case 'scratched':
        whereClause.scratched = true;
        whereClause.claimed = false;
        break;
      case 'claimed':
        whereClause.scratched = true;
        whereClause.claimed = true;
        break;
      // 'all' case doesn't add any filters
    }

    // Fetch cards with pagination
    const [cards, totalCount] = await Promise.all([
      prisma.card.findMany({
        where: whereClause,
        orderBy: [
          { scratched: 'asc' }, // Unscratched first
          { claimed: 'asc' },   // Unclaimed before claimed
          { created_at: 'desc' } // Newest first within same state
        ],
        skip: offset,
        take: limit,
        include: {
          minter: {
            select: {
              address: true,
              fid: true
            }
          }
        }
      }),
      prisma.card.count({
        where: whereClause
      })
    ]);

    // Transform cards to include state information
    const transformedCards: (Card & { cardState: 'unscratched' | 'scratched' | 'claimed' })[] = cards.map(card => {
      let cardState: 'unscratched' | 'scratched' | 'claimed';
      
      if (!card.scratched) {
        cardState = 'unscratched';
      } else if (card.scratched && !card.claimed) {
        cardState = 'scratched';
      } else {
        cardState = 'claimed';
      }

      return {
        ...card,
        cardState
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        cards: transformedCards,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPreviousPage
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user cards:', error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}