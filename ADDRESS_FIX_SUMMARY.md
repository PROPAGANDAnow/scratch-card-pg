# Address Handling Fix Summary

## Problem
The error `Address "0x" is invalid. - Address must be a hex value of 20 bytes (40 hex characters)` was occurring when clicking the submit button in the mint card form.

## Root Cause
The code was using `'0x'` as a fallback address when no recipient was provided, but `'0x'` is not a valid Ethereum address. Valid Ethereum addresses must be exactly 20 bytes (40 hex characters) plus the '0x' prefix.

## Solution

### 1. Created Centralized Address Constants
- **File**: `src/lib/blockchain-addresses.ts`
- **Added**: `ZERO_ADDRESS` constant with proper zero address (`0x0000000000000000000000000000000000000000`)
- **Added**: Address validation utilities
- **Added**: `AddressPatterns.safeRecipient()` utility function

### 2. Updated Contract Hooks
- **File**: `src/hooks/useContractMinting.ts`
  - Replaced `'0x'` with `AddressPatterns.safeRecipient(recipient)`
  - Removed unused imports and variables
  
- **File**: `src/hooks/useContractClaiming.ts`
  - Replaced `'0x'` with `AddressPatterns.safeRecipient(recipient)`
  - Removed unused imports

### 3. Updated Mint Card Form
- **File**: `src/components/mint-card-form.tsx`
  - Removed unused recipient state variables (functionality was commented out)
  - Simplified minting call to use `undefined` for recipient
  - Fixed linting issues

## Key Improvements

### Address Validation
```typescript
// Before (invalid)
recipient || '0x'

// After (safe)
AddressPatterns.safeRecipient(recipient)
```

### Zero Address Constant
```typescript
// Before (hardcoded)
'0x0000000000000000000000000000000000000000'

// After (centralized)
ZERO_ADDRESS
```

### Safe Recipient Utility
The `AddressPatterns.safeRecipient()` function:
- Returns zero address for undefined/empty/invalid inputs
- Normalizes valid addresses to lowercase
- Provides type safety with TypeScript

## Files Modified
1. `src/lib/blockchain-addresses.ts` (new)
2. `src/hooks/useContractMinting.ts`
3. `src/hooks/useContractClaiming.ts`
4. `src/components/mint-card-form.tsx`

## Testing
The fix ensures that:
- No invalid addresses are passed to viem functions
- All address handling is centralized and consistent
- Type safety is maintained throughout the codebase
- The original minting error is resolved

## Usage
```typescript
import { AddressPatterns, ZERO_ADDRESS } from '~/lib/blockchain-addresses';

// Safe recipient handling
const safeRecipient = AddressPatterns.safeRecipient(recipient);

// Direct zero address usage
const fallbackAddress = ZERO_ADDRESS;
```

This fix resolves the viem validation error and provides a robust foundation for address handling throughout the application.