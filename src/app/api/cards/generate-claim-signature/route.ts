import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ApiResponse } from "~/app/interface/api";
import { PAYMENT_TOKEN, SCRATCH_CARD_NFT_ADDRESS, SIGNER_ADDRESS } from "~/lib/blockchain";
import { prisma } from "~/lib/prisma";
import { GenerateClaimSignatureSchema, validateRequest } from "~/lib/validations";

/**
 * Generate claim signature using contract hash generation
 *
 * This endpoint uses the contract's getClaimMessageHash function to generate
 * the message hash, ensuring perfect consistency with on-chain verification.
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

    // Fetch card data from database
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

    // Get prize details
    const prizeAmount = Number(card.prize_amount || 0);
    const prizeAsset = card.prize_asset_contract || PAYMENT_TOKEN.ADDRESS;

    // For friend wins (prize_amount === -1), we still need to generate a signature
    const actualPrizeAmount = prizeAmount === -1 ? 0 : prizeAmount;

    // Set deadline (24 hours from now)
    const deadline = Math.floor(Date.now() / 1000) + (24 * 3600);

    // Create signer account from private key
    const signerAccount = privateKeyToAccount(
      signerPrivateKey as `0x${string}`
    );

    // Create a public client to interact with the contract
    const publicClient = createPublicClient({
      chain: {
        id: 8453,
        name: 'Base',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
          default: { http: ['https://mainnet.base.org'] },
        },
        blockExplorers: {
          default: { name: 'Basescan', url: 'https://basescan.org' },
        },
      },
      transport: http()
    });

    // Convert prize amount to contract units using payment token decimals
    const prizeAmountContractUnits = Math.floor(actualPrizeAmount * Math.pow(10, PAYMENT_TOKEN.DECIMALS));

    // Get the message hash from the contract
    console.log('Getting message hash from contract...');
    const messageHash = await publicClient.readContract({
      address: SCRATCH_CARD_NFT_ADDRESS,
      abi: [
        {
          inputs: [
            { name: 'tokenId', type: 'uint256' },
            { name: 'prizeAmount', type: 'uint256' },
            { name: 'tokenAddress', type: 'address' },
            { name: 'deadline', type: 'uint256' }
          ],
          name: 'getClaimMessageHash',
          outputs: [{ name: '', type: 'bytes32' }],
          stateMutability: 'pure',
          type: 'function'
        }
      ],
      functionName: 'getClaimMessageHash',
      args: [BigInt(tokenId), BigInt(prizeAmountContractUnits), prizeAsset as `0x${string}`, BigInt(deadline)]
    });

    console.log('Message Hash from contract:', messageHash);

    // Sign the raw hash (as bytes) - this matches what the contract expects
    const signature = await signerAccount.signMessage({
      message: { raw: new Uint8Array(Buffer.from(messageHash.slice(2), 'hex')) }
    });

    console.log('Signature:', signature);

    // Verify the signature using the contract's verify function
    console.log('Verifying signature with contract...');
    const isValid = await publicClient.readContract({
      address: SCRATCH_CARD_NFT_ADDRESS,
      abi: [
        {
          inputs: [
            { name: 'tokenId', type: 'uint256' },
            { name: 'prizeAmount', type: 'uint256' },
            { name: 'tokenAddress', type: 'address' },
            { name: 'deadline', type: 'uint256' },
            { name: 'signature', type: 'bytes' }
          ],
          name: 'verifyClaimSignature',
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'view',
          type: 'function'
        }
      ],
      functionName: 'verifyClaimSignature',
      args: [BigInt(tokenId), BigInt(prizeAmountContractUnits), prizeAsset as `0x${string}`, BigInt(deadline), signature]
    });

    console.log('Contract verification result:', isValid);

    const isSignerCorrect = signerAccount.address.toLowerCase() === SIGNER_ADDRESS.toLowerCase();

    if (!isSignerCorrect) {
      console.error('⚠️ WARNING: Signer private key does not match SIGNER_ADDRESS in config!');
      console.error('Current address:', signerAccount.address);
      console.error('Expected address:', SIGNER_ADDRESS);
    }

    if (!isValid) {
      console.error('❌ Contract signature verification failed');
      return NextResponse.json(
        { success: false, error: "Failed to generate valid signature" } as ApiResponse,
        { status: 500 }
      );
    }

    console.log('✅ Signature generated and verified successfully by contract');

    // Return the signature and all required parameters
    const claimSignature = {
      prizeAmount: prizeAmountContractUnits.toString(), // Already in contract units
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

    // Update prisma
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
    endpoint: "/api/cards/generate-claim-signature",
    usingContractHash: true
  });
}