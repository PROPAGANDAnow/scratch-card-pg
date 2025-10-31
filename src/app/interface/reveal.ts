import { Card } from "./card";

// Activity data is Card objects with user data flattened
export interface Reveal extends Card {
  // User properties flattened
  fid?: number;
  username?: string;
  pfp?: string;
  updated_at?: Date; // For time ago formatting
}