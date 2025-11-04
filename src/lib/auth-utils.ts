import { NextRequest } from 'next/server';
import { getSession } from '@/auth';
import prisma from '@/lib/prisma';

/**
 * Verify if the authenticated user is the owner of a token
 * Uses NextAuth session to get the authenticated user's FID
 * Then verifies ownership through the database
 */
export async function verifyTokenOwnership(request: NextRequest, userWallet: string, tokenId: number): Promise<{
  success: boolean;
  error?: string;
  user?: {
    fid: number;
    username?: string;
    wallet: string;
  };
}> {
  try {
    // Get the session to authenticate the user
    const session = await getSession();

    if (!session?.user?.fid) {
      return {
        success: false,
        error: 'Unauthorized: No valid session found'
      };
    }

    // Normalize wallet address to lowercase
    const normalizedWallet = userWallet.toLowerCase();

    // Verify that the session user's wallet matches the provided wallet
    const dbUser = await prisma.user.findUnique({
      where: {
        fid: session.user.fid
      },
      select: {
        wallet: true,
        username: true,
        fid: true
      }
    });

    if (!dbUser || !dbUser.wallet) {
      return {
        success: false,
        error: 'User not found in database'
      };
    }

    // Handle case where wallet is an array (as per schema)
    const userWallets = Array.isArray(dbUser.wallet) ? dbUser.wallet : [dbUser.wallet];
    const walletMatch = userWallets.some(w => w && w.toLowerCase() === normalizedWallet);

    if (!walletMatch) {
      return {
        success: false,
        error: 'Wallet address does not match authenticated user'
      };
    }

    // Verify token ownership
    const token = await prisma.card.findUnique({
      where: {
        token_id: tokenId
      },
      select: {
        user_wallet: true,
        token_id: true
      }
    });

    if (!token) {
      return {
        success: false,
        error: 'Token not found'
      };
    }

    if (token.user_wallet.toLowerCase() !== normalizedWallet) {
      return {
        success: false,
        error: 'Not authorized: You do not own this token'
      };
    }

    return {
      success: true,
      user: {
        fid: dbUser.fid,
        username: dbUser.username || 'Anonymous',
        wallet: normalizedWallet
      }
    };

  } catch (error) {
    console.error('Error verifying token ownership:', error);
    return {
      success: false,
      error: 'Internal server error during ownership verification'
    };
  }
}

/**
 * Quick verification for API endpoints that only needs to check ownership
 * This is a simplified version that can be used for quickauth scenarios
 */
export async function quickVerifyOwnership(request: NextRequest, userWallet: string): Promise<{
  success: boolean;
  error?: string;
  fid?: number;
}> {
  try {
    const session = await getSession();

    if (!session?.user?.fid) {
      return {
        success: false,
        error: 'Unauthorized: No valid session'
      };
    }

    // Quick wallet check (could be enhanced with caching)
    const user = await prisma.user.findUnique({
      where: { fid: session.user.fid },
      select: { wallet: true }
    });

    if (!user || !user.wallet) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Handle array wallet case
    const userWallets = Array.isArray(user.wallet) ? user.wallet : [user.wallet];
    const walletMatch = userWallets.some(w => w && w.toLowerCase() === userWallet.toLowerCase());

    if (!walletMatch) {
      return {
        success: false,
        error: 'Wallet mismatch'
      };
    }

    return {
      success: true,
      fid: session.user.fid
    };

  } catch (error) {
    console.error('Quick verification error:', error);
    return {
      success: false,
      error: 'Verification failed'
    };
  }
}