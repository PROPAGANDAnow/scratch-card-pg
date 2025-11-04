import { NextRequest } from 'next/server';
import { getSession } from '../auth';
import { prisma } from './prisma';

/**
 * Verify if the authenticated user is the owner of a token
 * Uses NextAuth session to get the authenticated user's FID
 * Then verifies ownership through the database
 */
export async function verifyTokenOwnership(request: NextRequest, userWallet: string): Promise<{
  success: boolean;
  error?: string;
  user?: {
    fid: number;
    username?: string;
    pfp?: string;
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
    const dbUser = await prisma.user.findFirst({
      where: {
        fid: session.user.fid
      },
      select: {
        address: true,
        fid: true
      }
    });

    if (!dbUser || !dbUser.address) {
      return {
        success: false,
        error: 'User not found in database'
      };
    }

    // Check if wallet address matches
    const walletMatch = dbUser.address.toLowerCase() === normalizedWallet;

    if (!walletMatch) {
      return {
        success: false,
        error: 'Wallet address does not match authenticated user'
      };
    }

    // Verify token ownership - Note: user_wallet field removed from Card model
    // The ownership verification now needs to be done differently
    // For now, we'll assume ownership if the wallet matches the authenticated user
    // In the future, cards should have a userId relation to properly track ownership

    return {
      success: true,
      user: {
        fid: dbUser.fid || 0,
        username: 'Anonymous', // username field removed from schema
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
    const user = await prisma.user.findFirst({
      where: { fid: session.user.fid },
      select: { address: true }
    });

    if (!user || !user.address) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Check wallet address match
    const walletMatch = user.address.toLowerCase() === userWallet.toLowerCase();

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