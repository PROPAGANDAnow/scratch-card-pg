import { Card } from "@prisma/client";

// export interface Card {
//   id: string;
//   user_wallet: string;
//   payment_tx: string;
//   prize_amount: number;
//   scratched_at?: string;
//   prize_asset_contract: string;
//   numbers_json: CardCell[];
//   claimed: boolean;
//   payout_tx?: string;
//   created_at: string;
//   scratched: boolean;
//   prize_won?: boolean;
//   card_no: number;
//   shared_to: {
//     fid: string;
//     username: string;
//     pfp: string;
//     wallet: string;
//   } | null;
//   shared_from: {
//     fid: string;
//     username: string;
//     pfp: string;
//     wallet: string;
//   } | null;
// }

export type Card = Card
