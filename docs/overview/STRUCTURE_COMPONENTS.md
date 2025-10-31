# Components Directory Structure Overview

This document provides a comprehensive overview of the `src/components/` directory, detailing reusable UI components used in the Farcaster Mini App.

## Directory Structure

```
src/components/
├── activity.tsx              # User activity display component
├── bottom.tsx                # Bottom navigation/footer component
├── card-grid.tsx             # Grid layout for displaying cards
├── circular-progress.tsx     # Circular progress indicator
├── initial-screen.tsx        # Initial app screen with onboarding
├── leaderboard.tsx           # Leaderboard display component
├── minting.tsx               # NFT card minting interface
├── ModalPortal.tsx           # Portal for rendering modals
├── nft-initial-screen.tsx    # NFT-specific initial screen
├── nft-scratch-off.tsx       # NFT card scratch-off interface
├── scratch-off.tsx           # Standard card scratch-off interface
├── swipeable-card-stack.tsx  # Swipeable card stack component
├── wallet-button.tsx         # Wallet connection button
├── win-rate-popup.tsx        # Win rate information popup
└── wrapper.tsx               # Main app wrapper component
```

## Component Descriptions

### activity.tsx
**Purpose**: Displays user activity history and recent actions.

**Key Features**:
- Timeline of user actions
- Activity filtering and sorting
- Integration with user context

**Props**:
- None (uses context for data)

### bottom.tsx
**Purpose**: Bottom navigation component for app navigation.

**Key Features**:
- Navigation tabs for different app sections
- Active tab highlighting
- Responsive design for mobile

**Props**:
- None (uses context for active state)

### card-grid.tsx
**Purpose**: Grid layout component for displaying scratch cards.

**Key Features**:
- Responsive grid layout
- Card selection and interaction
- Virtualized rendering support

**Props**:
- `cards`: Array of card data to display
- `onCardSelect`: Callback for card selection

### circular-progress.tsx
**Purpose**: Circular progress indicator for visualizing completion status.

**Key Features**:
- Animated progress visualization
- Customizable size and colors
- Percentage display

**Props**:
- `progress`: Progress percentage (0-100)
- `size`: Component size in pixels
- `strokeWidth`: Width of progress ring

### initial-screen.tsx
**Purpose**: Initial app screen with onboarding information and call-to-action.

**Key Features**:
- App introduction and value proposition
- Call-to-action buttons
- Social sharing options

**Props**:
- `onGetStarted`: Callback for get started action

### leaderboard.tsx
**Purpose**: Displays user rankings and leaderboard information.

**Key Features**:
- User ranking display
- Top performer highlighting
- Sorting by different metrics

**Props**:
- `users`: Array of user data for leaderboard

### minting.tsx
**Purpose**: Interface for minting new NFT scratch cards.

**Key Features**:
- Quantity selection
- Cost calculation
- Wallet integration
- Transaction status feedback

**Props**:
- `onSuccess`: Callback for successful minting
- `onError`: Callback for minting errors
- `showQuantitySelector`: Whether to show quantity controls
- `defaultQuantity`: Default number of cards to mint

### ModalPortal.tsx
**Purpose**: Portal component for rendering modals outside the normal DOM hierarchy.

**Key Features**:
- ReactDOM portal implementation
- Accessibility support
- Click outside to close

**Props**:
- `isOpen`: Whether modal is visible
- `onClose`: Callback for closing modal
- `children`: Modal content

### nft-initial-screen.tsx
**Purpose**: NFT-specific initial screen with wallet connection and minting options.

**Key Features**:
- Wallet connection integration
- NFT card display
- Minting call-to-action

**Props**:
- `onScratchNow`: Callback for scratch action

### nft-scratch-off.tsx
**Purpose**: NFT card scratch-off interface with Web3 integration.

**Key Features**:
- Canvas-based scratch functionality
- Prize reveal animation
- Web3 claiming integration
- Social sharing options

**Props**:
- `cardData`: NFT card data to display
- `onClose`: Callback for closing scratcher
- `onClaim`: Callback for prize claiming
- `onNext`: Callback for next card

### scratch-off.tsx
**Purpose**: Standard card scratch-off interface without Web3 integration.

**Key Features**:
- Canvas-based scratch functionality
- Prize reveal animation
- Social sharing options

**Props**:
- `cardData`: Card data to display
- `onClose`: Callback for closing scratcher
- `onClaim`: Callback for prize claiming
- `onNext`: Callback for next card

### swipeable-card-stack.tsx
**Purpose**: Stack of swipeable cards for mobile interaction.

**Key Features**:
- Touch-based swiping
- Card stack visualization
- Swipe direction detection

**Props**:
- `cards`: Array of cards to display
- `onSwipe`: Callback for swipe actions

### wallet-button.tsx
**Purpose**: Wallet connection button with status display.

**Key Features**:
- Wallet connection state visualization
- Network status indication
- Connection flow integration

**Props**:
- `className`: Additional CSS classes
- `showStatus`: Whether to show connection status text
- `buttonText`: Custom button text
- `size`: Button size variant
- `onClick`: Click handler

### win-rate-popup.tsx
**Purpose**: Popup displaying win rate information and odds.

**Key Features**:
- Win probability visualization
- Prize tier information
- Close functionality

**Props**:
- `isOpen`: Whether popup is visible
- `onClose`: Callback for closing popup

### wrapper.tsx
**Purpose**: Main app wrapper component providing global layout and context.

**Key Features**:
- Global app layout
- Context provider integration
- Error boundary implementation

**Props**:
- `children`: Child components to wrap

## Integration Patterns

1. **Context Integration**: Components integrate with app context for state management
2. **Hook Composition**: Components use custom hooks for complex functionality
3. **Responsive Design**: Components are designed for mobile-first experience
4. **Accessibility**: Components follow accessibility best practices
5. **Performance**: Components are optimized for efficient rendering

## Best Practices

1. **Component Reusability**: Components should be designed for reuse across the application
2. **Type Safety**: All components should use TypeScript interfaces for props
3. **Performance Optimization**: Components should implement memoization and efficient rendering
4. **Accessibility**: Components should follow WCAG guidelines for accessibility
5. **Responsive Design**: Components should work across different screen sizes
6. **Error Handling**: Components should gracefully handle error states
7. **Documentation**: Components should be well-documented with clear prop descriptions
8. **Testing**: Components should be easily testable with clear interfaces