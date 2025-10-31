import { gql } from '~/lib/graphql-client'

export const GET_USER_TOKENS = gql`
  query GetUserTokens($userAddress: Bytes!) {
    tokens(
      where: { owner: $userAddress }
      orderBy: mintedAt
      orderDirection: desc
      first: 50
    ) {
      id
      owner
      contract
      batchId
      prizeToken
      prizeAmount
      claimed
      mintedAt
      claimedAt
      stateChanges {
        id
        state
        timestamp
      }
    }
  }
`

export const GET_USER_AVAILABLE_CARDS = gql`
  query GetUserAvailableCards($userAddress: Bytes!) {
    tokens(
      where: {
        owner: $userAddress
        claimed: false
      }
      orderBy: mintedAt
      orderDirection: desc
      first: 50
    ) {
      id
      owner
      contract
      batchId
      prizeToken
      prizeAmount
      claimed
      mintedAt
      claimedAt
      stateChanges {
        id
        state
        timestamp
      }
    }
  }
`