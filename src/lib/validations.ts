import { z } from 'zod';

// Common validation schemas
export const WalletAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format');

export const FidSchema = z.number().int().positive('FID must be a positive integer');

export const UsernameSchema = z.string().min(1, 'Username cannot be empty').max(100, 'Username too long');

export const TokenIdSchema = z.coerce.number().int().positive('Token ID must be a positive integer');
export const TRANSACTION_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
export const TransactionHashSchema = z.string().regex(TRANSACTION_HASH_REGEX, 'Invalid transaction hash format');

export const UpdateCardClaimStatusSchema = z.object({
  claimed: z.boolean({ required_error: 'Claimed status is required' }),
  claimHash: TransactionHashSchema,
  claimedBy: WalletAddressSchema,
});

export const UpdateCardClaimStatusPayloadSchema = UpdateCardClaimStatusSchema.extend({
  tokenId: TokenIdSchema,
});

export const UpdateCardScratchStatusSchema = z.object({
  scratched: z.boolean({ required_error: 'Scratched status is required' }),
  scratchedBy: WalletAddressSchema,
  prizeWon: z.boolean().optional(),
});

export const UpdateCardScratchStatusPayloadSchema = UpdateCardScratchStatusSchema.extend({
  tokenId: TokenIdSchema,
});

// Card validation schemas
export const BuyCardSchema = z.object({
  tokenIds: z.array(TokenIdSchema).min(1, 'At least one token ID is required'),
  userWallet: WalletAddressSchema,
  friends: z.array(z.number()).optional(),
  contractAddress: WalletAddressSchema
});

export const GenerateClaimSignatureSchema = z.object({
  tokenId: TokenIdSchema,
  userWallet: WalletAddressSchema
});

// User validation schemas
export const CheckOrCreateUserSchema = z.object({
  userWallet: WalletAddressSchema,
  fid: FidSchema,
  username: UsernameSchema,
  pfp: z.string().url().optional()
});

export const BestFriendsQuerySchema = z.object({
  fid: FidSchema
});

// Notification validation schemas
export const SendNotificationSchema = z.object({
  fid: FidSchema,
  username: UsernameSchema,
  amount: z.number(),
  friend_fid: z.number().int().positive().optional(),
  bestFriends: z.array(z.object({
    fid: z.number().int().positive(),
    username: z.string().min(1),
    pfp: z.string().url().or(z.literal('')).optional(),
    wallet: WalletAddressSchema.or(z.literal('')).optional()
  })).optional()
});

export const WelcomeNotificationSchema = z.object({
  fid: FidSchema,
  notification_token: z.string().min(1, 'Notification token cannot be empty')
});

// Share validation schemas
export const ShareImageQuerySchema = z.object({
  prize: z.string().regex(/^\d*\.?\d+$/, 'Invalid prize amount'),
  username: UsernameSchema,
  friend_username: z.string().min(1).optional()
});

export const FrameShareQuerySchema = z.object({
  prize: z.string().regex(/^\d*\.?\d+$/, 'Invalid prize amount'),
  username: UsernameSchema,
  friend_username: z.string().min(1).optional()
});

// Token validation schemas
export const GetTokensSchema = z.object({
  userWallet: WalletAddressSchema,
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
  status: z.enum(['all', 'scratched', 'unscratched', 'claimed']).optional().default('all')
});

export const GetProofSchema = z.object({
  tokenId: TokenIdSchema,
  userWallet: WalletAddressSchema
});

export const ScratchTokenSchema = z.object({
  tokenId: TokenIdSchema,
  userWallet: WalletAddressSchema,
  timestamp: z.number().int().positive('Timestamp must be a positive integer')
});

export const BatchClaimSchema = z.object({
  tokenIds: z.array(TokenIdSchema).min(1, 'At least one token ID is required'),
  userWallet: WalletAddressSchema
});

export const GetLeaderboardSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
  timeframe: z.enum(['all', 'daily', 'weekly', 'monthly']).optional().default('all')
});

// Cron job validation (for internal use)
export const CronAuthSchema = z.object({
  authorization: z.string().regex(/^Bearer .+$/, 'Invalid authorization format')
});

// Utility function to validate and parse request
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodType<T>,
  options: { method?: 'GET' | 'POST' } = {}
): Promise<{ success: true; data: T } | { success: false; error: string; status: number }> {
  try {
    if (options.method === 'POST') {
      const body = await request.json();
      const validatedData = schema.parse(body);
      return { success: true, data: validatedData };
    } else {
      const url = new URL(request.url);
      const searchParams = Object.fromEntries(url.searchParams);
      const validatedData = schema.parse(searchParams);
      return { success: true, data: validatedData };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return {
        success: false,
        error: `Validation failed: ${errorMessages}`,
        status: 400
      };
    }
    return {
      success: false,
      error: 'Invalid request format',
      status: 400
    };
  }
}

// Utility function to validate cron authorization
export function validateCronAuth(request: Request): { success: true } | { success: false; error: string; status: number } {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      return {
        success: false,
        error: 'Server configuration error',
        status: 500
      };
    }

    if (authHeader !== expectedAuth) {
      return {
        success: false,
        error: 'Unauthorized',
        status: 401
      };
    }

    return { success: true };
  } catch (error) {
    console.error(error)
    return {
      success: false,
      error: 'Authorization validation failed',
      status: 500
    };
  }
}