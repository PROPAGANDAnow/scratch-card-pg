import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '~/lib/validations';
import { GetTokensSchema } from '~/lib/validations';
import { prisma } from '~/lib/prisma';
import { ApiResponse, TokensResponse, TokenData } from '~/app/interface/api';

export async function GET(request: NextRequest) {
  const validation = await validateRequest(request, GetTokensSchema, { method: 'GET' });

  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error } as ApiResponse,
      { status: validation.status }
    );
  }

  const { userWallet, limit, offset, status } = validation.data;

  try {
    // Get user by address to filter by their cards
    const user = userWallet ? await prisma.user.findUnique({
      where: { address: userWallet.toLowerCase() },
      select: { id: true }
    }) : null;

    // Build where clause based on status filter and user
    const whereClause: {
      minter_user_id?: string;
      scratched?: boolean;
      claimed?: boolean;
      prize_won?: boolean;
    } = {};

    if (user) {
      whereClause.minter_user_id = user.id;
    }

    if (status === 'scratched') {
      whereClause.scratched = true;
    } else if (status === 'unscratched') {
      whereClause.scratched = false;
    } else if (status === 'claimed') {
      whereClause.claimed = true;
    }

    // Get total count
    const total = await prisma.card.count({
      where: whereClause
    });

    // Fetch tokens with pagination
    const tokens = await prisma.card.findMany({
      where: whereClause,
      orderBy: {
        created_at: 'desc'
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        token_id: true,
        prize_amount: true,
        scratched: true,
        scratched_at: true,
        claimed: true,
        created_at: true,
        numbers_json: true,
        minter: {
          select: {
            address: true
          }
        }
      }
    });

    // Transform the data to match our interface
    const tokenData: TokenData[] = tokens.map(token => ({
      id: token.id,
      token_id: token.token_id,
      user_wallet: token.minter?.address || '',
      prize_amount: token.prize_amount,
      scratched: token.scratched,
      scratched_at: token.scratched_at,
      claimed: token.claimed,
      claimed_at: null, // field doesn't exist in schema
      created_at: token.created_at,
      updated_at: token.created_at, // field doesn't exist in schema
      numbers_json: token.numbers_json
    }));

    const response: TokensResponse = {
      tokens: tokenData,
      total,
      limit: limit || 10,
      offset: offset || 0,
      hasMore: (offset || 0) + (limit || 10) < total
    };

    return NextResponse.json({
      success: true,
      data: response
    } as ApiResponse<TokensResponse>);

  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tokens' } as ApiResponse,
      { status: 500 }
    );
  }
}