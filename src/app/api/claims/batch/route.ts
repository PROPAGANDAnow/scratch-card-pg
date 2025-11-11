import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '~/lib/validations';
import { BatchClaimSchema } from '~/lib/validations';
import { quickVerifyOwnership } from '~/lib/auth-utils';
import { prisma } from '~/lib/prisma';
import { ApiResponse, BatchClaimResponse } from '~/app/interface/api';
import { encodeAbiParameters, keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { PAYMENT_TOKEN, SCRATCH_CARD_NFT_ADDRESS } from '~/lib/blockchain';

export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, BatchClaimSchema, { method: 'POST' });

  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error } as ApiResponse,
      { status: validation.status }
    );
  }

  const { tokenIds, userWallet } = validation.data;

  try {
    // Quick verify ownership
    const auth = await quickVerifyOwnership(request, userWallet);

    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    // Get signer private key from environment variables
    const signerPrivateKey = process.env.SIGNER_PRIVATE_KEY;
    if (!signerPrivateKey) {
      console.error('SIGNER_PRIVATE_KEY not configured in environment variables');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' } as ApiResponse,
        { status: 500 }
      );
    }

    // Create signer account
    const signerAccount = privateKeyToAccount(
      signerPrivateKey as `0x${string}`
    );

    const successful: number[] = [];
    const failed: { tokenId: number; error: string }[] = [];
    const signatures: BatchClaimResponse['signatures'] = [];
    let totalPrize = 0;

    // Process each token
    for (const tokenId of tokenIds) {
      try {
        // Use transaction to ensure atomicity for each token
        const result = await prisma.$transaction(async (tx) => {
          // Get the token
          // Note: user_wallet field removed, ownership check needs to be updated
          const token = await tx.card.findFirst({
            where: {
              token_id: tokenId,
              contract_address: SCRATCH_CARD_NFT_ADDRESS
            },
            select: {
              id: true,
              token_id: true,
              prize_amount: true,
              prize_asset_contract: true,
              scratched: true,
              claimed: true
            }
          });

          if (!token) {
            throw new Error('Token not found or not owned by user');
          }

          // Check if token has been scratched
          if (!token.scratched) {
            throw new Error('Token must be scratched before claiming');
          }

          // Check if prize has already been claimed
          if (token.claimed) {
            throw new Error('Prize already claimed');
          }

          // Get prize details
          const prizeAmount = Number(token.prize_amount || 0);
          const prizeAsset = token.prize_asset_contract || PAYMENT_TOKEN.ADDRESS;

          // For friend wins (prize_amount === -1), set actual prize to 0
          const actualPrizeAmount = prizeAmount === -1 ? 0 : prizeAmount;

          // Set deadline (1 hour from now)
          const deadline = Math.floor(Date.now() / 1000) + 3600;

          // Create the message to sign
          const messageHash = keccak256(
            encodeAbiParameters(
              [
                { name: 'tokenId', type: 'uint256' },
                { name: 'prizeAmount', type: 'uint256' },
                { name: 'tokenAddress', type: 'address' },
                { name: 'deadline', type: 'uint256' },
              ],
              [
                BigInt(tokenId),
                BigInt(Math.floor(actualPrizeAmount * 1_000_000)), // Convert to USDC units (6 decimals)
                prizeAsset as `0x${string}`,
                BigInt(deadline),
              ]
            )
          );

          // Sign the message
          const signature = await signerAccount.signMessage({
            message: { raw: messageHash }
          });

          // Update token as claimed
          await tx.card.update({
            where: {
              id: token.id
            },
            data: {
              claimed: true
            }
          });

          // Update user stats - field removed from schema
          // await tx.user.update({
          //   where: {
          //     address: userWallet.toLowerCase()
          //   },
          //   data: {
          //     last_active: new Date()
          //   }
          // });

          return {
            tokenId,
            signature,
            prizeAmount: actualPrizeAmount,
            tokenAddress: prizeAsset,
            deadline
          };
        });

        // Add to successful claims
        successful.push(tokenId);
        totalPrize += result.prizeAmount;
        signatures.push({
          tokenId: result.tokenId,
          signature: result.signature,
          prizeAmount: Math.floor(result.prizeAmount * 1_000_000), // Convert to USDC units
          tokenAddress: result.tokenAddress,
          deadline: result.deadline
        });

      } catch (error: unknown) {
        console.error(`Error processing token ${tokenId}:`, error);
        failed.push({
          tokenId,
          error: error instanceof Error ? error.message : 'Failed to process token'
        });
      }
    }

    const response: BatchClaimResponse = {
      successful,
      failed,
      totalPrize,
      signatures
    };

    return NextResponse.json({
      success: true,
      data: response,
      message: `Processed ${tokenIds.length} tokens. ${successful.length} successful, ${failed.length} failed.`
    } as ApiResponse<BatchClaimResponse>);

  } catch (error) {
    console.error('Error in batch claim:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process batch claim' } as ApiResponse,
      { status: 500 }
    );
  }
}