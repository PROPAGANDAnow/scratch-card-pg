import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AppStats } from '~/app/interface/appStats';
import { Reveal } from '~/app/interface/reveal';
import { LeaderboardEntry } from '~/app/interface/api';

export interface AppStore {
  // UI State
  appBackground: string;
  appColor: string;
  isInMiniApp: boolean;
  swipableMode: boolean;
  
  // App Data
  appStats: AppStats | null;
  leaderboard: LeaderboardEntry[];
  activity: Reveal[];
  
  // Actions
  setAppBackground: (background: string) => void;
  setAppColor: (color: string) => void;
  setIsInMiniApp: (isInMiniApp: boolean) => void;
  setSwipableMode: (swipableMode: boolean) => void;
  setAppStats: (appStats: AppStats | null) => void;
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  setActivity: (activity: Reveal[]) => void;
}

export const useAppStore = create<AppStore>()(
  devtools(
    (set) => ({
      // Initial state
      appBackground: 'linear-gradient(to bottom, #090210, #7727DE)',
      appColor: '#7727DE',
      isInMiniApp: false,
      swipableMode: false,
      appStats: null,
      leaderboard: [],
      activity: [],

      // Actions
      setAppBackground: (background) => set({ appBackground: background }),
      setAppColor: (color) => set({ appColor: color }),
      setIsInMiniApp: (isInMiniApp) => set({ isInMiniApp }),
      setSwipableMode: (swipableMode) => set({ swipableMode }),
      setAppStats: (appStats) => set({ appStats }),
      setLeaderboard: (leaderboard) => set({ leaderboard }),
      setActivity: (activity) => set({ activity }),
    }),
    {
      name: 'app-store',
    }
  )
);