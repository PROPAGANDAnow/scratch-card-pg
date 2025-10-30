import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";
import { getRevealsToNextLevel } from "~/lib/level";
import axios from "axios";

export async function POST(request: NextRequest) {
  try {
    const { userWallet, fid, username, pfp } = await request.json();

    if (!userWallet) {
      return NextResponse.json(
        { error: "Missing userWallet" },
        { status: 400 }
      );
    }

    if (!fid) {
      return NextResponse.json(
        { error: "Missing fid" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { wallet: userWallet },
      select: { wallet: true, fid: true, username: true }
    });

    if (!existingUser) {
      const data = await axios.get(`https://api.neynar.com/v2/farcaster/user/bulk/?fids=${fid}`,
        {
          headers: {
            "x-api-key": process.env.NEYNAR_API_KEY,
          },
        })
      const user = data.data.users[0];
      const isPro = user?.pro?.status === "subscribed" || false;

      // Create new user
      const newUser = await prisma.user.create({
        data: {
          wallet: userWallet,
          fid,
          username,
          pfp: pfp,
          amount_won: 0,
          cards_count: 0,
          current_level: 1,
          reveals_to_next_level: getRevealsToNextLevel(1),
          is_pro: isPro
        }
      });

      console.log("New user created:", newUser);
      return NextResponse.json({
        success: true,
        user: newUser,
        isNewUser: true,
      });
    } else {
      // Update last_active for existing user, and add fid/username if missing
      const updateData: any = { last_active: new Date() };

      // Add fid if provided and user doesn't have it
      if (fid && !existingUser.fid) {
        updateData.fid = fid;
      }

      // Add username if provided and user doesn't have it
      if (username && !existingUser.username) {
        updateData.username = username;
      }

      const updatedUser = await prisma.user.update({
        where: { wallet: userWallet },
        data: updateData
      });

      return NextResponse.json({
        success: true,
        user: updatedUser,
        isNewUser: false,
      });
    }
  } catch (error) {
    console.error("Error in check-or-create user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
