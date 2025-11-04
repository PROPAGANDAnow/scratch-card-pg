import { NextRequest, NextResponse } from "next/server";
import { encodeAbiParameters, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { validateRequest } from "~/lib/validations";
import { GenerateClaimSignatureSchema } from "~/lib/validations";
import { prisma } from "~/lib/prisma";
import { USDC_ADDRESS } from "~/lib/constants";
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
    const card = await prisma.card.findUnique({
      where: { token_id: parseInt(tokenId) },
      select: {
        id: true,
        user_wallet: true,
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

    // Validate card ownership
    if (card.user_wallet.toLowerCase() !== userWallet.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Card does not belong to this user" } as ApiResponse,
        { status: 403 }
      );
    }

    // Check if card has been scratched
    if (!card.scratched) {
      return NextResponse.json(
        { success: false, error: "Card must be scratched before claiming" } as ApiResponse,
        { status: 400 }
      );
    }

    // Check if prize has already been claimed
    if (card.claimed) {
      return NextResponse.json(
        { success: false, error: "Prize already claimed" } as ApiResponse,
        { status: 400 }
      );
    }

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