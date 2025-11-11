import { prisma } from "./prisma";
import { User } from "@prisma/client";

export interface NeynarUser {
  object: string;
  fid: number;
  username: string;
  display_name: string;
  custody_address: string;
  pfp_url: string;
  profile: {
    bio: {
      text: string;
    };
  };
  follower_count: number;
  following_count: number;
  verifications: string[];
  verified_addresses: {
    eth_addresses: string[];
    sol_addresses: string[];
    primary: {
      eth_address?: string;
      sol_address?: string;
    };
  };
  power_badge: boolean;
  score?: number;
}

/**
 * Retrieves a user from the database by FID, or creates them if they don't exist.
 * If the user doesn't exist, it fetches their data from Neynar API using their FID.
 */
export const getOrCreateUserByFid = async (fid: number): Promise<User> => {
  if (!process.env.NEYNAR_API_KEY) {
    throw new Error("NEYNAR_API_KEY is not defined");
  }

  // First check if user exists in database
  const existingUser = await prisma.user.findFirst({
    where: { fid },
  })

  if (existingUser) {
    return existingUser;
  }

  // Fetch user from Neynar API
  const response = await fetch(
    `https://api.neynar.com/v2/farcaster/user/bulk/?fids=${fid}`,
    {
      headers: {
        "x-api-key": process.env.NEYNAR_API_KEY,
        "x-neynar-experimental": "false",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Neynar API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.users || data.users.length === 0) {
    throw new Error(`User with FID ${fid} not found`);
  }

  const neynarUser: NeynarUser = data.users[0];

  // Use primary eth address if available, otherwise first verified address
  const primaryAddress = neynarUser.verified_addresses?.primary?.eth_address ||
    neynarUser.verified_addresses?.eth_addresses?.[0] ||
    neynarUser.custody_address;

  if (!primaryAddress) {
    throw new Error(`No valid address found for user with FID ${fid}`);
  }

  // Create new user in database
  const newUser = await prisma.user.create({
    data: {
      address: primaryAddress.toLowerCase(),
      fid: neynarUser.fid,
    },
  })

  return newUser;
};

/**
 * Retrieves a user from the database by address, or creates them if they don't exist.
 * If the user doesn't exist, it fetches their data from Neynar API using their address.
 */
export const getOrCreateUserByAddress = async (address: string): Promise<User> => {
  if (!process.env.NEYNAR_API_KEY) {
    throw new Error("NEYNAR_API_KEY is not defined");
  }

  const normalizedAddress = address.toLowerCase();

  // First check if user exists in database
  const existingUser = await prisma.user.findFirst({
    where: { address: normalizedAddress },
  })

  if (existingUser) {
    return existingUser;
  }

  // Fetch user from Neynar API by address
  const response = await fetch(
    `https://api.neynar.com/v2/farcaster/user/bulk-by-address/?addresses=${normalizedAddress}`,
    {
      headers: {
        "x-api-key": process.env.NEYNAR_API_KEY,
        "x-neynar-experimental": "false",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Neynar API error: ${response.statusText}`);
  }

  const data = await response.json();
  console.log("🚀 ~ getOrCreateUserByAddress ~ data:", data)

  const result = data[normalizedAddress] || data[address];
  if (!result || !Array.isArray(result) || result.length === 0) {
    throw new Error(`User with address ${address} not found`);
  }

  const neynarUser: NeynarUser = result[0];

  // Create new user in database
  const newUser = await prisma.user.create({
    data: {
      address: normalizedAddress,
      fid: neynarUser.fid,
    },
  })

  return newUser;
};

/**
 * Checks if a user exists in the database by either FID or address
 */
export const findUser = async (fid?: number, address?: string): Promise<User | null> => {
  if (fid) {
    return await prisma.user.findFirst({ where: { fid } });
  }
  if (address) {
    return await prisma.user.findFirst({ where: { address: address.toLowerCase() } });
  }
  return null;
};

/**
 * Updates a user's FID or address in the database
 */
export const updateUser = async (
  userId: string,
  data: { fid?: number; address?: string }
): Promise<User> => {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
      ...(data.address && { address: data.address.toLowerCase() }),
    },
  });
};