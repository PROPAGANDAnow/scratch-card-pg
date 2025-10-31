import { gql } from '~/lib/graphql-client'

export const GET_USER_MINTS = gql`
  query GetUserMints($userAddress: Bytes!, $first: Int = 50, $skip: Int = 0) {
    mintOperations(
      where: { buyer: $userAddress }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      buyer
      recipient
      quantity
      totalPrice
      timestamp
      transactionHash
      blockNumber
      isAdminMint
    }
  }
`