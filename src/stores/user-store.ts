import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { User } from '~/app/interface/user';
import { BestFriend } from '~/app/interface/bestFriends';

export interface UserStore {
  // User State
  hasProvider: boolean;
  publicKey: string;
  user: User | null;
  bestFriends: BestFriend[];
  
  // Actions
  setHasProvider: (hasProvider: boolean) => void;
  setPublicKey: (publicKey: string) => void;
  setUser: (user: User | null) => void;
  setBestFriends: (bestFriends: BestFriend[]) => void;
}

export const useUserStore = create<UserStore>()(
  devtools(
    (set) => ({
      // Initial state
      hasProvider: false,
      publicKey: '',
      user: null,
      bestFriends: [],

      // Actions
      setHasProvider: (hasProvider) => set({ hasProvider }),
      setPublicKey: (publicKey) => set({ publicKey }),
      setUser: (user) => set({ user }),
      setBestFriends: (bestFriends) => set({ bestFriends }),
    }),
    {
      name: 'user-store',
    }
  )
);