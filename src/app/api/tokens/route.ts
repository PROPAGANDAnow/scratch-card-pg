import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '~/lib/validations';
import { GetTokensSchema } from '~/lib/validations';
import prisma from '~/lib/prisma';
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
    // Build where clause based on status filter
    const whereClause: any = {
      user_wallet: userWallet.toLowerCase()
    };

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
        owner_wallet: true,
        prize_amount: true,
        scratched: true,
        scratched_at: true,
        claimed: true,
        claimed_at: true,
        created_at: true,
        updated_at: true,
        numbers_json: true
      }
    });

    // Transform the data to match our interface
    const tokenData: TokenData[] = tokens.map(token => ({
      id: token.id,
      token_id: token.token_id,
      owner_wallet: token.user_wallet,
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
      limit,
      offset,
      hasMore: offset + limit < total
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