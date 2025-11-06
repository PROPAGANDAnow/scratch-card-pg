import { NextRequest, NextResponse } from "next/server";
import { encodeAbiParameters, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { validateRequest } from "~/lib/validations";
import { GenerateClaimSignatureSchema } from "~/lib/validations";
import { prisma } from "~/lib/prisma";
import { USDC_ADDRESS } from "~/lib/blockchain";
import { ApiResponse } from "~/app/interface/api";

/**
 * Generate claim signature for NFT scratch card prize
 * 
 * This endpoint generates a signature that allows the user to claim their prize
 * on-chain through the smart contract. The signature is created using the 
 * signer's private key and includes all necessary parameters for verification.
 * 
 * @param request - Contains tokenId and userWallet
 * @returns Claim signature with all required parameters
 */
export async function POST(request: NextRequest) {
  // Validate request using Zod schema
  const validation = await validateRequest(request, GenerateClaimSignatureSchema, { method: 'POST' });

  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error } as ApiResponse,
      { status: validation.status }
    );
  }

  const { tokenId, userWallet } = validation.data;

  try {

    // Get signer private key from environment variables
    const signerPrivateKey = process.env.SIGNER_PRIVATE_KEY;
    if (!signerPrivateKey) {
      console.error("SIGNER_PRIVATE_KEY not configured in environment variables");
      return NextResponse.json(
        { success: false, error: "Server configuration error" } as ApiResponse,
        { status: 500 }
      );
    }

    // Fetch card data from database to verify ownership and prize
    // Note: user_wallet field removed from Card model, ownership check needs to be updated
    const card = await prisma.card.findUnique({
      where: { token_id: tokenId },
      select: {
        id: true,
        prize_amount: true,
        prize_asset_contract: true,
        scratched: true,
        claimed: true
      }
    });

    if (!card) {
      return NextResponse.json(
        { success: false, error: "Card not found" } as ApiResponse,
        { status: 404 }
      );
    }

    // TODO: Implement proper ownership validation using userId relation with quick auth
    // For now, skip ownership check as user_wallet field is removed


    // Get prize details
    const prizeAmount = Number(card.prize_amount || 0);
    const prizeAsset = card.prize_asset_contract || USDC_ADDRESS;

    // For friend wins (prize_amount === -1), we still need to generate a signature
    // The smart contract will handle the friend win logic
    const actualPrizeAmount = prizeAmount === -1 ? 0 : prizeAmount;

    // Set deadline (1 hour from now)
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // Create signer account from private key
    const signerAccount = privateKeyToAccount(
      signerPrivateKey as `0x${string}`
    );

    // Create the message to sign
    // This should match the format expected by the smart contract
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

    // Return the signature and all required parameters
    const claimSignature = {
      prizeAmount: Math.floor(actualPrizeAmount * 1_000_000).toString(), // Convert to USDC units
      tokenAddress: prizeAsset,
      deadline: deadline.toString(),
      signature: signature,
    };

    console.log(`Generated claim signature for token ${tokenId} for user ${userWallet}`);

    const currUser = await prisma.user.findFirst({
      where: {
        address: validation.data.userWallet
      }
    })

    // update prisma
    await prisma.card.update({
      where: {
        token_id: validation.data.tokenId
      },
      data: {
        scratched: true,
        scratched_by_user_id: currUser?.id,
        scratched_at: new Date().toISOString(),
      }
    })

    return NextResponse.json({
      success: true,
      data: claimSignature,
    } as ApiResponse);

  } catch (error) {
    console.error("Error generating claim signature:", error);

    // Return a more user-friendly error message
    if (error instanceof Error) {
      // Don't expose internal error details in production
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(
          { success: false, error: `Failed to generate signature: ${error.message}` } as ApiResponse,
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "Failed to generate claim signature" } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    endpoint: "/api/cards/generate-claim-signature"
  });
}