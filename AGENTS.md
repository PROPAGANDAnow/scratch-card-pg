# Development Commands

## Build & Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:raw` - Raw Next.js build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run deploy:vercel` - Deploy to Vercel
- `npm run cleanup` - Clean build artifacts

## Testing
No test framework configured. Add testing setup before implementing tests.

# Application Flow

## User Journey
1. **Authentication**: User connects wallet → `/api/users/check-or-create` creates/updates user
2. **Card Purchase**: User buys cards with USDC → `/api/cards/buy` creates cards in batches (accepts array of tokenIds)
3. **Card Checking**: Frontend checks existing cards → `/api/cards/batch-check` returns existing cards for given tokenIds
4. **Scratching**: User scratches cards → Frontend detects scratch → `/api/cards/process-prize` handles winnings
5. **Winning**: Prize payouts via Base blockchain, friend wins create free cards for both users
6. **Sharing**: Winners can share on Farcaster → `/api/frame-share` generates shareable frames

## State Management
- Context API with reducer pattern (`src/app/context/`)
- Batched updates for performance (`useBatchedUpdates` hook)
- Optimistic UI updates with server sync

# API Endpoints

## Core APIs
- `POST /api/users/check-or-create` - User authentication/creation
- `POST /api/cards/buy` - Batch create cards (accepts array of tokenIds)
- `GET /api/cards/batch-check` - Check existing cards for given tokenIds
- `POST /api/cards/process-prize` - Handle card reveals, payouts, level progression
- `GET /api/users/best-friends?fid=X` - Fetch user's reciprocal followers

## Social & Sharing
- `GET /api/frame-share` - Generate Farcaster frame HTML
- `GET /api/share-image` - OG image generation for shares
- `POST /api/neynar/send-notification` - Send win notifications
- `POST /api/neynar/welcome-notification` - Welcome new users

## Cron Jobs
- `GET /api/cron/pro-users-free-cards` - Daily free cards for pro users (auth required)

# Database Schema

## Key Tables
- `users` - User profiles, stats, levels, notification settings
- `cards` - Individual scratch cards with prizes, numbers, ownership
- `reveals` - Card reveal history with payouts
- `stats` - Global app statistics (cards, reveals, winnings)

# Code Style Guidelines

## Imports
- Use `~/` alias for src imports (configured in tsconfig.json)
- Group imports: React/Next.js → third-party → local components
- Use `import type` for type-only imports

## Formatting & Types
- Strict TypeScript enabled
- Use ESLint with Next.js config
- Prefer explicit return types for functions
- Use interfaces for object shapes

## Naming Conventions
- Components: PascalCase (e.g., `ScratchOff`)
- Files: kebab-case for utilities, PascalCase for components
- Constants: UPPER_SNAKE_CASE
- Hooks: `use` prefix (camelCase)

## Error Handling
- Use try-catch for async operations
- Graceful fallbacks for API failures
- Console.error for debugging, user-friendly messages for UI

## Performance
- Use `memo()` for expensive components
- Implement `useCallback`/`useMemo` for optimization
- Batch state updates when possible
- Use `willChange` and GPU acceleration for animations

## Blockchain Integration
- Base chain for USDC payments and payouts
- Viem for blockchain interactions
- Payment verification with retry logic
- Admin wallet handles prize distributions