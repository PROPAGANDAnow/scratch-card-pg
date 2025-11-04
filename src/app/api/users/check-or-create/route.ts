import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";

import { withDatabaseRetry } from "~/lib/db-utils";

export async function POST(request: NextRequest) {
  try {
    const { userWallet, fid } = await request.json();

    if (!userWallet) {
      return NextResponse.json(
        { error: "Missing userWallet" },
        { status: 400 }
      );
    }

    // FID is now optional - only validate if provided

    // Check if user exists
    // Note: wallet field renamed to address in User model
    const existingUser = await withDatabaseRetry(() =>
      prisma.user.findUnique({
        where: { address: userWallet.toLowerCase() },
        select: { address: true, fid: true }
      })
    );

    if (!existingUser) {
      // Neynar API call disabled - user data not needed after schema changes
      // const data = await axios.get(`https://api.neynar.com/v2/farcaster/user/bulk/?fids=${fid}`,
      //   {
      //     headers: {
      //       "x-api-key": process.env.NEYNAR_API_KEY,
      //     },
      //   })
      // const user = data.data.users[0]; // Unused after schema changes

      // Create new user
      // Note: Many fields removed from User model, keeping only essential ones
      const newUser = await withDatabaseRetry(() =>
        prisma.user.create({
          data: {
            address: userWallet.toLowerCase(),
            fid
          }
        })
      );

      console.log("New user created:", newUser);
      return NextResponse.json({
        success: true,
        user: newUser,
        isNewUser: true,
      });
    } else {
      // Note: last_active, username fields removed from User model
      // Only update fid if missing
      const updateData: {
        fid?: number;
      } = {};

      // Add fid if provided and user doesn't have it
      if (fid && !existingUser.fid) {
        updateData.fid = fid;
      }

      const updatedUser = await withDatabaseRetry(() =>
        prisma.user.update({
          where: { address: userWallet.toLowerCase() },
          data: updateData
        })
      );

      return NextResponse.json({
        success: true,
        user: updatedUser,
        isNewUser: false,
      });
    }
  } catch (error) {
    console.error("Error in check-or-create user:", error);
    
    // Handle specific database connection errors
    if (error instanceof Error && error.message.includes('Can\'t reach database server')) {
      return NextResponse.json(
        { error: "Database temporarily unavailable, please try again" },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
