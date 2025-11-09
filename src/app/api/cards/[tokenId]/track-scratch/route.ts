import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "~/lib/prisma";
import { withDatabaseRetry } from "~/lib/db-utils";
import { UpdateCardScratchStatusSchema } from "~/lib/validations";
import { ZodIssue } from "zod";

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
  try {
    const { tokenId } = await params;

    if (!tokenId) {
      return NextResponse.json(
        {
          success: false,
          error: "Token ID is required",
          field: "tokenId",
        },
        { status: 400 }
      );
    }

    const parsedTokenId = Number(tokenId);

    if (!Number.isInteger(parsedTokenId) || parsedTokenId < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Token ID must be a positive integer",
          field: "tokenId",
        },
        { status: 400 }
      );
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch (parseError) {
      console.error("Failed to parse claim update payload", parseError);

      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON body",
          field: "body",
        },
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
        {
          success: false,
          error: message,
          field,
        },
        { status: 400 }
      );
    }

    const { scratched, scratchedBy, prizeWon } = validationResult.data;
    const normalizedScratcher = scratchedBy?.trim().toLowerCase();

    // Fetch user ID from database if scratchedBy is provided
    const user = await withDatabaseRetry(() =>
      prisma.user.findUnique({
        where: { address: normalizedScratcher },
        select: { id: true }
      })
    );
    const userId = user?.id || null;

    const updatedCard = await withDatabaseRetry(() =>
      prisma.card.update({
        where: { token_id: parsedTokenId },
        data: {
          scratched,
          scratched_at: scratched ? new Date() : null,
          scratched_by_user_id: userId,
          prize_won: prizeWon,
        },
        select: {
          token_id: true,
          scratched: true,
          scratched_at: true,
          scratched_by_user_id: true,
          prize_won: true,
        },
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          tokenId: updatedCard.token_id,
          scratched: updatedCard.scratched,
          scratchedAt: updatedCard.scratched_at,
          scratchedBy: updatedCard.scratched_by_user_id,
          prizeWon: updatedCard.prize_won,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          error: "Card not found",
          field: "tokenId",
        },
        { status: 404 }
      );
    }

    console.error("Failed to update card claim status", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
