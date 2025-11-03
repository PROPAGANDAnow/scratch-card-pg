// Types for Alchemy NFT API response

export interface AlchemyImage {
  cachedUrl: string;
  thumbnailUrl: string;
  pngUrl: string;
  contentType: string;
  size: number;
  originalUrl: string;
}

export interface AlchemyMetadata {
  image?: string;
  name?: string;
  description?: string;
  attributes?: Array<{
    value: string;
    trait_type: string;
  }>;
  external_url?: string;
}

export interface AlchemyRaw {
  tokenUri: string;
  metadata: AlchemyMetadata;
  error: Record<string, unknown>;
}

export interface AlchemyContract {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string | Record<string, unknown>;
  tokenType: string;
  contractDeployer: string;
  deployedBlockNumber: number;
  isSpam: Record<string, unknown>;
  spamClassifications: unknown[];
  openSeaMetadata: {
    floorPrice: number | null;
    collectionName: string;
    safelistRequestStatus: string;
    imageUrl: string;
    description: string;
    externalUrl: string;
    twitterUsername: string | null;
    discordUrl: string | null;
    lastIngestedAt: string;
  };
}

export interface OwnedNft {
  contract: AlchemyContract;
  tokenId: string;
  tokenType: string;
  name: string | Record<string, unknown>;
  description: string | Record<string, unknown>;
  image: AlchemyImage | Record<string, unknown>;
  raw: AlchemyRaw;
  tokenUri: string;
  timeLastUpdated: string;
  balance: string;
}

export interface ValidAt {
  blockNumber: number;
  blockHash: string;
  blockTimestamp: string;
}

export interface AlchemyNftResponse {
  ownedNfts: OwnedNft[];
  totalCount: number;
  pageKey: Record<string, unknown>;
  validAt: ValidAt;
}