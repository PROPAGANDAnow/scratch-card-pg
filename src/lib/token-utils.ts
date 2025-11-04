import { TokenWithState } from '~/hooks/useUserTokens';

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