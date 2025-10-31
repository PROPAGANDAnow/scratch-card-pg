import { gql } from '~/lib/graphql-client'

export const GET_CONTRACT_STATS = gql`
  query GetContractStats {
    contracts(first: 1) {
      id
      totalTokensMinted
      totalPrizesClaimed
      totalPrizesDistributed
      cardPrice
      paused
      paymentToken
      maxBatchSize
      createdAt
      updatedAt
    }
  }
`