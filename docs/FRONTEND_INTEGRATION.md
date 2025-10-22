# Frontend Integration Guide

This guide explains how to integrate the ScratchCardGame contract into a web frontend, including wallet setup, proof handling, registration, and claiming flows.

## Prerequisites

- A deployed ScratchCardGame contract: `0xA010347FA956fCd3E19a5d0311b7b68C459916Db` (Base Sepolia)
- Chain RPC URL and chain ID (Base Sepolia, 84532)
- ABI for the functions used (see examples below)
- A ZK proof generation pipeline available to your app (client or backend)
- Ethers v5 (or viem/wagmi equivalent)

## Key Concepts

- Card identity is `bytes32 recordId` stored on-chain.
- Off-chain, you may use a human UUID `recordId` string. The on-chain `recordId` MUST be `keccak256(utf8(UUID))`.
- ZK proof public signals MUST be `[recordIdHash, prizeAmountWei]`:
  - `recordIdHash = keccak256(utf8(UUID))` as uint256
  - `prizeAmountWei = parseEther(<prizeTier>)`
- Registration stores card owner, prize, and claimed flag. Claiming transfers ETH equal to the prize.

## Recommended Architecture

- Generate cards and proofs off-chain (prefer a backend to avoid exposing grids/salts in the browser). Store minimal client-facing data (UUID, recordIdHash, prizeTier, proof).
- Frontend responsibilities:
  - Connect wallet; show card price and game stats
  - Register cards (batch) with payment
  - Claim prizes for owned winning cards
  - Listen for `CardsRegistered` and `PrizeClaimed` events

## Minimal ABI

```ts
export const SCRATCH_CARD_ABI = [
  "function cardPrice() view returns (uint256)",
  "function maxBatchSize() view returns (uint256)",
  "function getStats() view returns (uint256 totalRegistered, uint256 totalClaimed, uint256 totalDistributed, uint256 balance)",
  "function getCard(bytes32 recordId) view returns (address owner, uint256 prizeAmount, bool claimed, uint256 registeredAt)",
  "function getUserCards(address user) view returns (bytes32[])",
  "function registerCards(bytes32[] recordIds, uint256[] prizeAmounts, tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[2] publicSignals)[] proofs) payable",
  "function claimPrize(bytes32 recordId, tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[2] publicSignals) proof)",
  "event CardsRegistered(address indexed buyer, bytes32[] recordIds, uint256[] prizeAmounts, uint256 totalPaid, uint256 timestamp)",
  "event PrizeClaimed(bytes32 indexed recordId, address indexed winner, uint256 prizeAmount, uint256 timestamp)"
] as const;
```

## Setup (Ethers v5)

```ts
import { ethers } from "ethers";
import { SCRATCH_CARD_ABI } from "./abi";

const provider = new ethers.providers.Web3Provider(window.ethereum);
await provider.send("eth_requestAccounts", []);
const signer = provider.getSigner();

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const game = new ethers.Contract(CONTRACT_ADDRESS, SCRATCH_CARD_ABI, signer);
```

## Encoding IDs and Amounts

```ts
// UUID string -> bytes32 hash used on-chain
export const toRecordIdHash = (uuid: string) =>
  ethers.utils.keccak256(ethers.utils.toUtf8Bytes(uuid));

// Prize tier (e.g., 1, 5, 10) -> wei
export const toWei = (eth: number | string) =>
  ethers.utils.parseEther(String(eth));
```

## Reading State

```ts
const priceWei: ethers.BigNumber = await game.cardPrice();
const priceEth = ethers.utils.formatEther(priceWei);

const [totalRegistered, totalClaimed, totalDistributed, balance] = await game.getStats();

const cardInfo = await game.getCard(<bytes32RecordId>); // returns owner, prizeAmount, claimed, registeredAt
const userCards: string[] = await game.getUserCards(await signer.getAddress());
```

## Register Cards (Batch)

Inputs per card (from backend/gen pipeline):
- `uuid: string`
- `recordIdHash = toRecordIdHash(uuid)`
- `prizeAmountWei = toWei(prizeTier)`
- `proof = { a, b, c, publicSignals }` where `publicSignals = [recordIdHashUint256, prizeAmountWeiUint256]`

```ts
type Groth16Proof = {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
  publicSignals: [string, string]; // as decimal strings or hex; contract accepts uint256
};

async function registerBatch(cards: { uuid: string; recordIdHash: string; prizeAmountWei: string; proof: Groth16Proof; }[]) {
  const recordIds = cards.map(c => c.recordIdHash);
  const prizeAmounts = cards.map(c => ethers.BigNumber.from(c.prizeAmountWei));
  const proofs = cards.map(c => c.proof);

  const priceWei = await game.cardPrice();
  const totalValue = priceWei.mul(cards.length);

  const tx = await game.registerCards(recordIds, prizeAmounts, proofs, { value: totalValue });
  const receipt = await tx.wait();
  return receipt;
}
```

Important:
- `recordIds` must be `keccak256(utf8(UUID))` — do NOT use `formatBytes32String(UUID)`.
- `proof.publicSignals[0]` must equal `uint256(recordIdHash)`.
- `proof.publicSignals[1]` must equal `prizeAmountWei`.

## Claim Prize (Single Card)

Inputs:
- `uuid: string` (to locate the card off-chain)
- `recordIdHash = toRecordIdHash(uuid)`
- `proof` corresponding to that card

```ts
async function claim(uuid: string, proof: Groth16Proof) {
  const recordIdHash = toRecordIdHash(uuid);

  // Optional: verify ownership and status before claiming
  const [owner, prizeAmount, claimed] = await game.getCard(recordIdHash);
  const me = await signer.getAddress();
  if (owner.toLowerCase() !== me.toLowerCase()) throw new Error("Not owner");
  if (claimed) throw new Error("Already claimed");
  if (prizeAmount.eq(0)) throw new Error("No prize to claim");

  const tx = await game.claimPrize(recordIdHash, proof);
  const receipt = await tx.wait();
  return receipt;
}
```

## Event Subscriptions

```ts
game.on("CardsRegistered", (buyer, recordIds, prizeAmounts, totalPaid, ts) => {
  // update UI / cache
});

game.on("PrizeClaimed", (recordId, winner, prizeAmount, ts) => {
  // update UI / cache
});
```

## Common Errors & Reverts

- "Incorrect payment amount": send `cardPrice * quantity` in `msg.value`.
- "Exceeds maximum batch size": split large purchases.
- "RecordId already used": each `recordIdHash` must be unique; don’t reuse.
- "Invalid proof": ensure public signals match `[recordIdHash, prizeAmountWei]`.
- "Not card owner" / "Prize already claimed" / "No prize to claim": check with `getCard` before claim.
- "Insufficient balance" (user): ensure wallet has enough for price + gas.
- Insufficient contract balance: owner should fund the contract so prizes can be paid out.

## Security & UX Notes

- Prefer server-side proof generation to keep grid/salt private and reduce client complexity.
- Never trust client-provided prize amounts; enforce via ZK proofs only.
- Show `getStats()` and contract balance for transparency; warn if low.
- Respect `pause()` state: surface clear UI errors when paused.
- Batch registration to reduce gas, up to `maxBatchSize`.
- Set `NEXT_PUBLIC_ENABLE_SERVER_PAYOUT=false` to disable legacy server payouts.

## Using viem/wagmi (Optional)

You can replace ethers with viem/wagmi for React apps. The core rules remain the same: compute `recordIdHash` with `keccak256(utf8(UUID))`, match `publicSignals`, pass `value` for registration, and handle events to sync UI state.

## Checklist

- [ ] Wallet connect and network check
- [ ] Fetch `cardPrice`, `maxBatchSize`, `getStats`
- [ ] Generate or fetch cards with `{ uuid, recordIdHash, prizeAmountWei, proof }`
- [ ] Register batch with `value = cardPrice * n`
- [ ] Render user cards and status via `getUserCards` + `getCard`
- [ ] Claim prize using the same `recordIdHash` and proof
- [ ] Listen for `CardsRegistered` / `PrizeClaimed` to keep UI in sync
