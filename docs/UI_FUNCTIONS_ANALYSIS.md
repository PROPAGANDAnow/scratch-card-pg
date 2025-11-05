# UI Functions Documentation

## Overview
This document analyzes the UI functions that were originally implemented in the main branch using React Context, and how they should be properly implemented as hooks instead of using a Zustand store.

## Function Analysis

### 1. `playWinSound`
**Location in main branch**: `src/components/wrapper.tsx:84-91`
**Purpose**: Plays a win sound effect
**Implementation**:
```typescript
const playWinSound = () => {
  if (winAudioRef.current) {
    winAudioRef.current.currentTime = 0; // Reset to beginning
    winAudioRef.current.play().catch((error) => {
      console.log("Audio play failed:", error);
    });
  }
};
```
**Dependencies**:
- Preloaded audio element (`winAudioRef.current`)
- Audio file: `/assets/win.mp3`

### 2. `getWinnerGif`
**Location in main branch**: `src/components/wrapper.tsx:94`
**Purpose**: Returns preloaded winner GIF image
**Implementation**:
```typescript
const getWinnerGif = () => winnerGifRef.current;
```
**Dependencies**:
- Preloaded image element (`winnerGifRef.current`)
- Image file: `/assets/winner.gif`

### 3. `refetchUserCards`
**Location in main branch**: `src/components/wrapper.tsx:102-127`
**Purpose**: Refetches user cards from the API and updates state
**Implementation**:
```typescript
const refetchUserCards = async () => {
  if (!state.publicKey) return;

  try {
    const userCards = await fetchUserCards(state.publicKey);
    if (userCards) {
      dispatch({ type: SET_CARDS, payload: userCards });
      dispatch({
        type: SET_UNSCRATCHED_CARDS,
        payload: getUnscratchedCards(userCards),
      });

      // Preserve selected card state
      if (state.selectedCard) {
        const updatedSelectedCard = userCards.find(
          (card) => card.id === state.selectedCard!.id
        );
        if (updatedSelectedCard) {
          dispatch({ type: SET_SELECTED_CARD, payload: updatedSelectedCard });
        }
      }
    }
  } catch (error) {
    console.error("Failed to refetch user cards:", error);
  }
};
```
**Dependencies**:
- `fetchUserCards` API function
- App state (publicKey, selectedCard)
- Context dispatch

### 4. `buyCards`
**Location in main branch**: `src/components/bottom.tsx:142-189`
**Purpose**: Handles the card purchase flow with blockchain transaction
**Implementation**:
- Uses wagmi's `writeContract` for USDC transfer
- Handles transaction states: sending, confirming, processing
- Calls backend API `/api/cards/buy` after transaction confirmation
- Shows toast notifications on success
- Updates card state after purchase

**Dependencies**:
- Wagmi hooks (`useWriteContract`, `useWaitForTransactionReceipt`)
- USDC address and ABI
- Backend API `/api/cards/buy`
- Toast notification system
- User state (publicKey, fid, pfp, username)
- Best friends data

### 5. `nextCard`
**Location in main branch**: `src/components/swipeable-card-stack.tsx:44-55`
**Purpose**: Navigates to the next card in swipeable mode
**Implementation**:
```typescript
const nextCardFunction = () => {
  if (canGoNext) {
    setDirection(1);
    const nextCard = cards[currentIndex + 1];
    if (nextCard) setCurrentCardNo(nextCard.card_no);
  }
};
```
**Dependencies**:
- Cards array
- Current card index
- State management for current card

## Recommended Hook Implementation

Instead of using a Zustand store, these functions should be implemented as a custom hook that:

1. **Manages its own state** for audio/image preloading
2. **Uses existing stores** for app state (app-store, user-store, card-store)
3. **Provides proper error handling** and loading states
4. **Encapsulates all related functionality** in one place

### Hook Structure:
```typescript
// src/hooks/useUIActions.ts
export const useUIActions = () => {
  // Audio/image preloading logic
  // Blockchain transaction handling
  // API calls and state updates

  return {
    playWinSound,
    getWinnerGif,
    refetchUserCards,
    buyCards,
    nextCard
  };
};
```

## Key Issues with Current UI Store Approach

1. **Separation of Concerns**: The UI store breaks encapsulation by storing function references instead of actual functionality
2. **State Duplication**: Requires manual synchronization between store and actual implementation
3. **Type Safety**: Function references lose type safety and IntelliSense support
4. **Testing**: Makes unit testing difficult due to indirection
5. **Maintainability**: Spreads related functionality across multiple files

## Benefits of Hook Approach

1. **Co-location**: Related functionality stays together
2. **Type Safety**: Full TypeScript support with proper types
3. **Testability**: Easy to unit test individual functions
4. **State Management**: Direct access to required stores
5. **Performance**: No unnecessary re-renders or function reference updates