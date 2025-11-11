import { TokenWithState } from '~/hooks/useUserTokens';
import type { CardCell } from '~/app/interface/cardCell';
import type { BestFriend } from '~/app/interface/bestFriends';

// Derive unclaimed token IDs (number[]) from tokens
// Reference: docs/guides/FRONTEND_SUBGRAPH_INTEGRATION.md
export function extractUnclaimedTokenIds(cards: TokenWithState[] = []): number[] {
  return cards
    .map((token) => {
      const tokenIdStr = token.metadata?.metadata?.tokenId;
      if (!tokenIdStr || tokenIdStr === "") return null;
      const idAsNumber = Number(tokenIdStr);
      return Number.isFinite(idAsNumber) ? idAsNumber : null;
    })
    .filter((n): n is number => n !== null);
}

// Filter tokens to get only unclaimed/available cards
export function filterAvailableCards(tokens: TokenWithState[] = []): TokenWithState[] {
  return tokens.filter(token => !token.metadata?.metadata?.scratched && !token.state.claimed);
}

// Extract token ID as number from a TokenWithState object
export function getTokenIdAsNumber(token: TokenWithState): number | null {
  const tokenIdStr = token.metadata?.metadata?.tokenId;
  if (!tokenIdStr || tokenIdStr === "") return null;
  const idAsNumber = Number(tokenIdStr);
  return Number.isFinite(idAsNumber) ? idAsNumber : null;
}

// Extract token ID from the composite ID string
export function extractTokenIdFromId(token: TokenWithState): string | null {
  // ID format is "contractAddress-tokenId", extract the tokenId part
  const parts = token.id?.split('-');
  return parts && parts.length > 1 ? parts[1] : null;
}

// Detect the friend-win row (amount === -1 and same friend across the row)
function findFriendWinningRow(numbers: CardCell[] = []): CardCell[] | null {
  if (!Array.isArray(numbers) || numbers.length < 12) return null;
  for (let r = 0; r < 4; r++) {
    const row = numbers.slice(r * 3, r * 3 + 3);

    const allMatch =
      row.length === 3 &&
      row.every((c) => !!c?.friend_fid && c.friend_fid === row[0].friend_fid);
    if (allMatch) return row;
  }
  return null;
}

// Extract the bonus recipient wallet from numbers_json (free-card scenario)
export function extractBonusRecipientWalletFromNumbers(numbers: CardCell[] = []): string | null {
  const winningRow = findFriendWinningRow(numbers);
  if (winningRow && winningRow[0]?.friend_wallet) return winningRow[0].friend_wallet;

  // Fallback: any friend cell present
  const anyFriend = numbers.find((c) => !!c.friend_wallet && !!c.friend_fid);
  return anyFriend?.friend_wallet || null;
}

// Extract full BestFriend details if available
export function extractBonusFriendFromNumbers(numbers: CardCell[] = []): BestFriend | null {
  const winningRow = findFriendWinningRow(numbers);
  const cell = winningRow?.[0];
  if (!cell || !cell.friend_wallet) return null;

  return {
    fid: Number(cell.friend_fid || 0),
    username: cell.friend_username || '',
    pfp: cell.friend_pfp || '',
    wallet: cell.friend_wallet,
  };
}
