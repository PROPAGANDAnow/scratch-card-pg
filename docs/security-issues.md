# Security Issues and Preventive Fixes

This document highlights concrete risks that could enable API abuse and wallet drain, plus actionable fixes (DB constraints, idempotency, auth, and rate limits) you can apply immediately.

## Critical Risks

1. Unauthenticated endpoints and admin bypass
   - Endpoints trust request body fields like `userWallet`, `cardId`, `paymentTx` without authenticating the caller or authorizing actions. 
   - Server uses `supabaseAdmin` (service role key) which bypasses RLS; your API layer becomes the only guard. Anyone can call these endpoints if they know the routes.

2. Payout replay on `/api/cards/process-prize`
   - Admin private key sends ERC-20 transfers. If a request can be replayed or raced before the state flips to `claimed`, the same card could trigger multiple payouts.
   - The code updates `scratched` via an UPDATE+RETURNING filter, then proceeds to payout and only later flips `claimed`. Without atomicity or a uniqueness guard, concurrent calls can slip in.

3. PaymentTx replay on `/api/cards/buy`
   - You verify the transaction on-chain, but you don’t enforce that a `paymentTx` is only used once. Attackers can reuse a single, valid tx hash to mint cards repeatedly.

4. No rate limiting / spam control
   - No per-IP/per-wallet rate limits on sensitive endpoints (buy, process-prize). Attackers can brute force timing windows and race conditions.

5. Insufficient input validation
   - No strict validation for `userWallet`, `cardId`, `paymentTx` formats. Abuse can include malformed data, spoofing, or DoS via oversized payloads.

6. Operational blast radius
   - Payouts occur directly from the hot admin wallet in the request path. If an endpoint is abused, funds can drain quickly.

## Must-Do Fixes (with examples)

### A) Enforce Idempotency and One-Time Payouts

1) Database uniqueness for one reveal per card:

```sql
-- Only one reveal per card
create unique index if not exists uniq_reveals_card on public.reveals(card_id);
```

2) Atomic state transition for claiming a card:

- Replace multi-step logic with a single conditional update that flips `claimed` and returns the row only if it was unclaimed.

Pseudo with PostgREST semantics (Supabase):

```ts
// Step 1: lock claim in DB first (fails closed if already claimed)
const { data: toClaim, error: lockErr } = await supabaseAdmin
  .from('cards')
  .update({ claimed: true, claimed_at: new Date().toISOString() })
  .eq('id', cardId)
  .eq('user_wallet', userWallet)
  .eq('claimed', false)       // idempotency guard
  .select('id, prize_amount, prize_asset_contract')
  .single();

if (lockErr || !toClaim) {
  return 409/400 with "Already claimed or invalid";
}

// Step 2: perform payout once for the returned row
```

- Alternatively, implement a Postgres RPC (`claim_card(p_card_id, p_wallet)`) that uses a single transaction with `SELECT ... FOR UPDATE` to fetch + mark claimed atomically.

3) Idempotency keys on requests:

- Require an `Idempotency-Key` header for `process-prize` and store it in a table with a TTL. Reject if seen.

```sql
create table if not exists idempotency_keys (
  key text primary key,
  created_at timestamptz default now()
);
```

### B) Block PaymentTx Reuse in Buy Flow

Use a partial unique index that ignores known free-card markers:

```sql
-- Prevent reusing the same chain tx to mint cards multiple times
create unique index if not exists uniq_cards_payment_tx
  on public.cards (payment_tx)
  where payment_tx not like 'FREE_%';
```

In `buy/route.ts`, also precheck:

```ts
const { data: used, error } = await supabaseAdmin
  .from('cards')
  .select('id')
  .eq('payment_tx', paymentTx)
  .limit(1);
if (used?.length) return 409 with "paymentTx already used";
```

Optionally verify the USDC `Transfer` sender matches `userWallet` to bind payment to caller:

- Current check only validates recipient and amount; also enforce `from == userWallet` by decoding `topics[1]`.

### C) Add Authentication and Authorization

- Require proof-of-wallet ownership for sensitive operations:
  - SIWE (Sign-In with Ethereum) or equivalent signed message that includes the exact action (buy/process-prize), `cardId`, and a nonce with expiration.
  - Verify signature server-side and bind the session to `userWallet`.

- If using Neynar/Farcaster, verify the user identity server-side and map to the `userWallet` you trust, not the one provided in the request body.

- Stop using `supabaseAdmin` for user-originated reads/writes unless absolutely necessary. Prefer RLS with user-restricted policies, or isolate admin-only mutations via controlled RPCs.

### D) Rate Limiting and Cooldowns

Apply per-IP and per-wallet limits (choose conservative values first):

- `/api/cards/buy`: 10 requests/5 min per wallet, 60/min per IP (burst with sliding window).
- `/api/cards/process-prize`: 5 requests/min per wallet, and 1 active attempt per `cardId`.

Example (Next.js + Upstash):

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! });
const byWallet = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m') });

const key = `proc:${userWallet}`;
const { success } = await byWallet.limit(key);
if (!success) return 429;
```

Also add a short per-card cooldown key: `proc-card:${cardId}` with a 10–30s TTL.

### E) Validate and Sanitize Inputs

- `userWallet`: strict `0x`-prefixed 40-hex, checksum check optional.
- `cardId`: numeric bounds.
- `paymentTx`: strict `0x`-hash; enforce correct length.
- Enforce payload size limits (e.g., 10–50 KB) to reduce DoS risk.

### F) Reduce Blast Radius of the Admin Wallet

- Move payouts to a job queue (delayed worker) with single-flight semantics and daily/hourly budget caps.
- Use a dedicated payout hot wallet with limited balance; replenish periodically.
- Consider offloading to a claim-voucher model: server signs a voucher and users self-claim on-chain. Limits server hot-wallet exposure.

## Quick Checklist

- [ ] Unique index: one `paymentTx` → one mint
- [ ] Unique/index: one `cardId` → one reveal/payout
- [ ] Atomic claim update (`claimed=false` → `true`) before payout
- [ ] Require SIWE (or equivalent) and bind session to wallet
- [ ] Per-IP and per-wallet rate limits + per-card cooldowns
- [ ] Strict input validation and payload size limits
- [ ] Payout job queue, wallet limits, and monitoring/alerts

## Notes on Current Code

- `process-prize`: the early UPDATE marks `scratched=true` and the subsequent check `if (card.scratched)` will always be true for the returned row. Ensure the “already scratched” check is performed before updating, or remove the post-update check to avoid blocking the flow.
- `buy`: expand on-chain tx verification to also validate the sender `from` as the `userWallet` and reject mismatches.

Implement the DB constraints first—they immediately close replay classes of bugs. Then add idempotent claim logic and rate limiting. Move payouts behind a queue to shrink the hot-wallet risk surface.