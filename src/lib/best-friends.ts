interface BestFriend {
  fid: number;
  username: string;
  pfp: string;
  wallet: string;
}

interface NeynarUser {
  user: {
    fid: number;
    username: string;
    pfp_url: string;
    verified_addresses: {
      primary: {
        eth_address: string;
      };
    };
  };
}

interface NeynarResponse {
  users: NeynarUser[];
}

/**
 * Fetches reciprocal followers (best friends) for a given Farcaster ID
 * @param fid - The Farcaster ID to fetch best friends for
 * @returns Promise<BestFriend[]> - Array of best friends with their details
 * @throws Error - If API key is missing or API call fails
 */
export const getBestFriends = async (fid: number): Promise<BestFriend[]> => {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Neynar API key is not configured. Please add NEYNAR_API_KEY to your environment variables."
    );
  }

  const bulkResponse = await fetch(
    `https://api.neynar.com/v2/farcaster/followers/reciprocal/?limit=100&sort_type=algorithmic&fid=${fid}`,
    {
      headers: {
        "x-api-key": apiKey,
      },
    }
  ).then(a => a.json()) as NeynarResponse;

  const users = bulkResponse.users.map(
    (user: NeynarUser): BestFriend => ({
      fid: user.user.fid,
      username: user.user.username,
      pfp: user.user.pfp_url,
      wallet: user.user.verified_addresses.primary.eth_address,
    })
  );

  return users;
};