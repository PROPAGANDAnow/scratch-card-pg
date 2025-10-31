import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { GET_CONTRACT_STATS, GET_RECENT_ACTIVITY } from '~/queries'
import { makeGraphQLRequest } from '~/lib/graphql-client'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const queryClient = new QueryClient()

  // Prefetch contract stats
  await queryClient.prefetchQuery({
    queryKey: ['contractStats'],
    queryFn: () => makeGraphQLRequest(GET_CONTRACT_STATS),
  })

  // Prefetch recent activity
  await queryClient.prefetchQuery({
    queryKey: ['recentActivity', 10],
    queryFn: () => makeGraphQLRequest(GET_RECENT_ACTIVITY, { first: 10 }),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  )
}