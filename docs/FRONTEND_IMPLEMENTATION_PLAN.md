# Frontend Implementation Plan
## Next.js App Router with Viem Integration

## 📋 Overview

This document outlines the comprehensive frontend implementation plan for the Scratch Card NFT dApp using Next.js App Router and Viem. It details the separation of concerns between frontend and backend (smart contracts), user flows, and technical implementation details.

## 🏗️ Architecture Overview

### Frontend Responsibilities
- **UI/UX**: User interface components and interactions
- **State Management**: Local state, wallet connection, transaction states
- **Web3 Integration**: Wallet connection, contract interactions via Viem
- **User Experience**: Loading states, error handling, success feedback
- **Data Fetching**: On-chain data reading, event listening
- **Form Validation**: Input validation before contract calls

### Backend (Smart Contract) Responsibilities
- **Business Logic**: All game logic, prize calculations, validation
- **State Management**: On-chain state (ownership, prizes, claims)
- **Security**: Access control, signature verification, reentrancy protection
- **Token Economics**: Payment processing, prize distribution
- **Event Emission**: Transaction events for frontend indexing

## 🎯 Core Features Implementation

### 1. Wallet Connection & Management

#### Frontend Implementation
```typescript
// hooks/useWallet.ts
import { useState, useEffect } from 'react'
import { createWalletClient, http, custom } from 'viem'
import { base } from 'viem/chains'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export const useWallet = () => {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  
  const connectWallet = async () => {
    try {
      await connect({ connector: injected() })
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  }
  
  return {
    address,
    isConnected,
    connectWallet,
    disconnect
  }
}
```

#### Backend Integration
- **Contract Functions**: None (wallet connection is purely frontend)
- **Events**: None
- **Validation**: Frontend validates wallet connection before contract interactions

---

### 2. Mint Scratch Card (Self)

#### Frontend Implementation
```typescript
// hooks/useMinting.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { SCRATCH_CARD_NFT_ABI, CONTRACT_ADDRESS } from '../constants/contracts'

export const useMinting = () => {
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash })

  const mintCard = async (quantity: number) => {
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: SCRATCH_CARD_NFT_ABI,
        functionName: 'mintCard',
        args: [BigInt(quantity)],
        value: parseUnits((0.001 * quantity).toString(), 18) // ETH price
      })
    } catch (error) {
      console.error('Minting failed:', error)
      throw error
    }
  }

  return {
    mintCard,
    isPending,
    isConfirming,
    isConfirmed,
    transactionHash: hash
  }
}
```

#### Backend (Smart Contract) Functions
```solidity
// Contract functions called
function mintCard(uint256 quantity) external payable nonReentrant {
    // Frontend sends: quantity, msg.value (ETH payment)
    // Contract validates: payment amount, batch size, paused state
    // Contract returns: token IDs via event
}

// Events emitted
event CardMinted(
    address indexed buyer,
    uint256[] tokenIds,
    uint256 totalPrice,
    uint256 timestamp
);
```

#### Data Flow
1. **Frontend**: User selects quantity → Validate input → Calculate price
2. **Frontend**: Call `mintCard(quantity)` with ETH payment
3. **Contract**: Validate payment → Mint tokens → Emit `CardMinted` event
4. **Frontend**: Listen for event → Update UI → Show success

---

### 3. Mint Scratch Card (For Someone Else)

#### Frontend Implementation
```typescript
// hooks/useMinting.ts (extended)
const mintCardForRecipient = async (
  quantity: number, 
  recipient: string
) => {
  try {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: SCRATCH_CARD_NFT_ABI,
      functionName: 'mintCard',
      args: [BigInt(quantity), recipient as Address]
    })
  } catch (error) {
    console.error('Minting for recipient failed:', error)
    throw error
  }
}
```

#### Backend (Smart Contract) Functions
```solidity
// Contract functions called
function mintCard(uint256 quantity, address recipient) external payable nonReentrant {
    // Frontend sends: quantity, recipient address, msg.value (ETH payment)
    // Contract validates: payment amount, recipient address, batch size
    // Contract returns: token IDs via event
}

// Events emitted
event CardMinted(
    address indexed buyer,
    uint256[] tokenIds,
    uint256 totalPrice,
    uint256 timestamp
);
```

#### Data Flow
1. **Frontend**: User enters recipient address → Validate address format
2. **Frontend**: Call `mintCard(quantity, recipient)` with ETH payment
3. **Contract**: Validate recipient → Mint tokens to recipient → Emit event
4. **Frontend**: Show success with recipient information

---

### 4. Claim Prize (Standard)

#### Frontend Implementation
```typescript
// hooks/useClaiming.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { SCRATCH_CARD_NFT_ABI, CONTRACT_ADDRESS } from '../constants/contracts'

export const useClaiming = () => {
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash })

  const claimPrize = async (tokenId: number) => {
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: SCRATCH_CARD_NFT_ABI,
        functionName: 'claimPrize',
        args: [BigInt(tokenId)]
      })
    } catch (error) {
      console.error('Claim failed:', error)
      throw error
    }
  }

  return {
    claimPrize,
    isPending,
    isConfirming,
    isConfirmed,
    transactionHash: hash
  }
}
```

#### Backend (Smart Contract) Functions
```solidity
// Contract functions called
function claimPrize(uint256 tokenId) external nonReentrant {
    // Frontend sends: tokenId
    // Contract validates: ownership, prize amount, signature validity
    // Contract transfers: ETH/prize tokens to owner
}

// Events emitted
event PrizeClaimed(
    address indexed owner,
    uint256 indexed tokenId,
    uint256 prizeAmount,
    uint256 timestamp
);
```

#### Data Flow
1. **Frontend**: User selects NFT → Verify ownership → Show prize amount
2. **Frontend**: Call `claimPrize(tokenId)`
3. **Contract**: Validate signature → Transfer prize → Emit `PrizeClaimed` event
4. **Frontend**: Listen for event → Update UI → Show claimed status

---

### 5. Claim Prize (With Bonus)

#### Frontend Implementation
```typescript
// hooks/useClaiming.ts (extended)
const claimPrizeWithBonus = async (
  tokenId: number,
  bonusRecipient: string
) => {
  try {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: SCRATCH_CARD_NFT_ABI,
      functionName: 'claimPrize',
      args: [BigInt(tokenId), bonusRecipient as Address]
    })
  } catch (error) {
    console.error('Claim with bonus failed:', error)
    throw error
  }
}
```

#### Backend (Smart Contract) Functions
```solidity
// Contract functions called
function claimPrize(uint256 tokenId, address bonusRecipient) external nonReentrant {
    // Frontend sends: tokenId, bonusRecipient address
    // Contract validates: ownership, prize amount, bonus recipient
    // Contract transfers: prize to owner, bonus to recipient
}

// Events emitted
event PrizeClaimed(
    address indexed owner,
    uint256 indexed tokenId,
    uint256 prizeAmount,
    uint256 timestamp
);

event BonusPrizeClaimed(
    address indexed recipient,
    uint256 indexed tokenId,
    uint256 bonusAmount,
    uint256 timestamp
);
```

#### Data Flow
1. **Frontend**: User selects NFT → Enter bonus recipient → Validate addresses
2. **Frontend**: Call `claimPrize(tokenId, bonusRecipient)`
3. **Contract**: Validate all parameters → Transfer prizes → Emit events
4. **Frontend**: Show success with both prize transfers

---

## 🔄 Data Flow Architecture

### Reading On-Chain Data

#### Frontend Implementation
```typescript
// hooks/useContractData.ts
import { useReadContract, useWatchContractEvent } from 'wagmi'
import { SCRATCH_CARD_NFT_ABI, CONTRACT_ADDRESS } from '../constants/contracts'

export const useContractData = (userAddress: Address) => {
  // Read user's NFTs
  const { data: userTokens } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SCRATCH_CARD_NFT_ABI,
    functionName: 'getUserTokens',
    args: [userAddress]
  })

  // Read payment token address
  const { data: paymentToken } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SCRATCH_CARD_NFT_ABI,
    functionName: 'getPaymentTokenAddress'
  })

  // Watch for minting events
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: SCRATCH_CARD_NFT_ABI,
    eventName: 'CardMinted',
    onLogs: (logs) => {
      // Update local state when new cards are minted
      logs.forEach(log => {
        if (log.args.buyer === userAddress) {
          // Refresh user's token list
        }
      })
    }
  })

  return { userTokens, paymentToken }
}
```

#### Backend (Smart Contract) Read Functions
```solidity
// View functions for frontend
function getUserTokens(address owner) external view returns (uint256[] memory);
function getPaymentTokenAddress() external view returns (address);
function tokenURI(uint256 tokenId) external view returns (string memory);
function ownerOf(uint256 tokenId) external view returns (address);
```

---

## 🎨 UI/UX Implementation Plan

### Component Structure
```
components/
├── ui/                    # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   └── Loading.tsx
├── wallet/                # Wallet-related components
│   ├── ConnectButton.tsx
│   ├── WalletInfo.tsx
│   └── NetworkSwitcher.tsx
├── minting/               # Minting components
│   ├── MintForm.tsx
│   ├── QuantitySelector.tsx
│   └── RecipientInput.tsx
├── claiming/              # Claiming components
│   ├── ClaimCard.tsx
│   ├── PrizeDisplay.tsx
│   └── BonusRecipient.tsx
└── gallery/               # NFT gallery
    ├── TokenGrid.tsx
    ├── TokenCard.tsx
    └── TokenDetails.tsx
```

### Page Structure (App Router)
```
app/
├── page.tsx              # Home/Landing page
├── mint/
│   └── page.tsx          # Minting page
├── gallery/
│   └── page.tsx          # NFT gallery
├── claim/
│   └── page.tsx          # Claiming page
└── profile/
    └── page.tsx          # User profile
```

---

## 🔧 Technical Implementation Details

#### Viem Configuration
```typescript
// config/viem.ts
import { createConfig, http } from 'viem'
import { base } from 'viem/chains'
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors'

// Chain configuration
export const baseChain = {
  ...base,
  rpcUrls: {
    ...base.rpcUrls,
    default: { http: [process.env.NEXT_PUBLIC_BASE_RPC_URL!] },
    public: { http: [process.env.NEXT_PUBLIC_BASE_RPC_URL!] },
  },
  blockExplorers: {
    ...base.blockExplorers,
    default: { name: 'Basescan', url: 'https://basescan.org' },
  },
}

export const config = createConfig({
  chains: [baseChain],
  connectors: [
    injected(),
    walletConnect({ 
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
      metadata: {
        name: process.env.NEXT_PUBLIC_APP_NAME!,
        description: process.env.NEXT_PUBLIC_APP_DESCRIPTION!,
        url: process.env.NEXT_PUBLIC_APP_URL!,
        icons: [process.env.NEXT_PUBLIC_APP_ICON!],
      },
    }),
    coinbaseWallet({
      appName: process.env.NEXT_PUBLIC_APP_NAME!,
      appLogoUrl: process.env.NEXT_PUBLIC_APP_ICON!,
    }),
  ],
  transports: {
    [baseChain.id]: http(),
  },
})
```

#### Contract Constants
```typescript
// constants/contracts.ts
import { Address } from 'viem'

// Complete ABI from deployed contract
export const SCRATCH_CARD_NFT_ABI = [
  // Read Functions
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'getUserTokens',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPaymentTokenAddress',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxBatchSize',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'baseURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'isAdmin',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'isOwner',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  
  // Write Functions
  {
    inputs: [{ name: 'quantity', type: 'uint256' }],
    name: 'mintCard',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'quantity', type: 'uint256' },
      { name: 'recipient', type: 'address' }
    ],
    name: 'mintCard',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'claimPrize',
    outputs: [],
    stateMutability: 'nonReentrant',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'bonusRecipient', type: 'address' }
    ],
    name: 'claimPrize',
    outputs: [],
    stateMutability: 'nonReentrant',
    type: 'function',
  },
  {
    inputs: [{ name: 'newPaymentToken', type: 'address' }],
    name: 'updatePaymentToken',
    outputs: [],
    stateMutability: 'nonReentrant',
    type: 'function',
  },
  {
    inputs: [{ name: 'baseURI', type: 'string' }],
    name: 'setBaseURI',
    outputs: [],
    stateMutability: 'nonReentrant',
    type: 'function',
  },
  {
    inputs: [{ name: 'admin', type: 'address' }],
    name: 'addAdmin',
    outputs: [],
    stateMutability: 'nonReentrant',
    type: 'function',
  },
  {
    inputs: [{ name: 'admin', type: 'address' }],
    name: 'removeAdmin',
    outputs: [],
    stateMutability: 'nonReentrant',
    type: 'function',
  },
  {
    inputs: [{ name: 'paused', type: 'bool' }],
    name: 'setPaused',
    outputs: [],
    stateMutability: 'nonReentrant',
    type: 'function',
  },
  {
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'quantity', type: 'uint256' }
    ],
    name: 'adminMintCards',
    outputs: [],
    stateMutability: 'nonReentrant',
    type: 'function',
  },
  
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'buyer', type: 'address' },
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'totalPrice', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' }
    ],
    name: 'CardMinted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { name: 'prizeAmount', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' }
    ],
    name: 'PrizeClaimed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { name: 'bonusAmount', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' }
    ],
    name: 'BonusPrizeClaimed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'newPaymentToken', type: 'address' }
    ],
    name: 'PaymentTokenUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'recipient', type: 'address' },
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'timestamp', type: 'uint256' }
    ],
    name: 'AdminCardMinted',
    type: 'event',
  },
] as const

// Contract addresses
export const CONTRACT_ADDRESS = '0xca6ffd32f5070c862865eb86a89265962b33c8fb' as Address

// Payment token address
export const PAYMENT_TOKEN = '0x902C0EB8E7654B15EEc93499587e56eF75fa6AdD' as Address

// Signer address
export const SIGNER_ADDRESS = '0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF' as Address

// Game configuration
export const GAME_CONFIG = {
  ETH_PRICE: '0.001', // 0.001 ETH per card
  USDC_PRICE: '1000000', // 1 USDC per card (6 decimals)
  MAX_BATCH_SIZE: 50,
  NAME: 'Scratch Card NFT',
  SYMBOL: 'SCRATCH',
  BASE_URI: 'https://api.scratchcards.com',
} as const

// Chain configuration
export const CHAIN_CONFIG = {
  name: 'Base',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://mainnet.base.org'] } },
  blockExplorers: { default: { name: 'Basescan', url: 'https://basescan.org' } },
  id: 8453,
} as const

// Token configuration
export const TOKEN_CONFIG = {
  paymentToken: {
    address: '0x902C0EB8E7654B15EEc93499587e56eF75fa6AdD' as Address,
    name: 'Sample Token',
    symbol: 'SAMP',
    decimals: 18,
  },
} as const
```

---

## 🛡️ Error Handling & Validation

### Frontend Validation
```typescript
// utils/validation.ts
export const validateAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export const validateQuantity = (quantity: number, maxBatchSize: number): boolean => {
  return quantity > 0 && quantity <= maxBatchSize
}

export const validateMintingParams = (
  quantity: number,
  recipient?: string
): { isValid: boolean; error?: string } => {
  if (!validateQuantity(quantity, 50)) {
    return { isValid: false, error: 'Quantity must be between 1 and 50' }
  }
  
  if (recipient && !validateAddress(recipient)) {
    return { isValid: false, error: 'Invalid recipient address' }
  }
  
  return { isValid: true }
}
```

### Error Handling
```typescript
// hooks/useErrorHandler.ts
export const useErrorHandler = () => {
  const handleError = (error: any) => {
    if (error.name === 'ContractFunctionExecutionError') {
      // Handle contract-specific errors
      switch (error.cause?.data?.errorName) {
        case 'InsufficientPayment':
          return 'Insufficient payment amount'
        case 'ExceedsMaxBatchSize':
          return 'Quantity exceeds maximum batch size'
        case 'InvalidRecipient':
          return 'Invalid recipient address'
        default:
          return 'Transaction failed. Please try again.'
      }
    }
    
    if (error.name === 'UserRejectedRequestError') {
      return 'Transaction was rejected by user'
    }
    
    return 'An unexpected error occurred'
  }

  return { handleError }
}
```

---

## 📊 State Management

### Global State (Zustand)
```typescript
// store/appStore.ts
import { create } from 'zustand'

interface AppState {
  // User state
  userAddress: Address | null
  isConnected: boolean
  
  // Contract state
  userTokens: bigint[]
  paymentToken: Address | null
  
  // UI state
  isLoading: boolean
  currentTransaction: string | null
  
  // Actions
  setUserAddress: (address: Address | null) => void
  setIsConnected: (connected: boolean) => void
  setUserTokens: (tokens: bigint[]) => void
  setPaymentToken: (token: Address) => void
  setLoading: (loading: boolean) => void
  setCurrentTransaction: (hash: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  userAddress: null,
  isConnected: false,
  userTokens: [],
  paymentToken: null,
  isLoading: false,
  currentTransaction: null,
  
  setUserAddress: (address) => set({ userAddress: address }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setUserTokens: (tokens) => set({ userTokens: tokens }),
  setPaymentToken: (token) => set({ paymentToken: token }),
  setLoading: (loading) => set({ isLoading: loading }),
  setCurrentTransaction: (hash) => set({ currentTransaction: hash }),
}))
```

---

## 🚀 Deployment & Environment

### Environment Variables
```bash
# .env.local
# Wallet Configuration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# Network RPC URLs
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org

# Contract Addresses
NEXT_PUBLIC_CONTRACT_ADDRESS=0xca6ffd32f5070c862865eb86a89265962b33c8fb

# Payment Token Addresses
NEXT_PUBLIC_PAYMENT_TOKEN=0x902C0EB8E7654B15EEc93499587e56eF75fa6AdD

# Signer Configuration
NEXT_PUBLIC_SIGNER_ADDRESS=0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF

# Game Configuration
NEXT_PUBLIC_ETH_PRICE=0.001
NEXT_PUBLIC_USDC_PRICE=1000000
NEXT_PUBLIC_MAX_BATCH_SIZE=50

# API Configuration
NEXT_PUBLIC_BASESCAN_API_KEY=your_basescan_api_key_here
NEXT_PUBLIC_COINGECKO_API_KEY=your_coingecko_api_key_here

# Application Configuration
NEXT_PUBLIC_APP_NAME="Scratch Card NFT"
NEXT_PUBLIC_APP_DESCRIPTION="Mint and scratch NFT cards to win prizes!"
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_ICON=/favicon.ico
```

### Package Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "viem": "^2.0.0",
    "wagmi": "^2.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "clsx": "^2.0.0",
    "tailwindcss": "^3.3.0",
    "@rainbow-me/rainbowkit": "^2.0.0",
    "@headlessui/react": "^1.7.0",
    "@heroicons/react": "^2.0.0",
    "framer-motion": "^10.0.0",
    "react-hot-toast": "^2.4.0",
    "axios": "^1.6.0",
    "date-fns": "^2.30.0",
    "ethers": "^6.8.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "postcss": "^8.4.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 🔧 Complete Configuration Files

### Wagmi Provider Setup
```typescript
// app/providers.tsx
'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/config/viem'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### App Layout Configuration
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Scratch Card NFT',
  description: 'Mint and scratch NFT cards to win prizes!',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}

---

## 📱 Mobile Responsiveness

### Responsive Design Strategy
- **Mobile-First**: Design for mobile screens first
- **Breakpoints**: 
  - Mobile: 320px - 768px
  - Tablet: 768px - 1024px
  - Desktop: 1024px+
- **Touch-Friendly**: Minimum 44px touch targets
- **Wallet Integration**: Deep linking for mobile wallets

---

## 🔐 Security Considerations

### Frontend Security
- **Input Validation**: Validate all user inputs before contract calls
- **Transaction Simulation**: Simulate transactions before sending
- **Error Messages**: User-friendly error messages without sensitive info
- **Rate Limiting**: Prevent spam transactions
- **Phishing Protection**: Clear domain verification

### Smart Contract Integration Security
- **Read-First**: Always read contract state before writing
- **Event Listening**: Use events for real-time updates
- **Gas Estimation**: Show gas costs before transactions
- **Nonce Management**: Handle nonce conflicts gracefully

---

## 📈 Performance Optimization

### Frontend Optimization
- **Code Splitting**: Lazy load components and pages
- **Image Optimization**: Next.js Image component for NFT images
- **Caching**: Cache contract calls and user data
- **Bundle Size**: Optimize imports and use tree shaking

### Web3 Optimization
- **RPC Management**: Use multiple RPC endpoints for reliability
- **Batch Requests**: Batch multiple contract calls when possible
- **Event Filtering**: Filter events by user address
- **State Sync**: Efficient state synchronization

---

## 🧪 Testing Strategy

### Frontend Testing
```typescript
// __tests__/hooks/useMinting.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useMinting } from '../hooks/useMinting'

describe('useMinting', () => {
  it('should mint card successfully', async () => {
    const { result } = renderHook(() => useMinting())
    
    await waitFor(() => {
      expect(result.current.mintCard).toBeDefined()
    })
    
    // Test minting logic
  })
})
```

### Integration Testing
- **Wallet Connection**: Test wallet connection flows
- **Contract Interaction**: Test contract call flows
- **Error Handling**: Test error scenarios
- **Event Handling**: Test event listening and updates

---

## 📋 Implementation Checklist

### Phase 1: Foundation
- [ ] Set up Next.js project with App Router
- [ ] Configure Viem and Wagmi
- [ ] Set up wallet connection
- [ ] Create basic UI components
- [ ] Set up routing structure

### Phase 2: Core Features
- [ ] Implement minting functionality
- [ ] Implement claiming functionality
- [ ] Create NFT gallery
- [ ] Add transaction status tracking
- [ ] Implement error handling

### Phase 3: Advanced Features
- [ ] Add bonus claiming
- [ ] Implement batch operations
- [ ] Add event listening
- [ ] Create user profile
- [ ] Add transaction history

### Phase 4: Polish & Optimization
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Testing coverage
- [ ] Documentation

---

## 🎯 Success Metrics

### Technical Metrics
- **Page Load Time**: < 3 seconds
- **Transaction Success Rate**: > 95%
- **Error Rate**: < 2%
- **Mobile Performance**: Lighthouse score > 90

### User Experience Metrics
- **Wallet Connection Success**: > 90%
- **Transaction Completion Time**: < 30 seconds
- **User Retention**: Track returning users
- **Support Tickets**: Minimize user issues

---

## 🔗 Related Documentation

- [NFT Architecture](../architecture/NFT_ARCHITECTURE.md)
- [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md)
- [Project Structure](../overview/STRUCTURE_PROJECT.md)
- [Testing Summary](./TESTING_SUMMARY.md)

---

## 📞 Getting Help

For frontend implementation questions:

1. **Review this document** for detailed implementation guidance
2. **Check contract ABI** for accurate function signatures
3. **Test on testnet** before mainnet deployment
4. **Create issues** for specific implementation problems

---

This implementation plan provides a comprehensive roadmap for building the frontend application. It ensures proper separation of concerns between frontend and backend while maintaining security, performance, and user experience standards.