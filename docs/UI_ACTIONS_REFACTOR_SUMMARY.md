# UI Actions Refactor Summary

## Overview
Successfully refactored the `useUIActions` hook to remove USDC-based card buying functionality and replace it with a modal trigger approach. Also removed redundant `refetchUserCards` functionality.

## Changes Made

### 1. Removed Blockchain Integration
- **Removed imports**: `erc20Abi`, `parseUnits`, wagmi hooks
- **Removed state**: `pendingTx`, `paymentStatus`, `isConfirming`, `numberOfCardsRef`
- **Removed functions**: `processBackendPurchase`, USDC-based `buyCards`
- **Removed effects**: Transaction confirmation and error handling

### 2. Simplified buyCards Function
The `buyCards` function now:
- Triggers a buy modal instead of processing blockchain transactions
- Uses a ref to store the trigger function
- Shows a warning toast if no modal is registered

```typescript
const buyCards = useCallback(() => {
  if (buyModalTriggerRef.current) {
    buyModalTriggerRef.current();
  } else {
    showToast("Buy modal not available", "warning", 3000);
  }
}, [showToast]);
```

### 3. Added setBuyModalTrigger Function
New function that allows components to register their buy modal trigger:
```typescript
const setBuyModalTrigger = useCallback((triggerFn: () => void) => {
  buyModalTriggerRef.current = triggerFn;
}, []);
```

### 4. Updated bottom.tsx
- Added `setBuyModalTrigger` from UI actions
- Registers the `triggerBuyModal` function with the hook
- Modal trigger now happens through the hook instead of direct store

### 5. Removed refetchUserCards
- Since `useUserTokens` hook already provides `refetch` functionality
- Removed duplicate `refetchUserCards` function from `useUIActions`
- Components should use `useUserTokens` for refetching cards

### 6. Updated Components
- **scratch-off.tsx**: Removed `buyCards` and `refetchUserCards` from imports
- **nft-scratch-off.tsx**: Removed `buyCards` from imports
- **bottom.tsx**: Added modal trigger registration

## New Hook Interface
```typescript
{
  playWinSound: () => void,
  getWinnerGif: () => HTMLImageElement | null,
  buyCards: () => void, // Now triggers modal
  nextCard: () => void,
  setBuyModalTrigger: (fn: () => void) => void
}
```

## Benefits
1. **Simpler Code**: Removed complex blockchain logic
2. **More Flexibility**: Buy modal can be implemented in different ways
3. **No Duplication**: Removed redundant refetch functionality
4. **Better Separation**: UI actions focused on UI, not blockchain
5. **Future-Proof**: Easy to implement different buying mechanisms

## Usage Pattern
```typescript
// In component that provides the modal (e.g., bottom.tsx)
const { setBuyModalTrigger } = useUIActions();

useEffect(() => {
  setBuyModalTrigger(() => setShowBuyModal(true));
}, [setBuyModalTrigger]);

// In component that needs to trigger buying (e.g., scratch-off.tsx)
const { buyCards } = useUIActions();

// Call to show buy modal
buyCards();
```

## Notes
- The actual card buying through NFT minting is handled by `MintCardForm` component
- USDC-based buying can be re-implemented in the future by updating the modal
- Components needing to refetch cards should use `useUserTokens` hook directly