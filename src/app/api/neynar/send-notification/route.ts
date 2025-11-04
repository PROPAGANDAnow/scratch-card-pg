import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";
import axios from "axios";
import { BestFriend } from "~/app/interface/bestFriends";

export async function POST(request: NextRequest) {
  try {
    const { fid, username, amount, friend_fid, bestFriends } = await request.json();

    if (!fid || !username || amount === undefined) {
      return NextResponse.json(
        { error: "Missing fid, username, or amount" },
        { status: 400 }
      );
    }

    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (!neynarApiKey) {
      console.error("NEYNAR_API_KEY not configured");
      return NextResponse.json(
        { error: "Notification service not configured" },
        { status: 500 }
      );
    }

    // If friend_fid is present, send notification only to that specific friend
    if (friend_fid && amount === -1) {
      try {
        const notificationResponse = await axios.post(
          "https://api.neynar.com/v2/farcaster/frame/notifications/",
          {
            notification: {
              target_url: process.env.NEXT_PUBLIC_URL,
              body: "Play Scratch Off to win big!",
              title: `${username} just won a free card for you!`,
            },
            target_fids: [friend_fid],
          },
          {
            headers: {
              accept: "application/json",
              "x-api-key": neynarApiKey,
              "content-type": "application/json",
            },
          }
        );

        console.log(`Sent friend win notification to FID ${friend_fid}`);
        return NextResponse.json({
          success: true,
          type: "friend_win",
          targetFid: friend_fid,
          notification: notificationResponse.data,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (notificationError: any) {
        console.error(
          "Neynar notification failed:",
          notificationError.response?.data || notificationError.message
        );
        return NextResponse.json(
          { error: "Failed to send friend notification" },
          { status: 500 }
        );
      }
    }

    // Step 2: Find users in database with notification_enabled = true
    const bestFriendFids = bestFriends.map((friend: BestFriend) => friend.fid);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let usersToNotify: any[] = [];

    if (bestFriendFids.length > 0) {
      try {
        // Since notification fields moved to separate Notification table,
        // we need to query differently
        const notifications = await prisma.notification.findMany({
          where: {
            user_fid: { in: bestFriendFids }
          },
          select: {
            user_fid: true,
            token: true
          }
        });

        // Get user details for those with notifications
        const users = await prisma.user.findMany({
          where: {
            fid: { in: notifications.map(n => n.user_fid) }
          },
          select: {
            fid: true
          }
        });

        // Combine the data
        const usersWithNotifications = users.map(user => {
          const notification = notifications.find(n => n.user_fid === user.fid);
          return {
            ...user,
            notification_token: notification?.token
          };
        });

        usersToNotify = usersWithNotifications;
        console.log(
          `Found ${usersToNotify.length} users with notifications enabled`
        );
      } catch (error) {
        console.error("Error querying database:", error);
        return NextResponse.json(
          { error: "Database query failed" },
          { status: 500 }
        );
      }
    }

    // Step 3: Send notifications to eligible users
    const targetFids = usersToNotify.map((user) => user.fid);
    let notificationResult = null;

    if (targetFids.length > 0) {
      try {
        const notificationResponse = await axios.post(
          "https://api.neynar.com/v2/farcaster/frame/notifications/",
          {
            notification: {
              target_url: process.env.NEXT_PUBLIC_URL,
              body: "Play Scratch Off to win big!",
              title: `${username} just won $${amount}!`,
            },
            target_fids: targetFids,
          },
          {
            headers: {
              accept: "application/json",
              "x-api-key": neynarApiKey,
              "content-type": "application/json",
            },
          }
        );

        notificationResult = notificationResponse.data;
        console.log(`Sent notifications to ${targetFids.length} users`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (notificationError: any) {
        console.error(
          "Neynar notification failed:",
          notificationError.response?.data || notificationError.message
        );
        return NextResponse.json(
          { error: "Failed to send notifications" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      type: "regular_win",
      bestFriendsCount: bestFriends.length,
      usersToNotifyCount: usersToNotify.length,
      targetFids,
      notification: notificationResult,
    });
  } catch (error) {
    console.error("Error in send notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
