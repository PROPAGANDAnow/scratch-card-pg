import { gql } from '~/lib/graphql-client'

export const GET_USER_CLAIMS = gql`
  query GetUserClaims($userAddress: Bytes!, $first: Int = 50, $skip: Int = 0) {
    prizeClaims(
      where: { winner: $userAddress }
      orderBy: claimedAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      tokenId
      winner
      prizeToken
      prizeAmount
      claimedAt
      claimedAtBlock
      transactionHash
      blockNumber
    }
  }
`