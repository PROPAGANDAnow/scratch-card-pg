import { gql } from '@apollo/client'

export const GET_STATE_CHANGES = gql`
  query GetStateChanges($first: Int = 20) {
    contractStateChanges(
      orderBy: timestamp
      orderDirection: desc
      first: $first
    ) {
      id
      paused
      changedBy
      timestamp
      transactionHash
      blockNumber
    }
  }
`