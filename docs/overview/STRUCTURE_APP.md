# App Directory Structure Overview

This document provides a comprehensive overview of the `src/app/` directory, detailing the Next.js App Router structure, pages, context management, and API routes for the Farcaster Mini App.

## Directory Structure

```
src/app/
├── .well-known/              # Well-known URLs for verification
├── api/                      # API routes and serverless functions
├── cards/                    # Cards page
├── context/                  # React context for global state
├── interface/                # TypeScript interfaces
├── leaderboard/              # Leaderboard page
├── profile/                  # User profile page
├── favicon.ico               # Favicon
├── globals.css               # Global CSS styles
├── layout.tsx                # Root layout component
├── nft-home.tsx              # NFT home page component
├── page.tsx                  # Main landing page
└── providers.tsx             # Root providers component
```

## Key Files and Directories

### .well-known/
Contains verification files for services like Farcaster frame validation.

### api/
Serverless API routes for backend functionality.

**Key Routes**:
- `/api/cards/buy` - Card purchase verification
- `/api/cards/generate-claim-signature` - Claim signature generation
- `/api/cards/process-prize` - Prize processing
- `/api/cron/pro-users-free-cards` - Cron job for pro users
- `/api/frame-share` - Farcaster frame generation
- `/api/neynar/*` - Neynar integration endpoints
- `/api/share-image` - Share image generation
- `/api/users/*` - User management endpoints

### context/
React context implementation for global state management.

**Key Files**:
- `action.ts` - Action type definitions
- `actions.ts` - Action constants
- `index.tsx` - Context provider
- `reducer.ts` - State reducer logic
- `state.ts` - Initial state definition

### interface/
TypeScript interfaces and types used throughout the application.

**Key Interfaces**:
- `appStats.ts` - Application statistics
- `bestFriends.ts` - Best friends data
- `card.ts` - Card data structure
- `cardCell.ts` - Card cell data
- `reveal.ts` - Reveal data
- `user.ts` - User data

### pages/
Next.js page components for different routes.

**Key Pages**:
- `cards/page.tsx` - Cards listing page
- `leaderboard/page.tsx` - Leaderboard page
- `profile/page.tsx` - User profile page
- `page.tsx` - Main landing page (NFT home)

### Root Files

#### layout.tsx
Root layout component that wraps all pages with providers and global styles.

#### nft-home.tsx
Main NFT home page component that handles the primary user flow for NFT scratch cards.

#### page.tsx
Entry point page that renders the NFT home component.

#### providers.tsx
Root providers component that wraps the app with all necessary context providers.

## Context Management

The app uses React Context API with a reducer pattern for global state management:

1. **State Structure**: Defined in `context/state.ts`
2. **Actions**: Defined in `context/actions.ts` and `context/action.ts`
3. **Reducer**: Logic in `context/reducer.ts`
4. **Provider**: Implementation in `context/index.tsx`

## API Route Structure

API routes follow a RESTful pattern with clear separation of concerns:

1. **Cards API**: Card-related operations (purchase, claiming, processing)
2. **Users API**: User management and authentication
3. **Cron Jobs**: Scheduled tasks for maintenance
4. **Social Integration**: Neynar and Farcaster integration endpoints
5. **Image Generation**: Dynamic image generation for sharing

## Integration Patterns

1. **Server-Client Communication**: API routes handle server-side logic
2. **Context Integration**: Pages integrate with app context for state management
3. **Type Safety**: Strong typing with TypeScript interfaces
4. **Error Handling**: Consistent error handling across pages and API routes
5. **Performance**: Optimized rendering with React.memo and useMemo

## Best Practices

1. **Page Organization**: Pages should be organized by feature/functionality
2. **API Route Design**: API routes should follow REST conventions
3. **Context Usage**: Context should be used for truly global state only
4. **Type Safety**: All pages and components should use TypeScript
5. **Performance**: Pages should implement efficient rendering patterns
6. **Accessibility**: Pages should follow accessibility guidelines
7. **Responsive Design**: Pages should work across all device sizes
8. **Error Handling**: Pages should gracefully handle error states