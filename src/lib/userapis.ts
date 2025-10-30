import { prisma } from "./prisma";

// Fetch user info when wallet connects
export const fetchUserInfo = async (userWallet: string) => {
  if (!userWallet) return;

  try {
    const data = await prisma.user.findUnique({
      where: { wallet: userWallet }
    });

    if (!data) {
      console.error("User not found");
      return {};
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch user info:", error);
    return {}; // Return empty object instead of throwing
  }
};

// Fetch user cards when wallet connects
export const fetchUserCards = async (userWallet: string) => {
  if (!userWallet) return;

  try {
    const data = await prisma.card.findMany({
      where: { user_wallet: userWallet },
      orderBy: { card_no: 'desc' },
      take: 1000
    });

    return data;
  } catch (error) {
    console.error("Failed to fetch user cards:", error);
    return []; // Return empty array instead of throwing
  }
};

// Fetch app stats
export const fetchAppStats = async () => {
  try {
    const data = await prisma.stats.findUnique({
      where: { id: 1 }
    });

    if (!data) {
      console.error("Stats not found");
      return {};
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch app stats:", error);
    return {};
  }
};

export const fetchLeaderboard = async () => {
  try {
    const data = await prisma.user.findMany({
      orderBy: { amount_won: 'desc' },
      take: 100
    });

    return data;
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return [];
  }
};

export const fetchActivity = async () => {
  try {
    const data = await prisma.card.findMany({
      where: { scratched: true },
      include: { user: true },
      orderBy: { scratched_at: 'desc' },
      take: 500
    });

    return data;
  } catch (error) {
    console.error("Failed to fetch activity:", error);
    return [];
  }
};

export const fetchBestFriends = async (fid: number) => {
  try {
    const response = await fetch(`/api/users/best-friends?fid=${fid}`);
    const data = await response.json();
    return data.bestFriends;
  } catch (error) {
    console.error("Failed to fetch best friends:", error);
    return [];
  }
};
