'use client'

import { useMemo } from 'react'
import { useUserActivity } from './useUserActivity'
import { formatEther } from 'viem'

export interface UserStats {
  totalMinted: number
  totalSpent: string
  totalWon: string
  averageCardPrice: string
  winRate: number
  lastActivity: Date | null
  totalClaims: number
}

export function useUserStats(): UserStats {
  const { mints, claims } = useUserActivity()

  const stats = useMemo(() => {
    const totalMinted = mints.reduce((sum, mint) => sum + Number(mint.quantity), 0)
    const totalSpent = mints.reduce((sum, mint) => {
      return BigInt(sum) + BigInt(mint.totalPrice)
    }, BigInt(0))
    const totalWon = claims.reduce((sum, claim) => {
      return BigInt(sum) + BigInt(claim.prizeAmount)
    }, BigInt(0))
    
    const averageCardPrice = totalMinted > 0 ? totalSpent / BigInt(totalMinted) : BigInt(0)
    const winRate = totalMinted > 0 ? (claims.length / totalMinted) * 100 : 0
    
    const allTimestamps = [
      ...mints.map(m => Number(m.timestamp)),
      ...claims.map(c => Number(c.claimedAt))
    ]
    const lastActivity = allTimestamps.length > 0 
      ? new Date(Math.max(...allTimestamps) * 1000) 
      : null

    return {
      totalMinted,
      totalSpent: formatEther(totalSpent),
      totalWon: formatEther(totalWon),
      averageCardPrice: formatEther(averageCardPrice),
      winRate: Math.round(winRate * 100) / 100,
      lastActivity,
      totalClaims: claims.length,
    }
  }, [mints, claims])

  return stats
}