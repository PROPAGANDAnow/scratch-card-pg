import { Card as PrismaCard } from "@prisma/client";

export interface Card {
  id: string;
  user_wallet: string;
  payment_tx: string;
  prize_amount: number;
  scratched_at?: Date | null;
  prize_asset_contract: string;
  numbers_json: CardCell[] | any; // Allow any for Prisma compatibility
  claimed: boolean;
  payout_tx?: string | null;
  created_at: Date;
  scratched: boolean;
  prize_won: boolean;
  token_id: number;
  contract_address: string;
  shared_to?: any; // JsonValue from Prisma
  shared_from?: any; // JsonValue from Prisma
}

export interface CardCell {
  amount: number;
  asset_contract: string;
  friend_fid?: number;
  friend_username?: string;
  friend_pfp?: string;
  friend_wallet?: string;
}

// Re-export Prisma type for internal use
export type PrismaCardType = PrismaCard;
