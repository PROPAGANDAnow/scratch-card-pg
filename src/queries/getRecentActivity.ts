import { gql } from '@apollo/client'

export const GET_RECENT_ACTIVITY = gql`
  query GetRecentActivity($first: Int = 10) {
    mintOperations(
      orderBy: timestamp
      orderDirection: desc
      first: $first
    ) {
      id
      buyer
      quantity
      totalPrice
      timestamp
      transactionHash
      blockNumber
    }
    
    prizeClaims(
      orderBy: claimedAt
      orderDirection: desc
      first: $first
    ) {
      id
      tokenId
      winner
      prizeAmount
      claimedAt
      transactionHash
      blockNumber
    }
  }
`