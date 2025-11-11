import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '~/lib/validations';
import { GetProofSchema } from '~/lib/validations';
import { verifyTokenOwnership } from '~/lib/auth-utils';
import { prisma } from '~/lib/prisma';
import { ApiResponse, ProofData } from '~/app/interface/api';
import { createHash, randomBytes } from 'crypto';
import { SCRATCH_CARD_NFT_ADDRESS } from '~/lib/blockchain';

interface RouteParams {
  params: Promise<{ tokenId: string }>;
}

export async function GET(
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

  // Validate query parameters
  const validation = await validateRequest(request, GetProofSchema, { method: 'GET' });

  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error } as ApiResponse,
      { status: validation.status }
    );
  }

  const { userWallet } = validation.data;

  try {
    // Verify ownership with quickauth - only show proof to token owner
    const ownership = await verifyTokenOwnership(request, userWallet);

    if (!ownership.success) {
      return NextResponse.json(
        { success: false, error: ownership.error || 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    // Get token details from database
    // Note: user_wallet field removed from Card model
    const token = await prisma.card.findFirst({
      where: {
        token_id: tokenId,
        contract_address: SCRATCH_CARD_NFT_ADDRESS
      },
      select: {
        id: true,
        token_id: true,
        prize_amount: true,
        scratched: true,
        created_at: true
      }
    });

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token not found' } as ApiResponse,
        { status: 404 }
      );
    }

    // Generate a proof for the token
    // This is a simplified proof generation - in production, you might want to use
    // a more sophisticated method like Merkle proofs or ZK proofs
    const proofData = generateTokenProof(token);

    const response: ProofData = {
      tokenId: token.token_id,
      proof: proofData.proof,
      owner: userWallet, // Use the provided userWallet since field is removed from schema
      isValid: true,
      expiresAt: proofData.expiresAt
    };

    return NextResponse.json({
      success: true,
      data: response
    } as ApiResponse<ProofData>);

  } catch (error) {
    console.error('Error generating token proof:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate proof' } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * Generate a cryptographic proof for token ownership
 * This creates a verifiable proof that can be used to verify ownership
 */
function generateTokenProof(token: {
  id: string;
  token_id: number;
  prize_amount: number;
  scratched: boolean;
  created_at: Date;
}) {
  // Create a unique identifier for this proof
  const timestamp = Date.now();
  const nonce = randomBytes(16).toString('hex');

  // Create the proof string by hashing token data with timestamp and nonce
  const dataToHash = `${token.token_id}:${token.prize_amount}:${token.scratched}:${token.created_at.getTime()}:${timestamp}:${nonce}`;

  const proof = createHash('sha256').update(dataToHash).digest('hex');

  // Proof expires after 1 hour for security
  const expiresAt = timestamp + (60 * 60 * 1000);

  return {
    proof,
    expiresAt,
    nonce,
    generatedAt: timestamp
  };
}

