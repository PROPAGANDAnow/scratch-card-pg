# Neynar API Documentation

## Overview
Neynar simplifies building decentralized social applications on the Farcaster protocol, providing easy access to Farcaster data and APIs through its SDKs.

## Installation

### Node.js/TypeScript SDK
```bash
yarn add @neynar/nodejs-sdk
# or
npm install @neynar/nodejs-sdk
```

### Other SDKs
- **Rust SDK**: `cargo add --git https://github.com/neynarxyz/rust-sdk api`
- **Go SDK**: `go get github.com/neynarxyz/go-sdk/generated/rust_sdk`

## Quick Start

### Initialize Client
```typescript
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

const config = new Configuration({
  apiKey: "YOUR_NEYNAR_API_KEY"
});

const client = new NeynarAPIClient(config);
```

### SDK v1 to v2 Migration
```typescript
// v1 (deprecated)
const client = new NeynarAPIClient("API_KEY", {
  baseOptions: {
    headers: {
      "x-neynar-experimental": true,
    },
  },
});

// v2 (current)
const config = new Configuration({
  apiKey: "API_KEY",
  baseOptions: {
    headers: {
      "x-neynar-experimental": true,
    },
  },
});

const client = new NeynarAPIClient(config);
```

## Core Features

### User Operations
- User lookup by FID, address, username
- Bulk user operations
- Follower/following management
- Profile information and verification

### Cast Operations
- Create and publish casts
- Lookup casts by hash or URL
- Cast conversations and threads
- Embed handling (images, URLs, other casts)

### Feed Management
- User feeds
- Trending casts
- Channel feeds
- Custom feed filtering

### Channel Operations
- Channel information
- Channel followers
- Channel moderation

### Real-time Events
- Webhook support for mentions
- Cast creation events
- Real-time notifications

## TypeScript Configuration

### tsconfig.json
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node",
    "target": "ESNext",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "ts-node": {
    "esm": true
  }
}
```

### package.json
```json
{
  "scripts": {
    "start": "node --loader ts-node/esm index.ts"
  },
  "type": "module",
  "dependencies": {
    "@neynar/nodejs-sdk": "^2.0.5",
    "ts-node": "^10.9.2",
    "typescript": "^5.6.3"
  }
}
```

## API Examples

### Fetch User Feed
```typescript
const feed = await client.fetchFeed({
  fid: 19960,
  limit: 10
});

console.log(feed);
```

### Look Up User by Address
```typescript
const users = await client.fetchBulkUsersByEthOrSolAddress({
  addresses: ["0xBFc7CAE0Fad9B346270Ae8fde24827D2D779eF07"],
  addressTypes: ["verified_address"]
});

console.log(users);
```

### Webhook Event Handling
```javascript
// Example webhook payload for cast.created event
{
  created_at: 1708025006,
  type: "cast.created",
  data: {
    object: "cast",
    hash: "0xfe7908021a4c0d36d5f7359975f4bf6eb9fbd6f2",
    author: {
      fid: 234506,
      username: "balzgolf",
      display_name: "Balzgolf"
    },
    text: "@neynar LFG",
    timestamp: "2024-02-15T19:23:22.000Z"
  }
}
```

### Fetch Channel Followers
```bash
curl --request GET \
  --url https://api.neynar.com/v2/farcaster/channel/followers/ \
  --header 'x-api-key: <api-key>'
```

### Custom Feed Filters
```javascript
const provider_metadata = encodeURIComponent(JSON.stringify({
  "filters": {
    "channels": ["https://warpcast.com/~/channel/neynar"],
    "languages": ["en"],
    "author_ids": ["194", "191"],
    "frames_only": false,
    "embed_domains": ["neynar.com", "frames.neynar.com"],
    "ai_labels": ["science_technology"]
  }
}));

const url = `https://api.neynar.com/v2/farcaster/feed/for_you?fid=3&viewer_fid=2&provider=mbd&limit=10&provider_metadata=${provider_metadata}`;
```

## Response Structures

### User Object
```json
{
  "object": "user",
  "fid": 19960,
  "username": "shreyas-chorge",
  "display_name": "Shreyas",
  "pfp_url": "https://i.imgur.com/LPzRlQl.jpg",
  "custody_address": "0xd1b702203b1b3b641a699997746bd4a12d157909",
  "profile": {
    "bio": {
      "text": "Everyday regular normal guy | 👨‍💻 @neynar ..."
    },
    "location": {
      "latitude": 19.22,
      "longitude": 72.98,
      "address": {
        "city": "Thane",
        "state": "Maharashtra",
        "country": "India",
        "country_code": "in"
      }
    }
  },
  "follower_count": 250,
  "following_count": 92,
  "verifications": ["0xd1b702203b1b3b641a699997746bd4a12d157909"],
  "verified_addresses": {
    "eth_addresses": ["0xd1b702203b1b3b641a699997746bd4a12d157909"],
    "sol_addresses": []
  },
  "power_badge": false,
  "viewer_context": {
    "following": true,
    "followed_by": true,
    "blocking": false,
    "blocked_by": false
  }
}
```

### Cast Object
```json
{
  "object": "cast",
  "hash": "0xd9993ef80c1a7f75c6f75de3b79bc8a18de89a30",
  "author": { /* user object */ },
  "thread_hash": "0xd9993ef80c1a7f75c6f75de3b79bc8a18de89a30",
  "parent_hash": null,
  "parent_url": null,
  "text": "👀",
  "timestamp": "2024-11-22T17:39:21.000Z",
  "embeds": [
    {
      "cast_id": {
        "fid": 880094,
        "hash": "0x82e6e0e20539578dcb7e03addb94f3a7f7491c49"
      },
      "cast": { /* embedded cast object */ }
    }
  ],
  "channel": null,
  "reactions": {
    "likes_count": 0,
    "recasts_count": 0,
    "likes": [],
    "recasts": []
  },
  "replies": {
    "count": 0
  },
  "mentioned_profiles": [],
  "viewer_context": {
    "liked": false,
    "recasted": false
  }
}
```

## Authorization

### API Headers
```
x-api-key: YOUR_NEYNAR_API_KEY
x-neynar-experimental: true (optional, for experimental features)
```

### Query Parameters
Common parameters across endpoints:
- `fid`: Farcaster ID
- `viewer_fid`: ID of the viewing user for context
- `limit`: Number of results to return
- `cursor`: Pagination cursor

## Additional Tools

### Data Ingestion
```bash
# Install required tools
brew install awscli parquet-cli

# For data analysis and ingestion workflows
```

### Frontend Integration
```bash
# For Sign-in with Ethereum integration
yarn add siwe viem @neynar/nodejs-sdk
```

## Getting Started Project Structure
```
get-started-with-neynar-sdk/
├── package.json
├── tsconfig.json
├── index.ts
└── node_modules/
```

## Useful Links
- [Official Neynar Docs](https://docs.neynar.com)
- [NodeJS SDK GitHub](https://github.com/neynarxyz/nodejs-sdk)
- [Rust SDK GitHub](https://github.com/neynarxyz/rust-sdk)
- [Go SDK GitHub](https://github.com/neynarxyz/go-sdk)
- [Farcaster Protocol](https://www.farcaster.xyz/)