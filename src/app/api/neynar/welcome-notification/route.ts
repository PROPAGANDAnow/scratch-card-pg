import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";
import axios from "axios";

export async function POST(request: NextRequest) {
  try {
    const { fid, notification_token } = await request.json();

    if (!fid || !notification_token) {
      return NextResponse.json(
        { error: "Missing fid or notification_token" },
        { status: 400 }
      );
    }

    // Find user by FID
    const user = await prisma.user.findFirst({
      where: { fid: fid }
    });

    if (!user) {
      console.error("User not found by FID:", fid);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create or update notification record
    // First check if notification exists
    const existingNotification = await prisma.notification.findFirst({
      where: { user_fid: fid }
    });

    if (existingNotification) {
      await prisma.notification.update({
        where: { id: existingNotification.id },
        data: {
          token: notification_token,
          updated_at: new Date(),
        }
      });
    } else {
      await prisma.notification.create({
        data: {
          user_fid: fid,
          token: notification_token,
        }
      });
    }

    // Send notification via Neynar
    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (!neynarApiKey) {
      console.error("NEYNAR_API_KEY not configured");
      return NextResponse.json(
        { error: "Notification service not configured" },
        { status: 500 }
      );
    }

    try {
      const notificationResult = await axios.post(
        "https://api.neynar.com/v2/farcaster/frame/notifications/",
        {
          notification: {
            target_url: process.env.NEXT_PUBLIC_URL,
            body: "Scratch to win big!",
            title: "Welcome to Scratch Off!",
          },
          target_fids: [fid],
        },
        {
          headers: {
            accept: "application/json",
            "x-api-key": process.env.NEYNAR_API_KEY,
            "content-type": "application/json",
          },
        }
      );

      return NextResponse.json({
        success: true,
        user: { fid, address: user.address },
        notification: notificationResult.data,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (notificationError: any) {
      console.error(
        "Neynar notification failed:",
        notificationError.response?.data || notificationError.message
      );
      return NextResponse.json(
        { error: "Failed to send notification" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in welcome notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
