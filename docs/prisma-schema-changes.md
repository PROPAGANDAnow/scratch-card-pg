# Prisma Schema Changes Documentation

## Overview
This document tracks the changes made to the Prisma schema over the last 3 commits, focusing on the evolution of the User and Card models and their relationships.

## Commit History

### 1. Commit 904eaa4 - "refactor: update user model with proper wallet-based identification"
**Date:** Nov 4, 2025 16:13:43

#### User Model Changes:
- **Before:**
  ```prisma
  model User {
    fid    Int      @id
    wallet String[]

    relations:
    - cards Card[]
    - notifications Notification[]

    @@map("users")
  }
  ```

- **After:**
  ```prisma
  model User {
    id         String   @id @default(cuid())
    address    String   @unique
    fid        Int
    created_at DateTime @default(now()) @db.Timestamp(6)

    relations:
    - cards Card[]

    @@map("wallets")
  }
  ```

#### Key Changes:
1. User identification changed from `fid` (int) to `address` (string) as primary identifier
2. Added `id` field with cuid() for internal referencing
3. Added `created_at` timestamp
4. Changed `wallet` from String[] to single `address` String
5. Renamed table from `users` to `wallets`
6. Removed relation from Notification model
7. Card relation changed from `user_fid` to `user_wallet` reference

### 2. Commit 6350eb6 - "fix: properly link shared_to and shared_from relationships with User model"
**Date:** Nov 4, 2025 18:36:08

#### Card Model Changes:
- **Before:**
  ```prisma
  model Card {
    // ... other fields
    shared_to   Json? // Object with fid, username, pfp, wallet
    shared_from Json? // Object with fid, username, pfp, wallet

    relations:
    - user User @relation(fields: [user_wallet], references: [address], onDelete: Cascade)
  }
  ```

- **After:**
  ```prisma
  model Card {
    // ... other fields
    shared_from_user_id String?
    shared_to_user_id   String?

    relations:
    - user        User  @relation(fields: [user_wallet], references: [address], onDelete: Cascade)
    - shared_from User? @relation("CardShares", fields: [shared_from_user_id], references: [id])
    - shared_to   User? @relation("CardReceived", fields: [shared_to_user_id], references: [id])
  }
  ```

#### User Model Changes:
- **Added relations:**
  ```prisma
  model User {
    // ... existing fields
    sharedCards   Card[] @relation("CardShares")
    receivedCards Card[] @relation("CardReceived")
  }
  ```

#### Key Changes:
1. Replaced JSON fields (`shared_to`, `shared_from`) with proper foreign key references
2. Added named relations for sharing functionality
3. Created proper many-to-one relationships between Cards and Users
4. Made sharing relationships optional

### 3. Commit 7d765db - "refactor: rename 'shared' nomenclature to 'gifted' in Prisma schema"
**Date:** Nov 4, 2025 18:45:56

#### User Model Changes:
- **Before:**
  ```prisma
  model User {
    // ... existing fields
    sharedCards   Card[] @relation("CardShares")
    receivedCards Card[] @relation("CardReceived")
  }
  ```

- **After:**
  ```prisma
  model User {
    // ... existing fields
    giftedCards    Card[] @relation("CardGifts")
    receivedCards  Card[] @relation("CardReceived")
    scratchedCards Card[] @relation("CardScratched")
    Card           Card[]
  }
  ```

#### Card Model Changes:
- **Before:**
  ```prisma
  model Card {
    // ... existing fields
    shared_from_user_id String?
    shared_to_user_id   String?

    relations:
    - shared_from User? @relation("CardShares", fields: [shared_from_user_id], references: [id])
    - shared_to   User? @relation("CardReceived", fields: [shared_to_user_id], references: [id])
  }
  ```

- **After:**
  ```prisma
  model Card {
    // ... existing fields
    scratched_by_user_id String?
    gifter_id            String?
    gifted_to_user_id    String?

    relations:
    - scratched_by User? @relation("CardScratched", fields: [scratched_by_user_id], references: [id])
    - gifter        User? @relation("CardGifts", fields: [gifter_id], references: [id])
    - gifted_to     User? @relation("CardReceived", fields: [gifted_to_user_id], references: [id])
    - User         User? @relation(fields: [userId], references: [id])
    - userId       String?
  }
  ```

#### Key Changes:
1. Renamed "shared" concept to "gifted" throughout the schema
2. `shared_from` → `gifter`
3. `shared_to` → `gifted_to`
4. `sharedCards` → `giftedCards`
5. Added `scratchedCards` relation and `scratched_by_user_id` field
6. Added generic `Card` relation and `userId` field for future use

## Summary of All Changes

### User Model Evolution:
1. **Primary Key:** Changed from `fid` (Int) to `id` (String cuid)
2. **Wallet Field:** Changed from `wallet` (String[]) to `address` (String, unique)
3. **Table Name:** Changed from `users` to `wallets`
4. **Relations:**
   - Added `giftedCards` (renamed from `sharedCards`)
   - Kept `receivedCards`
   - Added `scratchedCards`
   - Added generic `Card` relation

### Card Model Evolution:
1. **Removed Fields:**
   - `user_wallet` (String)
   - `user_fid` (Int)
   - `shared_to` (Json)
   - `shared_from` (Json)

2. **Added Fields:**
   - `scratched_by_user_id` (String?)
   - `gifter_id` (String?) (renamed from `shared_from_user_id`)
   - `gifted_to_user_id` (String?) (renamed from `shared_to_user_id`)
   - `userId` (String?)

3. **Relations Updated:**
   - Main user relation now references `address` instead of `fid`
   - Added proper foreign key relations for gifting/gifting functionality
   - Added scratching relation
   - All relations use User.id as reference

## Impact on Codebase

### Areas Needing Updates:
1. **Database Queries:** Any queries using old field names need updating
2. **Type Definitions:** TypeScript interfaces need to match new schema
3. **API Endpoints:** Routes that reference old field names
4. **Prisma Client Usage:** All Prisma operations need to use new field names
5. **Frontend Components:** Any code displaying or using old field names

### Migration Path:
1. Update all references from `shared_*` to `gifted_*` or `scratched_*`
2. Change user identification from `fid` to `address` for lookups
3. Update relations to use new field names
4. Handle the new `userId` field appropriately