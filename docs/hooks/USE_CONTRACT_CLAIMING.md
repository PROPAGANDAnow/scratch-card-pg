# useContractClaiming Hook Documentation

## Overview

The `useContractClaiming` hook provides a complete solution for on-chain prize claiming with automatic allowance checking and approval functionality. It replaces the traditional API-based prize processing with blockchain transactions.

## Key Features

- ✅ **Automatic Allowance Checking**: Checks if the contract has sufficient allowance to spend user's tokens
- ✅ **Built-in Approval Functions**: Provides approve and approveUnlimited functions
- ✅ **Prize Claiming**: Supports both regular and bonus prize claiming
- ✅ **Transaction Management**: Handles transaction states, confirmations, and errors
- ✅ **Type Safety**: Full TypeScript support with proper type definitions

## Import

```typescript
import { useContractClaiming, useClaimSignature } from '~/hooks/useContractClaiming';
import { useAccount } from 'wagmi';
```

## Basic Usage

```typescript
const { address } = useAccount();

// Convert prize amount to contract units (accounting for token decimals)
const prizeAmount = BigInt(1_000_000); // 1 USDC (6 decimals)

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
```

## Hook Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `userAddress` | `Address \| null \| undefined` | `undefined` | User's wallet address |
| `requiredAmount` | `bigint` | `BigInt(0)` | Amount of tokens needed for claiming |

## Return Values

### State Management
- `state`: Current transaction state (`'idle' | 'pending' | 'confirming' | 'success' | 'error'`)
- `transactionHash`: Transaction hash if pending/confirming
- `error`: Error message if failed
- `canClaim`: Whether user can claim (idle/success state + sufficient allowance)

### Allowance Management
- `allowance`: Current allowance amount as `bigint`
- `needsApproval`: Whether approval is needed for the prize amount
- `hasSufficientApproval`: Whether approval is sufficient for the prize amount
- `approve`: Function to approve specific amount
- `approveUnlimited`: Function to approve unlimited amount

### Claiming Functions
- `claimPrize`: Function to claim prize for a token
- `claimPrizeWithBonus`: Function to claim prize with bonus for friend
- `reset`: Function to reset the hook state

## Real-World Integration Example

See `src/components/claim-button.tsx` for a complete implementation that integrates allowance checking into an existing UI component.

### Key Integration Points

1. **Calculate Prize Amount**: Convert prize amount to contract units
```typescript
const prizeAmountInContractUnits = cardData?.prize_amount 
    ? BigInt(Math.floor(cardData.prize_amount * Math.pow(10, PAYMENT_TOKEN.DECIMALS)))
    : BigInt(0);
```

2. **Initialize Hook**: Pass user address and required amount
```typescript
const {
    claimPrize,
    state: claimState,
    claimPrizeWithBonus,
    allowance,
    needsApproval,
    hasSufficientApproval,
    approve,
    approveUnlimited,
    error: claimError,
} = useContractClaiming(address, prizeAmountInContractUnits);
```

3. **Check Approval First**: Show approval modal if needed
```typescript
const handleClaimBtnClick = async () => {
    if (needsApproval) {
        setShowApprovalModal(true);
        return;
    }
    await performClaim();
};
```

4. **Approval Modal**: User-friendly approval interface
```typescript
{showApprovalModal && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            {/* Approval UI with exact and unlimited options */}
        </div>
    </div>
)}
```

5. **Dynamic Button Label**: Update button text based on state
```typescript
const claimButtonLabel = isButtonDisabled 
    ? 'Processing…' 
    : needsApproval 
        ? 'Approve & Claim' 
        : 'Claim Prize';
```

## Bonus Claiming Example

```typescript
const handleClaimWithBonus = async (friendAddress: Address) => {
  try {
    setIsGeneratingSignature(true);
    
    const claimSig = await createSignature(tokenId);
    
    setIsGeneratingSignature(false);
    
    // Claim prize with bonus for friend
    await claimPrizeWithBonus(tokenId, claimSig, undefined, friendAddress);
  } catch (error) {
    setIsGeneratingSignature(false);
    console.error('Bonus claim failed:', error);
  }
};
```

## Transaction States

| State | Description | UI Action |
|-------|-------------|-----------|
| `idle` | Ready to start new transaction | Show claim/approve buttons |
| `pending` | Transaction sent to network | Show loading state |
| `confirming` | Transaction being confirmed | Show confirmation state |
| `success` | Transaction completed successfully | Show success message |
| `error` | Transaction failed | Show error message |

## Error Handling

The hook automatically handles various error scenarios:

1. **Insufficient Allowance**: Shows clear error message with current and required amounts
2. **Invalid Signature**: Validates signature format before sending
3. **Network Errors**: Catches and displays transaction failures
4. **Wallet Not Connected**: Validates wallet connection

## Best Practices

### 1. Always Check Allowance First
```typescript
if (needsApproval) {
  // Show approval UI
  return <ApprovalSection onApprove={handleApprove} />;
}

// Show claim UI
return <ClaimSection onClaim={handleClaim} />;
```

### 2. Use Proper Amount Conversion
```typescript
// Convert human-readable amount to contract units
const humanAmount = 1.5; // 1.5 USDC
const contractUnits = BigInt(Math.floor(humanAmount * Math.pow(10, PAYMENT_TOKEN.DECIMALS)));
```

### 3. Handle Loading States
```typescript
const isLoading = state === 'pending' || state === 'confirming' || isGeneratingSignature;

<button disabled={isLoading || !canClaim}>
  {isLoading ? 'Processing...' : 'Claim Prize'}
</button>
```

### 4. Show Transaction Progress
```typescript
{state === 'pending' && <p>Transaction sent...</p>}
{state === 'confirming' && <p>Confirming transaction...</p>}
{state === 'success' && <p>✅ Success!</p>}
```

## Integration with Existing Components

To integrate with existing components:

1. Replace API-based claiming calls with the hook
2. Add allowance checking UI before claiming
3. Update error handling to show blockchain-specific errors
4. Add transaction progress indicators

## Migration from API-based Claiming

### Before (API-based)
```typescript
const handleClaim = async (tokenId: number) => {
  const response = await fetch('/api/cards/process-prize', {
    method: 'POST',
    body: JSON.stringify({ tokenId })
  });
  
  const result = await response.json();
  // Handle result...
};
```

### After (Hook-based)
```typescript
const { claimPrize, needsApproval, approve, canClaim } = useContractClaiming(address, prizeAmount);

const handleClaim = async (tokenId: number) => {
  if (needsApproval) {
    await approve(prizeAmount);
  }
  
  const claimSig = await createSignature(tokenId);
  await claimPrize(tokenId, claimSig);
};
```

## Security Considerations

1. **Signature Validation**: The hook validates claim signatures before sending
2. **Allowance Management**: Users control exactly how much to approve
3. **Transaction Simulation**: Uses contract simulation before sending
4. **Error Boundaries**: Proper error handling prevents fund loss

## Troubleshooting

### Common Issues

1. **"Insufficient allowance" error**
   - Call `approve()` with the required amount first
   - Or use `approveUnlimited()` for one-time setup

2. **"Invalid claim signature" error**
   - Ensure the signature is generated from your backend
   - Check signature format and expiration

3. **Transaction stuck in pending**
   - Check network connectivity
   - Verify gas settings
   - Try resetting with `reset()` function

### Debug Tips

```typescript
// Enable detailed logging
console.log('Allowance:', allowance.toString());
console.log('Required:', prizeAmountInContractUnits.toString());
console.log('Needs approval:', needsApproval);
console.log('Can claim:', canClaim);
```

## Related Hooks

- `useClaimSignature`: For generating claim signatures
- `useTokenClaimability`: For checking if a token can be claimed
- `useContractStats`: For getting contract statistics
- `useERC20Approval`: For more granular ERC20 approval control