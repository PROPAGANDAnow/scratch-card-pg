import { NextResponse } from "next/server";
import { getBestFriends } from "~/lib/best-friends";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get("fid");

  if (!fid) {
    return NextResponse.json(
      { error: "FID parameter is required" },
      { status: 400 }
    );
  }

  try {
    const users = await getBestFriends(Number(fid))

    return NextResponse.json({ bestFriends: users });
  } catch (error) {
    console.error("Failed to fetch best friends:", error);
    return NextResponse.json(
      {
        error:
          "Failed to fetch best friends. Please check your Neynar API key and try again.",
      },
      { status: 500 }
    );
  }
}
