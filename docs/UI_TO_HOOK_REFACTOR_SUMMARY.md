# UI Store to Hook Refactor Summary

## Overview
Successfully refactored the UI store pattern to use a proper custom hook approach, eliminating the anti-pattern of storing function references in a Zustand store.

## Changes Made

### 1. Created New Hook
- **File**: `src/hooks/useUIActions.ts`
- **Purpose**: Encapsulates all UI-related actions with proper state management
- **Functions**:
  - `playWinSound()` - Plays the win sound effect with preloaded audio
  - `getWinnerGif()` - Returns preloaded winner GIF
  - `refetchUserCards()` - Refetches user cards from API
  - `buyCards(numberOfCards)` - Handles USDC-based card purchases
  - `nextCard()` - Navigates to next card in swipeable mode

### 2. Updated Components
- **scratch-off.tsx**: Updated to use `useUIActions()` hook directly
- **nft-scratch-off.tsx**: Updated to use `useUIActions()` hook directly
- **bottom.tsx**: Removed store-based function passing, uses hook directly
- **swipeable-card-stack.tsx**: Removed unused UI store import
- **wrapper.tsx**: Removed all UI function preloading and store setting logic

### 3. Removed Files
- **src/stores/ui-store.ts**: Deleted as it's no longer needed
- Updated `src/stores/index.ts` to remove UI store exports

### 4. Documentation
- **docs/UI_FUNCTIONS_ANALYSIS.md**: Created comprehensive documentation of all UI functions and their implementations

## Benefits of the Refactor

1. **Better Encapsulation**: All UI logic is now co-located in a single hook
2. **Type Safety**: Full TypeScript support without function reference indirection
3. **Testability**: Functions can be easily unit tested
4. **Performance**: Eliminates unnecessary re-renders from store updates
5. **Maintainability**: Clear separation of concerns and easier to understand code flow
6. **No More Anti-Patterns**: Removed the problematic pattern of storing functions in state

## Technical Details

### Asset Preloading
The hook now handles its own asset preloading:
- Audio file: `/assets/win.mp3`
- Image file: `/assets/winner.gif`

### State Management
- Uses existing Zustand stores (`app-store`, `user-store`, `card-store`) for data
- Manages its own local state for UI interactions
- Properly handles loading states and error conditions

### Blockchain Integration
- Maintains full integration with wagmi for USDC transactions
- Handles transaction states: sending, confirming, processing
- Integrates with backend API for card creation

## Usage
```typescript
import { useUIActions } from '~/hooks/useUIActions';

// In component
const { playWinSound, getWinnerGif, refetchUserCards, buyCards, nextCard } = useUIActions();

// Direct function calls
playWinSound();
const gif = getWinnerGif();
await refetchUserCards();
await buyCards(5);
nextCard();
```

## Next Steps
1. The refactor is complete and all lint errors have been resolved
2. Components now use the hook directly instead of the store
3. The codebase follows better React patterns and is more maintainable