# Hooks Directory Structure Overview

This document provides a comprehensive overview of the `src/hooks/` directory, detailing custom React hooks used for state management, side effects, and reusable logic in the Farcaster Mini App.

## Directory Structure

```
src/hooks/
├── useBatchedUpdates.ts        # Batched state updates for performance optimization
├── useContractClaiming.ts      # Web3 contract claiming functionality
├── useContractMinting.ts       # Web3 contract minting functionality
├── useDebouncedScratchDetection.ts  # Scratch detection with debouncing
├── useDetectClickOutside.ts    # Click outside detection for modals/popups
├── useNeynarUser.ts            # Neynar user authentication and data
├── useVirtualizedCards.ts      # Virtualized card rendering for performance
└── useWeb3Wallet.ts            # Web3 wallet connection and management
```

## Hook Descriptions

### useBatchedUpdates.ts
**Purpose**: Optimizes performance by batching multiple state updates into single operations to prevent excessive re-renders.

**Key Functions**:
- `useBatchedUpdates`: Provides batched update functionality for the app context
- `batchUpdate`: Method to queue multiple state changes for batch processing

**Usage Pattern**:
```typescript
const { batchUpdate } = useBatchedUpdates(dispatch);
batchUpdate([
  { type: 'SET_CARDS', payload: newCards },
  { type: 'UPDATE_STATS', payload: newStats }
]);
```

### useContractClaiming.ts
**Purpose**: Manages Web3 contract interactions for claiming prizes from scratched cards.

**Key Functions**:
- `useContractClaiming`: Main hook for prize claiming functionality
- `useTokenClaimability`: Checks if a token can be claimed
- `useClaimSignature`: Generates claim signatures for secure transactions

**Dependencies**: Web3 wallet connection, contract addresses, blockchain constants

### useContractMinting.ts
**Purpose**: Handles Web3 contract interactions for minting new scratch cards as NFTs.

**Key Functions**:
- `useContractMinting`: Main hook for card minting functionality
- `useMintingCost`: Calculates minting costs based on quantity
- `useUserCards`: Fetches user's minted cards from blockchain

**Dependencies**: Web3 wallet connection, contract addresses, blockchain constants

### useDebouncedScratchDetection.ts
**Purpose**: Implements debounced scratch detection to prevent false positives during card scratching.

**Key Functions**:
- `useDebouncedScratchDetection`: Provides scratch detection with configurable debounce timing
- `isScratched`: Boolean indicating if scratch threshold has been met

**Usage**: Integrated with scratch-off components to determine when a card has been sufficiently scratched

### useDetectClickOutside.ts
**Purpose**: Detects clicks outside of a specified element for modal and popup management.

**Key Functions**:
- `useDetectClickOutside`: Returns ref and state for click outside detection
- `isClickedOutside`: Boolean indicating if click occurred outside target element

**Usage**: Used with modal components to close them when clicking outside

### useNeynarUser.ts
**Purpose**: Manages Neynar user authentication and data fetching.

**Key Functions**:
- `useNeynarUser`: Provides user data and authentication status
- `fetchUser`: Fetches user information from Neynar API

**Dependencies**: Neynar SDK, authentication context

### useVirtualizedCards.ts
**Purpose**: Implements virtualized rendering for card lists to optimize performance with large datasets.

**Key Functions**:
- `useVirtualizedCards`: Provides virtualized rendering for card components
- `visibleRange`: Current range of visible cards
- `totalHeight`: Total height of all cards for scrolling

**Usage**: Used with card grid components to efficiently render large numbers of cards

### useWeb3Wallet.ts
**Purpose**: Manages Web3 wallet connection, network switching, and wallet state.

**Key Functions**:
- `useWallet`: Main hook for wallet management (renamed from useWeb3Wallet)
- `useWalletStatus`: Provides wallet connection status for UI decisions
- `useWalletAction`: Handles wallet actions with proper state management

**Key Features**:
- Wallet connection/disconnection
- Network switching (Base network enforcement)
- Connection state management
- Address formatting and display

## Integration Patterns

1. **Hook Composition**: Hooks can be composed to create more complex functionality
2. **Context Integration**: Many hooks interact with app context for state management
3. **Web3 Integration**: Wallet and contract hooks provide blockchain functionality
4. **Performance Optimization**: Hooks like useBatchedUpdates and useVirtualizedCards optimize performance
5. **State Abstraction**: Hooks abstract complex state logic from components

## Best Practices

1. **Single Responsibility**: Each hook should have a single, well-defined purpose
2. **Type Safety**: All hooks should use TypeScript interfaces for props and return values
3. **Error Handling**: Hooks should implement proper error handling and recovery
4. **Performance**: Hooks should be optimized to prevent unnecessary re-renders
5. **Documentation**: All hooks should be well-documented with clear usage examples
6. **Testing**: Hooks should be easily testable with mock data and clear interfaces