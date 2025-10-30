// Activity data is Card objects with user data flattened
export interface Reveal {
  id: string;
  user_wallet: string;
  payment_tx: string;
  prize_amount: number;
  scratched_at?: Date | null;
  prize_asset_contract: string;
  numbers_json: any;
  claimed: boolean;
  payout_tx?: string | null;
  created_at: Date;
  scratched: boolean;
  prize_won: boolean;
  token_id: number;
  contract_address: string;
  shared_to?: any;
  shared_from?: any;
  // User properties flattened
  fid?: number;
  username?: string;
  pfp?: string;
  updated_at?: Date; // For time ago formatting
}