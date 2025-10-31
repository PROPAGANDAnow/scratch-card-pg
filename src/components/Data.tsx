'use client'
import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'

const query = gql`
  {
    contracts(first: 5) {
      id
      owner
      signerAddress
      paymentToken
    }
    users(first: 5) {
      id
      totalTokensOwned
      totalSpent
      totalPrizesWon
    }
  }
`

const url = 'https://gateway.thegraph.com/api/subgraphs/id/Go4V8UMVoFXFSoRsMHpFVmdQD9dcFDQojWzxNFZUmxTp'
const headers = { Authorization: 'Bearer ' + process.env.SUBGRAPH_API_KEY }

export default function Data() {
  // the data is already pre-fetched on the server and immediately available here,
  // without an additional network call
  const { data } = useQuery({
    queryKey: ['data'],
    async queryFn() {
      return await request(url, query, {}, headers)
    }
  })

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Subgraph Data</h2>
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(data ?? {}, null, 2)}
      </pre>
    </div>
  )
}