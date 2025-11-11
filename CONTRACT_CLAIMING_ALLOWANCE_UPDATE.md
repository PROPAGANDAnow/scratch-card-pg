# Contract Claiming Hook - Allowance Integration Update

## Summary

Successfully updated the `useContractClaiming` hook to include automatic allowance checking and approval functionality before prize claiming.

## Changes Made

### 1. Enhanced Hook Interface

**New Parameters:**
- `userAddress?: Address | null` - User's wallet address (optional for backward compatibility)
- `requiredAmount: bigint = BigInt(0)` - Amount of tokens needed for claiming

**New Return Properties:**
- `allowance: bigint` - Current allowance amount
- `needsApproval: boolean` - Whether approval is needed for the prize amount
- `hasSufficientApproval: boolean` - Whether approval is sufficient for the prize amount
- `approve: (amount: bigint) => Promise<void>` - Approve specific amount
- `approveUnlimited: () => Promise<void>` - Approve unlimited amount

### 2. Allowance Checking Logic

- **Automatic Allowance Reading**: Uses `useReadContract` to check current allowance for the contract to spend user's tokens
- **Real-time Updates**: Allowance is automatically refetched when dependencies change
- **Smart Comparison**: Compares current allowance against required prize amount

### 3. Enhanced Claiming Functions

Both `claimPrize` and `claimPrizeWithBonus` now:
- Check allowance before attempting to claim
- Throw descriptive error if allowance is insufficient
- Include current and required amounts in error messages

### 4. Approval Functions

Added comprehensive approval functionality:
- **approve(amount)**: Approve specific amount for the contract
- **approveUnlimited()**: Approve maximum possible amount
- **Transaction Simulation**: Uses contract simulation before sending
- **Error Handling**: Proper error catching and state management

### 5. Updated `canClaim` Logic

The `canClaim` property now considers:
- Transaction state (idle/success)
- Sufficient allowance for the prize amount

## Usage Example

```typescript
const { address } = useAccount();
const prizeAmount = BigInt(1_000_000); // 1 USDC

const {
  state,
  allowance,
  needsApproval,
  hasSufficientApproval,
  approve,
  approveUnlimited,
  claimPrize,
  canClaim,
  error
} = useContractClaiming(address, prizeAmount);

// Check if approval is needed
if (needsApproval) {
  await approve(prizeAmount);
}

// Claim the prize
if (canClaim) {
  const claimSig = await createSignature(tokenId);
  await claimPrize(tokenId, claimSig);
}
```

## Files Created/Modified

### Modified Files
1. **`src/hooks/useContractClaiming.ts`** - Main hook with allowance integration

### New Files
1. **`docs/hooks/USE_CONTRACT_CLAIMING.md`** - Comprehensive documentation
2. **`CONTRACT_CLAIMING_ALLOWANCE_UPDATE.md`** - This summary file

### Modified Files
1. **`src/components/claim-button.tsx`** - Integrated allowance checking with approval modal

## Key Features

### ✅ Automatic Allowance Detection
- Checks current allowance before any claiming attempt
- Real-time allowance updates
- Clear indication of approval status

### ✅ Built-in Approval System
- Approve exact amount needed
- Approve unlimited for convenience
- Transaction simulation for safety

### ✅ Enhanced Error Handling
- Descriptive error messages for insufficient allowance
- Clear indication of current vs required amounts
- Proper error state management

### ✅ Backward Compatibility
- Optional parameters maintain existing functionality
- Existing code continues to work without changes
- Gradual migration path available

### ✅ Type Safety
- Full TypeScript support
- Proper type definitions for all new properties
- Comprehensive documentation

## Integration Benefits

### For Developers
- **Single Hook Solution**: Everything needed for claiming in one hook
- **Clear State Management**: Easy to understand transaction and approval states
- **Comprehensive Documentation**: Detailed examples and best practices
- **Seamless Integration**: Works with existing UI components without breaking changes

### For Users
- **Better UX**: Clear indication of when approval is needed with modal interface
- **Safety**: Automatic allowance checking prevents failed transactions
- **Flexibility**: Choose between exact or unlimited approval
- **No Surprises**: Button text changes to indicate approval is needed

### For the Application
- **Reduced Support**: Fewer failed transactions due to allowance issues
- **Better Analytics**: Clear tracking of approval and claiming flows
- **Improved Reliability**: More robust transaction handling
- **Professional UI**: Modal-based approval flow matches modern app patterns

## Migration Guide

### For Existing Code
1. **No Breaking Changes**: Existing code continues to work
2. **Gradual Enhancement**: Add user address and required amount parameters
3. **UI Updates**: Add approval UI based on `needsApproval` flag

### Recommended UI Flow
1. Check `needsApproval` on component mount
2. Show approval UI if needed
3. Enable claiming only when `canClaim` is true
4. Display transaction progress with state information

## Security Considerations

1. **User Control**: Users control exactly how much to approve
2. **Validation**: All inputs are validated before transactions
3. **Simulation**: Transactions are simulated before sending
4. **Error Boundaries**: Proper error handling prevents fund loss

## Testing Recommendations

1. **Unit Tests**: Test allowance calculation logic
2. **Integration Tests**: Test approval + claiming flow
3. **E2E Tests**: Test complete user journey
4. **Error Scenarios**: Test insufficient allowance cases

## Future Enhancements

1. **Batch Approval**: Support for approving multiple tokens at once
2. **Allowance Optimization**: Suggest optimal approval amounts
3. **Gas Estimation**: Show gas costs for approval and claiming
4. **Transaction History**: Track approval and claiming history

## Conclusion

The enhanced `useContractClaiming` hook now provides a complete solution for on-chain prize claiming with automatic allowance management. This improves user experience, reduces transaction failures, and provides developers with a comprehensive toolkit for blockchain interactions.

The implementation maintains backward compatibility while offering powerful new features for allowance management and transaction handling.