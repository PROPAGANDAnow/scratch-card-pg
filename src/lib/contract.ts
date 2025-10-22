import { createPublicClient, http, parseEther, keccak256, stringToHex } from "viem";
import type { PublicClient, WalletClient, Hex } from "viem";
import { base, baseSepolia } from "wagmi/chains";
import { SCRATCH_CARD_ABI, SCRATCH_CARD_CONTRACT_ADDRESS, BASE_SEPOLIA_CHAIN_ID } from "~/lib/abi";

export type Groth16Proof = {
  a: [Hex, Hex];
  b: [[Hex, Hex], [Hex, Hex]];
  c: [Hex, Hex];
  publicSignals: [Hex | string, Hex | string];
};

export const CONTRACT_ADDRESS = SCRATCH_CARD_CONTRACT_ADDRESS;

// Choose Base Sepolia by default; allow switching via env if needed
const chain = BASE_SEPOLIA_CHAIN_ID === 84532 ? baseSepolia : base;

export const getPublicClient = (rpcUrl?: string): PublicClient =>
  createPublicClient({ chain, transport: http(rpcUrl ?? process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL) });

export const getCardPrice = async (publicClient: PublicClient) => {
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: SCRATCH_CARD_ABI,
    functionName: "cardPrice",
  }) as Promise<bigint>;
};

export const getStats = async (publicClient: PublicClient) => {
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: SCRATCH_CARD_ABI,
    functionName: "getStats",
  }) as Promise<readonly [bigint, bigint, bigint, bigint]>;
};

export const getCard = async (publicClient: PublicClient, recordId: Hex) => {
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: SCRATCH_CARD_ABI,
    functionName: "getCard",
    args: [recordId],
  }) as Promise<readonly [`0x${string}`, bigint, boolean, bigint]>;
};

export const getUserCards = async (
  publicClient: PublicClient,
  user: `0x${string}`,
) => {
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: SCRATCH_CARD_ABI,
    functionName: "getUserCards",
    args: [user],
  }) as Promise<Hex[]>;
};

export const registerCards = async (
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: {
    recordIds: Hex[];
    prizeAmounts: bigint[];
    proofs: Groth16Proof[];
    totalValueWei?: bigint; // optional override
  },
) => {
  const price = params.totalValueWei ?? (await getCardPrice(publicClient)) * BigInt(params.recordIds.length);
  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: SCRATCH_CARD_ABI,
    functionName: "registerCards",
    args: [params.recordIds, params.prizeAmounts, params.proofs],
    value: price,
    chain,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
};

export const claimPrize = async (
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: { recordId: Hex; proof: Groth16Proof },
) => {
  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: SCRATCH_CARD_ABI,
    functionName: "claimPrize",
    args: [params.recordId, params.proof],
    chain,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
};

// Helpers
export const toRecordIdHash = (uuid: string): Hex => {
  // viem: keccak256 over hex-encoded utf8 string
  return keccak256(stringToHex(uuid));
};

export const toWei = (eth: number | string): bigint => parseEther(String(eth));
