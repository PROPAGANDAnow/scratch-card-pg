import { Token } from '~/hooks/useUserTokens'

// Derive unclaimed token IDs (number[]) from tokens
// Reference: docs/guides/FRONTEND_SUBGRAPH_INTEGRATION.md
export function extractUnclaimedTokenIds(cards: Token[] = []): number[] {
  return cards
    .map((token) => {
      const idAsNumber = token.metadata?.tokenId && Number(token.metadata?.tokenId);
      return Number.isFinite(idAsNumber) ? idAsNumber : null;
    })
    .filter((n): n is number => n !== null);
}

// Filter tokens to get only unclaimed/available cards
export function filterAvailableCards(tokens: Token[] = []): Token[] {
  return tokens.filter(token => !token.metadata?.scratched && !token.claimed);
}

// Extract token ID as number from a Token object
export function getTokenIdAsNumber(token: Token): number | null {
  const idAsNumber = token.metadata?.tokenId && Number(token.metadata?.tokenId);
  return Number.isFinite(idAsNumber) ? idAsNumber : null;
}

// Extract token ID from the composite ID string
export function extractTokenIdFromId(token: Token): string | null {
  // ID format is "contractAddress-tokenId", extract the tokenId part
  const parts = token.id?.split('-');
  return parts && parts.length > 1 ? parts[1] : null;
}