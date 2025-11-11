import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "~/lib/prisma";
import { withDatabaseRetry } from "~/lib/db-utils";
import { UpdateCardScratchStatusSchema } from "~/lib/validations";
import { ZodIssue } from "zod";
import { getOrCreateUserByAddress } from "~/lib/neynar-users";
import { SCRATCH_CARD_NFT_ADDRESS } from "~/lib/blockchain";

const DEFAULT_VALIDATION_FIELD = "body" as const;

type ValidationErrorDetails = {
  field: string;
  message: string;
};

function getValidationDetails(issue: ZodIssue): ValidationErrorDetails {
  const fieldPath = issue.path[0];
  const field = typeof fieldPath === "string" ? fieldPath : DEFAULT_VALIDATION_FIELD;

  return {
    field,
    message: issue.message,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  // Start performance timer
  const startTime = Date.now();

  try {
    // Parse and validate token ID
    const { tokenId } = await params;

    if (!tokenId) {
      return NextResponse.json(
        { success: false, error: "Token ID is required", field: "tokenId" },
        { status: 400 }
      );
    }

    const parsedTokenId = Number(tokenId);
    if (!Number.isInteger(parsedTokenId) || parsedTokenId < 0) {
      return NextResponse.json(
        { success: false, error: "Token ID must be a positive integer", field: "tokenId" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body", field: "body" },
        { status: 400 }
      );
    }

    const validationResult = UpdateCardScratchStatusSchema.safeParse(payload);
    if (!validationResult.success) {
      const [issue] = validationResult.error.issues;
      const { field, message } = issue ? getValidationDetails(issue) : {
        field: DEFAULT_VALIDATION_FIELD,
        message: "Invalid request payload",
      };

      return NextResponse.json(
        { success: false, error: message, field },
        { status: 400 }
      );
    }

    const { scratched, scratchedBy, prizeWon } = validationResult.data;

    // Prepare update data
    const updateData: Prisma.CardUpdateInput = {
      scratched,
      scratched_at: scratched ? new Date() : null,
      prize_won: prizeWon,
    };

    const scratchUser = await getOrCreateUserByAddress(scratchedBy.trim().toLowerCase())

    // Update the card with minimal select fields for performance
    const updateResult = await withDatabaseRetry(() =>
      prisma.card.updateMany({
        where: { 
          token_id: parsedTokenId,
          contract_address: SCRATCH_CARD_NFT_ADDRESS
        },
        data: updateData,
      })
    );

    if (updateResult.count === 0) {
      return NextResponse.json(
        { success: false, error: "Card not found", field: "tokenId" },
        { status: 404 }
      );
    }

    // Get the updated card to return
    const updatedCard = await prisma.card.findFirst({
      where: { 
        token_id: parsedTokenId,
        contract_address: SCRATCH_CARD_NFT_ADDRESS
      },
      select: {
        token_id: true,
        scratched: true,
        scratched_at: true,
        prize_won: true,
      },
    });

    if (!updatedCard) {
      return NextResponse.json(
        { success: false, error: "Card not found after update", field: "tokenId" },
        { status: 404 }
      );
    }

    // Log performance metric in development
    if (process.env.NODE_ENV === 'development') {
      const duration = Date.now() - startTime;
      console.log(`[track-scratch] Token ${parsedTokenId} updated in ${duration}ms`);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          tokenId: updatedCard.token_id,
          scratched: updatedCard.scratched,
          scratchedAt: updatedCard.scratched_at,
          scratchedBy: scratchUser.address,
          prizeWon: updatedCard.prize_won,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    // Handle specific database errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { success: false, error: "Card not found", field: "tokenId" },
          { status: 404 }
        );
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { success: false, error: "Card already updated", field: "tokenId" },
          { status: 409 }
        );
      }
    }

    console.error("Failed to update card scratch status:", error);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
