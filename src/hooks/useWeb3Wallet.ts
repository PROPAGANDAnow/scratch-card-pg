/**
 * Wallet Connection Hook
 * 
 * Integrates wallet functionality with the existing Farcaster Mini App
 * Provides wallet connection, account management, and network switching
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useChainId
} from 'wagmi';
import { base } from 'wagmi/chains';
import { Address } from 'viem';

/**
 * Wallet connection states
 */
export type WalletState = 'disconnected' | 'connecting' | 'connected' | 'wrong-network' | 'error';

/**
 * Web3 wallet hook return type
 */
export interface UseWeb3WalletReturn {
  /** Current wallet state */
  state: WalletState;

  /** Connected wallet address */
  address: Address | null;

  /** Current chain ID */
  chainId: number | null;

  /** Whether wallet is connected */
  isConnected: boolean;

  /** Connection error message */
  error: string | null;

  /** Connect wallet function */
  connect: () => Promise<void>;

  /** Disconnect wallet function */
  disconnect: () => void;

  /** Switch to Base network */
  switchToBase: () => Promise<void>;

  /** Truncated address for display */
  displayAddress: string | null;

  /** Whether we're on the correct network (Base) */
  isCorrectNetwork: boolean;
}

/**
 * Custom hook for Web3 wallet management
 * Integrates with existing Farcaster Mini App architecture
 */
export const useWallet = (): UseWeb3WalletReturn => {
  // Wagmi hooks
  const {
    address,
    isConnected,
    isConnecting,
    isDisconnected
  } = useAccount();

  const { connect: wagmiConnect, connectors } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const chainId = useChainId();

  // Local state
  const [state, setState] = useState<WalletState>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Check if we're on the correct network (Base)
  const isCorrectNetwork = useMemo(() => {
    return chainId === base.id;
  }, [chainId]);

  // Update state based on connection status
  useEffect(() => {
    if (isConnecting || isSwitchingChain) {
      setState('connecting');
      setError(null);
    } else if (isConnected && isCorrectNetwork) {
      setState('connected');
      setError(null);
    } else if (isConnected && !isCorrectNetwork) {
      setState('wrong-network');
      setError('Please switch to Base network');
    } else if (isDisconnected) {
      setState('disconnected');
      setError(null);
    }

    if (state !== 'connecting' && !isConnected && !isSwitchingChain) {
      connect()
    }
  }, [isConnected, isConnecting, isDisconnected, isCorrectNetwork, isSwitchingChain]);

  // Connect wallet function
  const connect = useCallback(async () => {
    try {
      setState('connecting');
      setError(null);

      await switchToBase();

      // Try to connect with available connectors
      // Prefer injected connectors (MetaMask, etc.)
      const farcasterConnector = connectors.find(c => c.id === 'farcaster');

      if (!farcasterConnector) {
        throw new Error('Farcaster connector not found');
      }

      await wagmiConnect({ connector: connectors[0] });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      setState('error');
      console.error('Wallet connection error:', err);
    }
  }, [wagmiConnect, connectors]);

  // Disconnect wallet function
  const disconnect = useCallback(() => {
    try {
      wagmiDisconnect();
      setState('disconnected');
      setError(null);
    } catch (err) {
      console.error('Wallet disconnect error:', err);
    }
  }, [wagmiDisconnect]);

  // Switch to Base network
  const switchToBase = useCallback(async () => {
    try {
      setState('connecting');
      console.log("🚀 ~ useWallet ~ base:", base)
      await switchChain({ chainId: base.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch network';
      setError(errorMessage);
      setState('error');
      console.error('Network switch error:', err);
    }
  }, [switchChain]);

  // Format address for display
  const displayAddress = useMemo(() => {
    if (!address) return null;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  return {
    state,
    address: address || null,
    chainId,
    isConnected,
    error,
    connect,
    disconnect,
    switchToBase,
    displayAddress,
    isCorrectNetwork,
  };
};

/**
 * Hook to get wallet connection status for UI decisions
 */
export const useWalletStatus = () => {
  const { state, isConnected, isCorrectNetwork, address } = useWallet();

  return {
    canTransact: isConnected && isCorrectNetwork && !!address,
    needsConnection: state === 'disconnected',
    needsNetworkSwitch: state === 'wrong-network',
    isLoading: state === 'connecting',
    hasError: state === 'error',
  };
};

/**
 * Hook to handle wallet connection for specific actions
 */
export const useWalletAction = () => {
  const { connect, switchToBase } = useWallet();
  const { needsConnection, needsNetworkSwitch } = useWalletStatus();

  const ensureWalletReady = useCallback(async (): Promise<boolean> => {
    if (needsConnection) {
      await connect();
      return false;
    }

    if (needsNetworkSwitch) {
      await switchToBase();
      return false;
    }

    return true;
  }, [connect, switchToBase, needsConnection, needsNetworkSwitch]);

  return {
    ensureWalletReady,
    needsConnection,
    needsNetworkSwitch,
  };
};