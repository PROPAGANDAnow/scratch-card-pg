# Subgraph Integration Implementation

This document outlines the complete subgraph integration implementation for the Scratch Card NFT application, including the latest updates with The Graph production endpoints and React Query integration.

## 🚀 Latest Updates (New Implementation)

### Production Subgraph Integration
- **Subgraph ID**: Go4V8UMVoFXFSoRsMHpFVmdQD9dcFDQojWzxNFZUmxTp
- **Network**: Base (Mainnet)
- **Status**: Published, Version 0.1.1
- **Owner**: 0xbhaisaab.eth

### React Query Integration
- **Server-Side Rendering**: Implemented with `HydrationBoundary`
- **Client Components**: Optimized data fetching with `useQuery`
- **Caching**: Intelligent caching with proper stale times
- **Error Handling**: Comprehensive error handling with retry logic

### Fixed API Issues
- **curl Command**: Fixed tokenId format issue (string vs number)
- **Validation**: Updated request validation schema
- **Error Responses**: Improved error messages and status codes

## 🚀 What's Been Integrated

### 1. GraphQL Client Setup
- **Apollo Client v3** configured with caching and error handling
- Environment-aware endpoints (development, testnet, production)
- Fallback endpoints for reliability
- Optimized cache policies for different query types

### 2. Centralized GraphQL Queries
Located in `src/queries/`:
- `getContractStats.ts` - Contract statistics and state
- `getUserMints.ts` - User's minting history
- `getUserClaims.ts` - User's prize claim history  
- `getRecentActivity.ts` - Recent global activity
- `getStateChanges.ts` - Contract state change history

### 3. Custom React Hooks
Located in `src/hooks/`:
- `useContractStats()` - Real-time contract statistics
- `useUserActivity()` - User's mints and claims with pagination
- `useRecentActivity()` - Recent global activity with formatting
- `useUserStats()` - Computed user statistics (win rate, totals, etc.)

### 4. Enhanced Components
- **ContractStats** - Displays contract statistics with animations
- **SubgraphActivity** - Real-time activity feed with mints and claims
- **Dashboard** - New dashboard page with comprehensive stats

### 5. Updated Pages
- **Index page** - Shows contract pause status and stats
- **Profile page** - Enhanced with subgraph user statistics
- **Leaderboard page** - Activity tab now uses subgraph data
- **Dashboard page** - New comprehensive dashboard page

## 📊 Data Flow

```
Subgraph → Apollo Client → React Hooks → Components → UI
```

### Real-time Features
- Contract statistics refresh every 10 seconds
- Activity feed refresh every 15 seconds
- Automatic cache invalidation and updates
- Error handling with retry logic

## 🔧 Configuration

### Environment Variables
Add these to your `.env.local`:

```bash
# Subgraph Configuration
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/YOUR_SUBGRAPH_ID
NEXT_PUBLIC_SUBGRAPH_API_KEY=your_api_key_here

# Environment Detection
NEXT_PUBLIC_NODE_ENV=production
NEXT_PUBLIC_NETWORK_ID=8453

# Fallback Endpoints
NEXT_PUBLIC_SUBGRAPH_BACKUP=https://api.thegraph.com/subgraphs/name/YOUR_USERNAME/scratch-card-nft

# Performance Settings
NEXT_PUBLIC_SUBGRAPH_CACHE_TIME=30000
NEXT_PUBLIC_SUBGRAPH_RETRY_ATTEMPTS=3
NEXT_PUBLIC_SUBGRAPH_POLL_INTERVAL=5000
```

### Subgraph Endpoints
The client automatically detects environment and uses appropriate endpoint:
- **Development**: `http://localhost:8000/subgraphs/name/scratch-card-nft/graphql`
- **Testnet**: `https://api.studio.thegraph.com/query/YOUR_TESTNET_ID`
- **Production**: `https://api.studio.thegraph.com/query/YOUR_MAINNET_ID`

## 🎯 Usage Examples

### Contract Statistics
```typescript
import { useContractStats } from '~/hooks';

function MyComponent() {
  const { formattedStats, loading, isPaused } = useContractStats();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <p>Total Minted: {formattedStats?.totalMinted}</p>
      <p>Card Price: {formattedStats?.currentPrice} ETH</p>
      {isPaused && <p>Contract is paused</p>}
    </div>
  );
}
```

### User Activity
```typescript
import { useUserActivity } from '~/hooks';

function UserActivity() {
  const { mints, claims, loading, loadMore } = useUserActivity();
  
  return (
    <div>
      <h3>Your Mints ({mints.length})</h3>
      {mints.map(mint => (
        <div key={mint.id}>
          Minted {mint.quantity} cards for {mint.totalPrice}
        </div>
      ))}
      
      <h3>Your Claims ({claims.length})</h3>
      {claims.map(claim => (
        <div key={claim.id}>
          Won {claim.prizeAmount} ETH
        </div>
      ))}
      
      <button onClick={loadMore}>Load More</button>
    </div>
  );
}
```

### Recent Activity
```typescript
import { useRecentActivity } from '~/hooks';

function RecentActivity() {
  const { recentMints, recentClaims, loading } = useRecentActivity();
  
  return (
    <div>
      <h3>Recent Mints</h3>
      {recentMints.map(mint => (
        <div key={mint.id}>
          {mint.truncatedAddress} minted {mint.quantity} cards {mint.formattedTime}
        </div>
      ))}
      
      <h3>Recent Claims</h3>
      {recentClaims.map(claim => (
        <div key={claim.id}>
          {claim.truncatedAddress} won {claim.formattedPrize} {claim.formattedTime}
        </div>
      ))}
    </div>
  );
}
```

## 🔄 Migration Notes

### From Database to Subgraph
The application now uses both database and subgraph data:

1. **User Authentication & Cards**: Still uses database/supabase
2. **Historical Activity**: Now uses subgraph for real-time data
3. **Contract Statistics**: Now uses subgraph for live data
4. **User Statistics**: Enhanced with subgraph data

### Benefits
- ✅ **Real-time updates** - No more polling delays
- ✅ **Better performance** - Optimized GraphQL queries
- ✅ **Reliability** - Multiple fallback endpoints
- ✅ **Scalability** - Efficient pagination and caching
- ✅ **Rich data** - Complete transaction history

## 🛠️ Development

### Adding New Queries
1. Create query file in `src/queries/`
2. Export from `src/queries/index.ts`
3. Create hook in `src/hooks/`
4. Export from `src/hooks/index.ts`

### Testing Subgraph Integration
```bash
# Start development server
npm run dev

# Test with local subgraph
# Make sure local subgraph is running on http://localhost:8000

# Build for production
npm run build:raw
```

## 📈 Performance Optimizations

### Caching Strategy
- **Contract stats**: 30-second cache with polling
- **User activity**: Pagination with merge strategy
- **Recent activity**: 15-second refresh interval

### Error Handling
- Automatic retry with exponential backoff
- Fallback endpoints on failure
- Graceful degradation to database data

### Bundle Optimization
- Tree-shaking for unused queries
- Code splitting for large datasets
- Lazy loading for activity feeds

## 🔍 Monitoring

### Health Checks
The client includes built-in health monitoring:
- Latency tracking
- Error rate monitoring
- Endpoint availability checks

### Debug Mode
Set `NODE_ENV=development` for:
- Detailed error logging
- Query performance metrics
- Cache hit/miss statistics

## 🚨 Troubleshooting

### Common Issues

1. **Apollo Import Errors**
   ```bash
   npm install @apollo/client@^3.8.8
   ```

2. **Subgraph Connection Issues**
   - Check `NEXT_PUBLIC_SUBGRAPH_URL` environment variable
   - Verify subgraph is deployed and accessible
   - Check network connectivity

3. **Missing Data**
   - Verify subgraph has synced latest blocks
   - Check contract events are being indexed
   - Validate query filters and parameters

### Debug Tools
- Apollo DevTools browser extension
- GraphQL Playground for query testing
- Network tab for request inspection

## 📚 Additional Resources

- [Apollo Client Documentation](https://www.apollographql.com/docs/react/)
- [The Graph Documentation](https://thegraph.com/docs/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)

---

This integration provides a robust, scalable foundation for real-time blockchain data in your Scratch Card NFT application! 🎉