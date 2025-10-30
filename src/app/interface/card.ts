import { Card as PrismaCard } from "@prisma/client";

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
  numbers_json: CardCell[];
  shared_to?: SharedUser | null;
  shared_from?: SharedUser | null;
};

// Re-export Prisma type for internal use
export type PrismaCardType = PrismaCard;
