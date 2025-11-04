# API Documentation

## Overview
This document describes all the API endpoints for the Scratch Card application. All endpoints use JSON for request/response format and include proper validation with Zod schemas.

## Base URL
```
https://your-domain.com/api
```

## Authentication
Most endpoints require authentication via NextAuth session. The user must be logged in to access protected endpoints.

## Response Format
All responses follow this standard format:
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

---

## Tokens API

### GET /api/tokens
Fetch tokens for a user with pagination and filtering.

**Query Parameters:**
- `userWallet` (string, required): User's wallet address
- `limit` (number, optional, default: 20): Number of tokens to return (max 100)
- `offset` (number, optional, default: 0): Number of tokens to skip
- `status` (string, optional, default: 'all'): Filter by status ('all', 'scratched', 'unscratched', 'claimed')

**Response:**
```typescript
{
  success: true,
  data: {
    tokens: TokenData[],
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  }
}
```

### GET /api/tokens/[tokenId]/proof
Get proof of ownership for a token (only accessible by token owner).

**Path Parameters:**
- `tokenId` (number): Token ID

**Query Parameters:**
- `userWallet` (string, required): User's wallet address

**Response:**
```typescript
{
  success: true,
  data: {
    tokenId: number,
    proof: string,
    owner: string,
    isValid: boolean,
    expiresAt?: number
  }
}
```

### POST /api/tokens/[tokenId]/scratch
Submit scratched timestamp for a token. This is triggered passively when the success UI is shown.

**Path Parameters:**
- `tokenId` (number): Token ID

**Request Body:**
```typescript
{
  tokenId: number,
  userWallet: string,
  timestamp: number
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    tokenId: number,
    scratched: boolean,
    prizeAmount: number,
    scratchedAt: Date,
    revealed: {
      amount: number,
      asset: string
    }[]
  },
  message: "Congratulations! You won X USDC!"
}
```

---

## Claims API

### POST /api/claims/batch
Batch claim for multiple scratched tokens. Should be triggered after tokens are revealed.

**Request Body:**
```typescript
{
  tokenIds: number[],
  userWallet: string
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    successful: number[],
    failed: {
      tokenId: number,
      error: string
    }[],
    totalPrize: number,
    signatures: {
      tokenId: number,
      signature: string,
      prizeAmount: number,
      tokenAddress: string,
      deadline: number
    }[]
  }
}
```

### POST /api/cards/generate-claim-signature
Generate signature for a single token claim (legacy endpoint, use batch claim for multiple tokens).

**Request Body:**
```typescript
{
  tokenId: number,
  userWallet: string
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    prizeAmount: string,
    tokenAddress: string,
    deadline: string,
    signature: string
  }
}
```

---

## Leaderboard API

### GET /api/leaderboard
Fetch leaderboard data with scratched token filtering.

**Query Parameters:**
- `limit` (number, optional, default: 50): Number of entries to return (max 100)
- `offset` (number, optional, default: 0): Number of entries to skip
- `timeframe` (string, optional, default: 'all'): Timeframe filter ('all', 'daily', 'weekly', 'monthly')

**Response:**
```typescript
{
  success: true,
  data: {
    entries: {
      rank: number,
      wallet: string,
      fid: number,
      username: string,
      pfp: string,
      totalWon: number,
      totalScratched: number,
      totalWins: number,
      winRate: number,
      biggestWin: number,
      lastActive: Date,
      level: number
    }[],
    totalEntries: number,
    timeframe: 'all' | 'daily' | 'weekly' | 'monthly',
    lastUpdated: Date
  }
}
```

---

## Cards API

### GET /api/cards/[tokenId]
Retrieve specific card by token ID.

**Path Parameters:**
- `tokenId` (number): Token ID

**Response:** Card data including user wallet, prize amount, numbers JSON, scratched status

### POST /api/cards/buy
Buy/create multiple cards.

**Request Body:**
```typescript
{
  tokenIds: number[],
  userWallet: string,
  friends?: {
    fid: number,
    username: string,
    pfp: string,
    wallet: string
  }[]
}
```

### GET /api/cards/get-by-owner
Get all cards owned by a user. Integrates with Alchemy NFT API.

**Query Parameters:**
- `userWallet` (string): User's wallet address

### GET /api/cards/batch-check
Check if multiple cards exist (currently placeholder).

---

## Users API

### POST /api/users/check-or-create
Check if user exists, create if not. Integrates with Neynar API.

**Request Body:**
```typescript
{
  userWallet: string,
  fid: number,
  username: string,
  pfp?: string
}
```

### GET /api/users/best-friends
Get user's best friends from Farcaster.

**Query Parameters:**
- `fid` (number): User's Farcaster ID

---

## Share API

### GET /api/share-image
Generate shareable OG image for winning cards.

**Query Parameters:**
- `prize` (string): Prize amount
- `username` (string): Winner's username
- `friend_username` (string, optional): Friend's username for shared wins

### GET /api/frame-share
Generate Farcaster frame HTML for sharing wins.

**Query Parameters:**
- `prize` (string): Prize amount
- `username` (string): Winner's username
- `friend_username` (string, optional): Friend's username

---

## Notifications API

### POST /api/neynar/send-notification
Send win notifications via Neynar.

**Request Body:**
```typescript
{
  fid: number,
  username: string,
  amount: number,
  friend_fid?: number,
  bestFriends?: {
    fid: number,
    username: string,
    pfp: string,
    wallet: string
  }[]
}
```

### POST /api/neynar/welcome-notification
Send welcome notification to new users.

**Request Body:**
```typescript
{
  fid: number,
  notification_token: string
}
```

---

## Cron Jobs

### GET /api/cron/pro-users-free-cards
Daily free cards for pro users (requires bearer token authentication).

**Headers:**
- `Authorization: Bearer <CRON_SECRET>`

---

## Error Codes

- `400`: Bad Request - Validation errors or missing required fields
- `401`: Unauthorized - No valid session or incorrect credentials
- `403`: Forbidden - User doesn't own the resource
- `404`: Not Found - Resource doesn't exist
- `500`: Internal Server Error - Server-side errors

## Rate Limiting
Currently no rate limiting is implemented, but it's recommended for production.

## Security Notes

1. All wallet addresses are validated and normalized to lowercase
2. Token ownership is verified for protected operations
3. All inputs are validated using Zod schemas
4. QuickAuth is used to ensure only token owners can access proofs
5. Prizes are only claimable after tokens are scratched
6. Signatures expire after 1 hour for security

## SDK Integration

For frontend integration, use the TypeScript interfaces defined in `/src/app/interface/api.ts` for type safety.