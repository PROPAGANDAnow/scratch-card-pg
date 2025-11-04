import { prisma } from './prisma';
import { createPublicClient, http, getContract } from 'viem';
import { base } from 'viem/chains';

// Create a public client for Base network
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// ERC-721 ABI for ownerOf function
const ERC721_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface OwnershipResult {
  owner: string;
  isValid: boolean;
  error?: string;
}

/**
 * Verify on-chain ownership of an NFT token
 * @param contractAddress The NFT contract address
 * @param tokenId The token ID to check
 * @param expectedOwner Optional expected owner address to validate against
 * @returns OwnershipResult with owner address and validation status
 */
export async function verifyTokenOwnership(
  contractAddress: string,
  tokenId: number,
  expectedOwner?: string
): Promise<OwnershipResult> {
  try {
    // Get the owner from on-chain data using viem
    const contract = getContract({
      address: contractAddress as `0x${string}`,
      abi: ERC721_ABI,
      client: publicClient,
    });

    const actualOwner = await contract.read.ownerOf([BigInt(tokenId)]);
    
    // If expectedOwner is provided, validate it matches
    if (expectedOwner) {
      const isValid = actualOwner.toLowerCase() === expectedOwner.toLowerCase();
      return {
        owner: actualOwner.toLowerCase(),
        isValid,
        error: isValid ? undefined : 'Owner mismatch'
      };
    }

    return {
      owner: actualOwner.toLowerCase(),
      isValid: true
    };
  } catch (error) {
    console.error('Error verifying token ownership:', error);
    return {
      owner: '',
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get user by address (resolves to User.id)
 * @param address The wallet address
 * @returns User record or null
 */
export async function getUserByAddress(address: string) {
  return await prisma.user.findUnique({
    where: { address: address.toLowerCase() },
    select: { id: true, address: true, fid: true }
  });
}

/**
 * Verify if a user can perform an action on a card
 * @param userAddress The user's wallet address
 * @param contractAddress The NFT contract address
 * @param tokenId The token ID
 * @param action The action being performed ('scratch', 'claim', 'gift')
 * @returns OwnershipResult with additional context
 */
export async function verifyUserCardAction(
  userAddress: string,
  contractAddress: string,
  tokenId: number,
  action: 'scratch' | 'claim' | 'gift'
): Promise<OwnershipResult & { canAct: boolean }> {
  // First verify on-chain ownership
  const ownership = await verifyTokenOwnership(contractAddress, tokenId, userAddress);
  
  if (!ownership.isValid) {
    return {
      ...ownership,
      canAct: false
    };
  }

  // Get the user record
  const user = await getUserByAddress(userAddress);
  if (!user) {
    return {
      owner: ownership.owner,
      isValid: false,
      error: 'User not found',
      canAct: false
    };
  }

  // Get the card record to check additional permissions
  const card = await prisma.card.findUnique({
    where: { token_id: tokenId },
    select: {
      scratched_by_user_id: true,
      gifter_id: true,
      gifted_to_user_id: true,
      minter_user_id: true,
      scratched: true,
      claimed: true
    }
  });

  if (!card) {
    return {
      owner: ownership.owner,
      isValid: false,
      error: 'Card not found',
      canAct: false
    };
  }

  // Check action-specific permissions
  let canAct = false;

  switch (action) {
    case 'scratch':
      // Can scratch if they own it and it's not already scratched
      canAct = !card.scratched;
      break;
    case 'claim':
      // Can claim if they own it, it's scratched, and not claimed
      canAct = card.scratched && !card.claimed;
      break;
    case 'gift':
      // Can gift if they own it and it's not already gifted
      canAct = !card.gifted_to_user_id;
      break;
  }

  return {
    owner: ownership.owner,
    isValid: true,
    canAct
  };
}