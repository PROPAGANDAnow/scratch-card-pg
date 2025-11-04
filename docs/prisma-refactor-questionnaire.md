# Prisma Refactor Questionnaire (User/Card: address/id, gifting, scratching)

Purpose: Collect all decisions and context needed to complete the refactor documented in docs/prisma-schema-changes.md with minimal back-and-forth. Please answer succinctly. Batch answers when a rule applies across multiple items.

How to answer:
- If a rule applies globally, state it once under “Global Rules”.
- For per-endpoint/per-component items, answer in grouped bullets.
- If something is undecided, pick a preferred direction and note constraints.

---

## 1) Global Rules and Constraints
1. Canonical user identity
   - Should all ownership lookups pivot on User.id (cuid) or User.address? If both, define precedence and when.
   - Is User.fid optional, and can it be null long-term? What are the flows to populate it when missing?
   - Address normalization rule: lowercased, EIP-55 checksum, or stored-as-lowercase + checksum at display? Define exact policy for storage and comparisons.
2. Card ownership and relations
   - What is the canonical “owner” relation on Card? Choose ONE:
     - A) userId (nullable today) becomes owner_id (non-nullable) and defines ownership
     - B) Keep userId nullable; ownership is inferred elsewhere (specify)
     - C) Different field name (specify) with non-null constraint
   - On delete of User: cascade delete Cards, or set null on card’s owner? Define for gifter/gifted_to/scratched_by as well.
3. Terminology confirmation
   - We are standardizing on gifted (not shared). Confirm final field/rel names:
     - Card.gifter_id, Card.gifted_to_user_id, Card.scratched_by_user_id, Card.userId (or owner_id if you choose to rename)
   - Confirm model/table mapping: Prisma model User maps to table wallets via @@map("wallets"). Keep this mapping?
4. Backward compatibility & phased rollout
   - Do we need to support any legacy clients expecting shared_* or user_wallet for a period? If yes, how long and what API shims are acceptable?
5. Indexing and performance
   - Which indexes are required beyond Prisma defaults? E.g., on Card.userId/owner_id, gifter_id, gifted_to_user_id, scratched_by_user_id, created_at, prize fields.
6. Security and validation
   - Required runtime checks for any API mutating cards: verify caller’s wallet matches the card owner? Define exact rule per endpoint.
   - Error format and user messaging: confirm standard error shape and toast messages.

---

## 2) Data Migration Plan
1. Users
   - Migration of prior users with wallet arrays → single address: how to choose the canonical address when multiple existed? De-duplication rules across same fid with multiple addresses?
   - If two rows map to same address after normalization, which survives? Merge rules for stats/ownership/history.
2. Cards
   - Populate the canonical owner field on Card (userId/owner_id) from prior user_wallet/user_fid where possible? Define mapping rules and fallbacks.
   - For cards missing resolvable owner, what to do (set null, archive, or delete)?
3. Gifts/Scratches
   - Convert shared_* JSON or FKs to new gifted_* and scratched_by_* fields: any legacy values to keep in a backup column?
4. Notifications and activity
   - Notification.user_fid currently exists in code. Keep fid-based notifications, or migrate to userId? If keeping fid, define how to resolve userId when needed.
5. Dry run and verification
   - What integrity checks must pass post-migration (counts per user, card totals, wins sum)? Define acceptance thresholds.

---

## 3) API Contract Updates (grouped)
For each endpoint group below, specify:
- Auth source (session, signed message, header) and required claims
- Identifier used (address vs fid vs id) and lookups
- Ownership rule and validations
- Response contract changes (new/removed fields)

1. Users
   - POST /api/users/check-or-create: Inputs (address, fid) final shape? Behavior when fid missing? Should we update fid if it changes later?
   - GET /api/users/best-friends?fid=: Keep fid as query param? Any address-based variant needed?
2. Cards
   - POST /api/cards/buy: What identifies the buyer? Populate owner on created cards? Any gift-at-creation flow?
   - GET /api/cards/batch-check: Query by which key? How to scope to caller?
   - POST /api/cards/process-prize: Ownership check details; who can claim a prize if card was gifted?
3. Tokens
   - GET/POST /api/tokens/* (including /scratch, /proof, /route.ts root): Replace user_wallet with owner relation. Define exact payload/response adjustments.
4. Claims
   - POST /api/claims/*: Final EIP-712 or message schema fields; which user identifier is embedded (address vs id)?
5. Leaderboard
   - GET /api/leaderboard: Query users via owner relation; tie-breakers; how to handle users without fid.
6. Cron
   - GET /api/cron/pro-users-free-cards: Who qualifies as “pro” post-removal of is_pro? New selection criteria? How are free cards owned/assigned?
7. Neynar notifications
   - POST /api/neynar/*: Continue fid-centric or move to userId/address? If fid-centric, define join strategy when enriching with wallet.

---

## 4) Frontend & Types
1. Local storage and client identity
   - Replace localStorage key user_wallet with address? Any migration strategy to read old key once and rewrite?
2. Types
   - Update src/app/interface/*.ts and types for Card, User, Notification. Provide final field sets for each.
   - Should Card interface omit legacy fields and add ownerId (or userId) plus gifted/scratched fields as optional?
3. State and hooks
   - Stores/selectors that filter by wallet/fid: standardize on address for ownership; fid only for social features. Confirm.
4. UI copy
   - Any wording changes in UI around “shared” → “gifted”. Provide final copy style.

---

## 5) Business Logic Clarifications
1. Ownership vs gifter/gifted
   - After a gift, who is the owner? Does ownership transfer to gifted_to immediately, or is it a separate action?
   - Can gifter scratch after gifting? Define allowed actions by role (owner/gifter/gifted_to).
2. Scratching
   - Who can scratch a card? First scratch locks to scratched_by? Does scratched_by imply ownership change?
3. Prize distribution
   - If gifted, who receives payout (owner, gifter, gifted_to, split)? Any special rules for friend wins/free cards?
4. Level progression and stats
   - Which user’s stats are incremented on scratch/win when gifting is involved?

---

## 6) Error Handling & Messaging
- Standard error shape for APIs (code, message, details)?
- Validation errors per field (address, fid, tokenId). Provide canonical messages.
- Frontend toast texts for common failures (ownership mismatch, already scratched, not found).

---

## 7) Testing & Observability
- Minimal test plan (manual/automated) required to accept the refactor: list key user journeys to verify.
- Logs/metrics to add or keep (successful gifts, scratch events, ownership mismatches).

---

## 8) File-Specific Clarifications (batched)
Provide decisions for the patterns below; we’ll apply them to all listed files consistently.

A) Replace user_wallet with owner relation (userId/owner_id) and address lookups
- Files (ownership/leaderboard/tokens):
  - src/app/api/leaderboard/route.ts
  - src/app/api/tokens/route.ts
  - src/app/api/tokens/[tokenId]/proof/route.ts
  - src/app/api/tokens/[tokenId]/scratch/route.ts
  - src/app/interface/api.ts (types)
  - src/lib/userapis.ts, src/lib/auth-utils.ts
  - components referencing user_wallet notes: src/components/scratch-off.tsx, src/components/nft-scratch-off.tsx
- Answer: Which field becomes canonical owner, and exact Prisma include/select we should use across all of the above? Any additional security checks?

B) Replace shared_* with gifted_*/scratched_* relations
- Files with comments/TODOs: components (scratch-off, nft-scratch-off), interfaces (card.ts), bulk scripts.
- Answer: Confirm final relation names and whether UI surfaces gifter/gifted_to/scratched_by. If not surfaced, which fields should remain only server-side?

C) Fid usage in APIs and notifications
- Files: src/app/api/neynar/*, src/app/api/users/check-or-create/route.ts, src/app/interface/notification.ts
- Answer: Keep fid as primary key for social-only features? When enriching with wallet, what’s the lookup path (fid → User.id → address)?

D) Cron free cards criteria
- File: src/app/api/cron/pro-users-free-cards/route.ts
- Answer: Define selection criteria and ownership assignment for created cards; confirm no friends context for these cards.

E) Types cleanup
- Files: src/app/interface/card.ts (currently Omit<... 'shared_*'>), src/app/interface/api.ts, notification.ts
- Answer: Provide final type signatures for Card, User, Notification to reflect new schema.

---

## 9) Deliverables Checklist (we will execute after your answers)
- Prisma schema finalization (field names, relations, indexes, cascade rules)
- Migrations and data backfill scripts
- API refactors per group above
- Types and stores update
- Frontend components and copy updates
- Validation and error messaging alignment
- Manual test plan execution and sign-off

---

## 10) Anything Else
- Known edge cases or data quirks we should accommodate
- Rollback plan requirements if migration needs to be reversed


answer:

Should all ownership lookups pivot to user.id or user.address if both define precedence when? I think I've changed it in the schema Prisma to mentor instead of user, and it should look like this: when ID is present, go for ID, but if the address is present, go for address. I think you have to fetch the ID from the database, so if it's present in that function, then go for that. Else, if it's like a front-end thing and you are just getting a test current user address, go for that. Let the backend handle getting the user ID and linking it. I think ownership lookup should be linked to addresses for sure. Is user FID optional? Can be null in the long term. Yeah, we don't want to be very dependent on user.FID at this normalization rule. It should be according to the checksum. I don't have any preference on storing it like in lowercase. Card ownership and relationship the canonical owner relationship on card choose one. Every card should have a minter ID, so when it's minted, that's what it is, and then he can gift to someone else, and the owner you So the card does not get owned by anyone right I don't think we should think about like the cascading deletions for anything everything is happening on chain and we are just creating a better more performant copy rather than doing it all on chain right so there is minted by there is gifted to and then there is scratched by right if you want to check like ownership will check on on chain using alchemy api uh if there's any thing any rule regarding like deletion of user should delete the card I don't want that right we are standardizing on gifted not shared confirm final yeah only using gifted card for gift and I think I want like on this term logic confirmation on the the database level I want everything to be snake case or kebab case but not camel case at all right so fix that everywhere backward compatibility don't think about backward compatibility indexing performance I think leave that for now a security and validation leave that for now as well data migration users migration of prior users with wallet arrays single address don't think about the old ones how to choose canonical address when multiple existed deduplication rules of FID with multiple addresses there would be FID with multiple addresses I think we should add a thing called is forecast of primary and use that as default right other Kuiya say uh bowl right hand kiss and it to FID 479 and since now I have multiple addresses which address should I send it to far faster primary no yeah we'll use for faster primary as the default we can get that value like which wallet is far faster primary using from the Nana API as well so let's just use that cards populate the canonical owner from the card using prior so if you want to populate the owner of the card we won't use our database as a source of truth we would use alchemy API for that so that question answers that question give scratches converts shared after scratch by fields yeah we need to convert them everywhere don't need to have any backup column notification and activity user FID notification FID notifications to a FID based econ a bring it right when we are storing notifications. So API contracts update hot source identifier I think we should make address as the identifier for everything let's leave the auth thing for later I'll look into it personally response contract change and go for the new fields remove the old ones like reference prisma dot schema for everything check or create API use address for that behavior yeah we again like we don't want to be FID dependent as much as we can for best friends let's use a FID for now we migrate to address in future or by what identifies the buyer probably creation flow in the gifts are created at this stage there is already a function that defines if need like that is there or not according to the great but yeah for in API cards bad check query by which key I don't understand process price ownership check details who can claim price if the card was gifted the current owner of the card and FTE should be able to claim the price replace user wallet with owner relation go ahead do that define exactly load and response exam I'm not sure you can use a wallet for owner relation but this is the admin signature that we need and also make sure nothing just this is the this is that right on scratch only update the database that on that time stamp it is scratched by this user and at this time stamp on prove is like a get of the signature which you don't want to show otherwise and I'm not sure what just like they'll get list API it should work like by default our query users right on a relation and this one should like ignore the users that don't have FID in the leaderboard Cron who qualifies as a pro remove this pro criteria for now you don't need it then our notification would always be FID centric for front end and types local storage I am NOT sure where is it look but I think we can keep it as it is update interface yeah should be removed .Yeah, we should remove ownerID, userId, and old fields state and hooks in the filter by wallet or FID if it is only for social be features. Confirm, yes, it is only for that. For everything else, your wallet UI copy is fine. If there is any don't change the UI copy from shared to gifted. Keep it as it is. We will change it later on after the gift is gifted. Who is the owner? The wallet who it is gifted to, but again we don't check the ownership by the database, it's via the Alchemy API NFT API. Right? Can the gifter scratch after gifting? No, they cannot. I think we can check why an RPC call is made if the thing that is getting scratched is done by the owner of that NFT. Like a bullet check that we check with Nana's profile API and get the wallet from there, and if there's a match, then allow, else who can scratch upon its class but does not imply ownership. Changed the already owner is the person who can scratch, right? If gifted, who received a payout, the current owner which we are getting from the Alchemy error handling. I think you just file specific clarification:
- Replace user wallet with corner relation
- Add this lookup
- I think keep wallet as the primary except for leaderboard and leaderboard should be FID-based
- This is for A to B replace you can serve the gift are gifted to gifted vibe
- Don't change the UI copy for anything
- This is only for backend and server-side how we are handling and sending the data
- We are handling data don't need to change anything on the UI copy side or add any components
- This was for a be HC if I do use it in F API notification for user check or create we pass both
- We pass wallet for sure but if ID is optional
- All the notification based things FID is primary that is essential for cron cards criteria
- I don't have an answer for that right now
- Ignore leave to do note there if you want signatures for card use and notification just go with the new prisma.refactor.questionnaire.md