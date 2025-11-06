import { NextRequest, NextResponse } from "next/server";
import { withDatabaseRetry } from "~/lib/db-utils";
import { User } from "@prisma/client";
import {
  getOrCreateUserByFid,
  getOrCreateUserByAddress,
  findUser,
  updateUser
} from "~/lib/neynar-users";

export async function POST(request: NextRequest) {
  try {
    const { userWallet, fid } = await request.json() as {
      userWallet?: string,
      fid?: number
    };

    // Validate that at least one identifier is provided
    if (!userWallet && !fid) {
      return NextResponse.json(
        { error: "Either userWallet or fid must be provided" },
        { status: 400 }
      );
    }

    let user: User | undefined;
    let isNewUser = false;

    // Case 1: Only FID is provided
    if (fid && !userWallet) {
      // Check if user exists first to determine if it's new
      const existingUser = await withDatabaseRetry(() => findUser(fid));
      isNewUser = !existingUser;
      user = await getOrCreateUserByFid(fid);
    }
    // Case 2: Only wallet address is provided
    else if (userWallet && !fid) {
      // Check if user exists first to determine if it's new
      const existingUser = await withDatabaseRetry(() => findUser(undefined, userWallet));
      isNewUser = !existingUser;
      user = await getOrCreateUserByAddress(userWallet);
    }
    // Case 3: Both are provided - use wallet as primary, fid as fallback/verification
    else if (userWallet && fid) {
      // First try to find by wallet
      const existingUser = await withDatabaseRetry(() => findUser(undefined, userWallet));

      if (existingUser) {
        // If user exists, update FID if missing
        if (!existingUser.fid) {
          user = await withDatabaseRetry(() => updateUser(existingUser.id, { fid }));
        } else {
          user = existingUser;
        }
        isNewUser = false;
      } else {
        // Create new user with both address and fid
        user = await getOrCreateUserByAddress(userWallet);
        // Also update the FID if not already set
        if (!user.fid) {
          user = await withDatabaseRetry(() => updateUser(user.id, { fid }));
        }
        isNewUser = true;
      }
    }

    // Final check - if user somehow doesn't exist, try one more time
    if (!user) {
      if (userWallet) {
        user = await getOrCreateUserByAddress(userWallet);
      } else if (fid) {
        user = await getOrCreateUserByFid(fid);
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create or retrieve user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        address: user.address,
        fid: user.fid,
        id: user.id,
      },
      isNewUser: isNewUser,
    });

  } catch (error) {
    console.error("Error in check-or-create user:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('NEYNAR_API_KEY')) {
        return NextResponse.json(
          { error: "Server configuration error" },
          { status: 500 }
        );
      }

      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      if (error.message.includes('Can\'t reach database server')) {
        return NextResponse.json(
          { error: "Database temporarily unavailable, please try again" },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
