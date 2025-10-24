import { NextRequest, NextResponse } from "next/server";
import { encodeAbiParameters, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { supabaseAdmin } from "~/lib/supabaseAdmin";
import { USDC_ADDRESS } from "~/lib/constants";

// Type definitions
interface ClaimSignature {
  prizeAmount: string;
  tokenAddress: string;
  deadline: string;
  signature: string;
}

interface GenerateSignatureRequest {
  tokenId: number;
  userWallet: string;
}

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
  try {
    const { tokenId, userWallet }: GenerateSignatureRequest = await request.json();

    // Validate required fields
    if (!tokenId || !userWallet) {
      return NextResponse.json(
        { error: "Missing required fields: tokenId or userWallet" },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userWallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Get signer private key from environment variables
    const signerPrivateKey = process.env.SIGNER_PRIVATE_KEY;
    if (!signerPrivateKey) {
      console.error("SIGNER_PRIVATE_KEY not configured in environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Fetch card data from database to verify ownership and prize
    const { data: card, error: cardError } = await supabaseAdmin
      .from("cards")
      .select(
        "id, user_wallet, prize_amount, prize_asset_contract, scratched, claimed"
      )
      .eq("id", tokenId)
      .single();

    if (cardError || !card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    // Validate card ownership
    if (card.user_wallet.toLowerCase() !== userWallet.toLowerCase()) {
      return NextResponse.json(
        { error: "Card does not belong to this user" },
        { status: 403 }
      );
    }

    // Check if card has been scratched
    if (!card.scratched) {
      return NextResponse.json(
        { error: "Card must be scratched before claiming" },
        { status: 400 }
      );
    }

    // Check if prize has already been claimed
    if (card.claimed) {
      return NextResponse.json(
        { error: "Prize already claimed" },
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
    const claimSignature: ClaimSignature = {
      prizeAmount: Math.floor(actualPrizeAmount * 1_000_000).toString(), // Convert to USDC units
      tokenAddress: prizeAsset,
      deadline: deadline.toString(),
      signature: signature,
    };

    console.log(`Generated claim signature for token ${tokenId} for user ${userWallet}`);

    return NextResponse.json({
      success: true,
      signature: claimSignature,
    });

  } catch (error) {
    console.error("Error generating claim signature:", error);
    
    // Return a more user-friendly error message
    if (error instanceof Error) {
      // Don't expose internal error details in production
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(
          { error: `Failed to generate signature: ${error.message}` },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to generate claim signature" },
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