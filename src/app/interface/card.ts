import { Card as PrismaCard, Prisma } from "@prisma/client";

export interface SharedUser {
  fid: string;
  username: string;
  pfp: string;
  wallet: string;
}

export interface CardCell {
  amount: number;
  asset_contract: string;
  friend_fid?: number;
  friend_username?: string;
  friend_pfp?: string;
  friend_wallet?: string;
}

// Type for Card with properly typed JSON fields
export type Card = Omit<PrismaCard, 'numbers_json' | 'shared_to' | 'shared_from'> & {
  numbers_json: Prisma.JsonValue;
  shared_to?: SharedUser | null | Prisma.JsonValue;
  shared_from?: SharedUser | null | Prisma.JsonValue;
};

// Re-export Prisma type for internal use
export type PrismaCardType = PrismaCard;
