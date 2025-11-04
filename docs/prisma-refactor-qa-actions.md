# Prisma Refactor Q/A/Action Mapping

Source questions: docs/prisma-refactor-questionnaire.md
Source answers: transcript appended under “answer:” in the same file

Note: Where no clear answer was provided in the transcript, the item is marked Needs decision with targeted follow-ups.

---

## 1) Global Rules and Constraints

1.1 Question: Canonical user identity (User.id vs User.address), FID optionality, address normalization policy
- Answer (from transcript): Use User.id when available (backend resolves); if only address is present on client, use address and backend links it. FID is optional long-term. Prefer checksum for addresses; no preference for lowercase storage.
- Action:
  - Adopt rule: Backend resolves User.id by address when available; fallback to address for lookups; do not require FID.
  - Decide and document exact normalization: store lowercased in DB, compare lowercased, display EIP-55 checksum. Implement helpers and lint checks.

1.2 Question: Card ownership and relations; canonical owner field; delete behavior
- Answer: Every card should have a minter_id (at mint). Card ownership is validated on-chain (via Alchemy). Keep minted_by, gifted_to, scratched_by; do not cascade-delete cards on user deletion; avoid storing owner as authoritative in DB.
- Action:
  - Schema: Ensure minter_id exists (FK to User.id) and keep gifted_to_user_id, scratched_by_user_id; drop or keep userId only if needed for convenience but not authoritative.
  - Code: Replace ownership checks with on-chain verification service; add Alchemy integration and cache if needed.
  - Delete behavior: Set onDelete: SetNull for relations; no cascading deletes.

1.3 Question: Terminology confirmation and model/table mapping
- Answer: Standardize on gifted (not shared). Use snake_case (or kebab) at database level; avoid camelCase. Keep terminology consistent.
- Action:
  - Schema: Rename fields to snake_case via @map (e.g., gifter_id, gifted_to_user_id, scratched_by_user_id, minter_id). Keep Prisma model names consistent; ensure @@map("wallets") remains for User.
  - Migration: Generate migration to rename columns; update all code references. Add ESLint rule/docs note about naming.

1.4 Question: Backward compatibility & phased rollout
- Answer: No backward compatibility layer.
- Action:
  - Remove legacy shared_* and user_wallet handling; delete shims; update endpoints and types accordingly.

1.5 Question: Indexing and performance
- Answer: Defer for now.
- Action:
  - Create follow-up ticket to benchmark and add indexes after refactor stabilizes.

1.6 Question: Security and validation (runtime checks per endpoint; error shape and toasts)
- Answer: Implicitly rely on on-chain ownership checks; transcript incomplete beyond that.
- Action (Needs decision):
  - Define standard error shape { code, message, details? } and toast copy.
  - Specify per-endpoint authorization rules when on-chain owner ≠ minter/gifter/gifted_to (see Section 3 actions).

---

## 2) Data Migration Plan

2.1 Question: Users migration from wallet arrays; de-dup rules
- Answer: Not provided.
- Action (Needs decision): Provide dedup strategy and canonical address selection rules per FID.

2.2 Question: Populate owner field on Card; handling unresolvable owners
- Answer: Do not store authoritative owner; keep minter/gifted_to; verify on-chain.
- Action:
  - Backfill minter_id where resolvable; leave owner unset/removed. For unresolved, leave null; do not delete.

2.3 Question: Convert shared_* to gifted_*/scratched_*; backup
- Answer: Use gifted terminology only.
- Action:
  - Migrate shared_* to gifted_* and scratched_*; do not keep JSON backups unless required by compliance (assume no).

2.4 Question: Notifications/user_fid vs userId
- Answer: FID optional; no explicit direction.
- Action (Needs decision): Choose whether notifications key off fid or userId; define enrichment path.

2.5 Question: Dry run and verification checks
- Answer: Not provided.
- Action (Needs decision): Define integrity checks (counts per user, wins sum, totals) and acceptance thresholds.

---

## 3) API Contract Updates (grouped)

3.1 Users
- Question: POST /api/users/check-or-create; GET /api/users/best-friends?fid
- Answer: Backend links address→id; FID optional.
- Action:
  - check-or-create accepts address (required), fid (optional). If fid later provided and missing, set it; otherwise do not overwrite.
  - Keep best-friends by fid for now; consider address variant later if needed.

3.2 Cards
- Question: buy, batch-check, process-prize
- Answer: Buyer identified by address; minter_id set at creation; gifting separate; ownership validated on-chain.
- Action:
  - buy: require buyer address; set minter_id; no owner assertion beyond mint.
  - batch-check: query by tokenIds; do not expose legacy fields.
  - process-prize: verify on-chain owner; define behavior if gifted_to differs from current on-chain owner (Needs decision: payout rules).

3.3 Tokens
- Question: Replace user_wallet with owner relation across token routes
- Answer: Do not rely on stored owner; verify on-chain.
- Action:
  - Update routes to remove user_wallet; use tokenId + chain lookup; enrich with minter/gifted_to when needed for UI only.

3.4 Claims
- Question: EIP-712 fields and identifier
- Answer: Not provided.
- Action (Needs decision): Define message schema and whether to embed address or userId.

3.5 Leaderboard
- Question: Query via owner relation; users without fid
- Answer: Use address-based or minter-based? Not explicitly provided.
- Action (Needs decision): Specify leaderboard attribution (minter, current on-chain owner, or scratched_by) and behavior for users without fid.

3.6 Cron (pro-users-free-cards)
- Question: Criteria post is_pro removal; ownership assignment
- Answer: Free cards exist without friends; assign by address/minter; no friends context.
- Action:
  - Select all wallets per batch; create card with minter_id = user.id; do not set gifted_to; no is_pro filter.

3.7 Neynar notifications
- Question: fid vs userId/address
- Answer: FID optional; no explicit final choice.
- Action (Needs decision): Keep fid-centric for social; document join strategy for wallet enrichment.

---

## 4) Frontend & Types

4.1 Local storage key
- Question: Replace user_wallet
- Answer: Use address on client.
- Action:
  - Migrate: read user_wallet once; rewrite to address; then stop writing user_wallet.

4.2 Types (Card, User, Notification)
- Answer: Use gifted terminology; include minter_id, gifted_to_user_id, scratched_by_user_id.
- Action:
  - Update interfaces to remove shared_* and user_wallet; add snake_case fields aligned with schema @map; mark FID optional.

4.3 State and hooks
- Answer: Ownership filters should be address-based; fid for social features only.
- Action:
  - Refactor hooks/selectors to use address for ownership; restrict fid usage to social.

4.4 UI copy
- Answer: Use “gifted” terminology.
- Action:
  - Replace “shared” with “gifted” across UI strings.

---

## 5) Business Logic Clarifications

5.1 Ownership vs gifter/gifted
- Answer: Minter at creation; gifting does not make DB owner authoritative; on-chain owner is source of truth.
- Action (Needs decision): Specify whether gift implies on-chain transfer requirement or is off-chain social-only.

5.2 Scratching
- Answer: Keep scratched_by field.
- Action (Needs decision): Define who can scratch (minter, gifted_to, current on-chain owner) and whether first scratch locks further actions.

5.3 Prize distribution
- Answer: Not explicitly defined.
- Action (Needs decision): Define payout recipient rules (on-chain owner vs gifted_to vs split).

5.4 Level progression and stats
- Answer: Not explicitly defined.
- Action (Needs decision): Define whose stats update on scratch/win.

---

## 6) Error Handling & Messaging
- Answer: Not fully specified.
- Action (Needs decision): Adopt standard error shape; provide canonical messages for address, fid, tokenId; define toast texts for ownership mismatch, already scratched, not found.

---

## 7) Testing & Observability
- Answer: Not provided.
- Action (Needs decision): List manual test cases and logs/metrics to capture.

---

## 8) File-Specific Clarifications (batched)

8.A Replace user_wallet with on-chain ownership checks and minter relation
- Answer: Yes, move away from stored owner; keep minter; verify on-chain.
- Action:
  - Update: src/app/api/leaderboard/route.ts, src/app/api/tokens/route.ts, src/app/api/tokens/[tokenId]/proof/route.ts, src/app/api/tokens/[tokenId]/scratch/route.ts, src/app/interface/api.ts, src/lib/userapis.ts, src/lib/auth-utils.ts, components referencing user_wallet.

8.B Replace shared_* with gifted_*/scratched_*
- Answer: Yes, UI uses gifted terminology; keep scratched_by.
- Action:
  - Rename in interfaces and UI; surface gifted_to and optional gifter where needed; keep server-only relations if not displayed.

8.C Fid usage in APIs/notifications
- Answer: FID optional; no final policy.
- Action (Needs decision): Confirm whether fid remains the key for social endpoints and how to enrich with wallet.

8.D Cron free cards criteria
- Answer: No friends context; assign to minter only.
- Action:
  - Implement cron to iterate all users; create cards with minter_id; no friends.

8.E Types cleanup
- Answer: Use snake_case fields; remove shared_*.
- Action:
  - Update src/app/interface/card.ts, api.ts, notification.ts to final field sets.

---

## 9) Deliverables Checklist
- Action: Proceed in this order once decisions above are finalized:
  1) Finalize schema and naming (snake_case via @map), relations, and delete behaviors
  2) Create migrations and backfill minter_id/gifted_to/scratched_by
  3) Implement on-chain ownership verifier service and replace API checks
  4) Refactor APIs (users, cards, tokens, claims, leaderboard, cron, neynar)
  5) Update types, hooks, UI copy; migrate localStorage key
  6) Define errors and toasts; wire validations
  7) Draft test plan and enable targeted logs/metrics

---

## 10) Open Questions to Finalize (Needs decision)
- Exact address normalization/storage policy
- Whether to keep any owner field in DB for convenience (non-authoritative) and its name
- Payout rules on gifted + scratch scenarios
- Notifications key (fid vs userId) and enrichment path
- Claims message schema (EIP-712) identifier choice
- Leaderboard attribution (minter vs on-chain owner vs scratched_by)
- Dedup/merge strategy for historical users and cards
