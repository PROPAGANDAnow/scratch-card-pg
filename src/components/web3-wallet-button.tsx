/**
 * Web3 Wallet Connection Button
 * 
 * Integrates wallet connection with existing Farcaster Mini App UI
 * Provides connection status and network switching
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useWeb3Wallet, useWalletStatus } from '~/hooks/useWeb3Wallet';

interface Web3WalletButtonProps {
  /** Additional CSS classes */
  className?: string;
  
  /** Show connection status text */
  showStatus?: boolean;
  
  /** Custom button text */
  buttonText?: string;
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Click handler */
  onClick?: () => void;
}

/**
 * Web3 wallet connection button component
 * Integrates with existing Mini App design system
 */
export const Web3WalletButton = ({
  className = '',
  showStatus = true,
  buttonText,
  size = 'md',
  onClick,
}: Web3WalletButtonProps) => {
  const { 
    state, 
    address, 
    displayAddress, 
    connect, 
    switchToBase
  } = useWeb3Wallet();
  
  const { 
    needsConnection, 
    needsNetworkSwitch, 
    isLoading 
  } = useWalletStatus();

  // Size configurations
  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-base';
    }
  }, [size]);

  // Button text based on state
  const getButtonText = () => {
    if (buttonText) return buttonText;
    
    switch (state) {
      case 'connecting':
        return 'Connecting...';
      case 'wrong-network':
        return 'Switch to Base';
      case 'connected':
        return displayAddress || 'Connected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Connect Wallet';
    }
  };

  // Button styling based on state
  const getButtonStyles = () => {
    const baseClasses = `
      ${sizeClasses}
      rounded-full
      font-semibold
      transition-all
      duration-200
      flex
      items-center
      justify-center
      gap-2
      ${className}
    `;

    switch (state) {
      case 'connecting':
        return `${baseClasses} bg-gray-500 text-white cursor-not-allowed`;
      case 'wrong-network':
        return `${baseClasses} bg-orange-500 text-white hover:bg-orange-600`;
      case 'connected':
        return `${baseClasses} bg-green-500 text-white hover:bg-green-600`;
      case 'error':
        return `${baseClasses} bg-red-500 text-white hover:bg-red-600`;
      default:
        return `${baseClasses} bg-purple-500 text-white hover:bg-purple-600`;
    }
  };

  // Handle button click
  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (needsConnection) {
      connect();
    } else if (needsNetworkSwitch) {
      switchToBase();
    }
  };

  // Status indicator
  const StatusIndicator = () => {
    if (!showStatus) return null;

    const getStatusColor = () => {
      switch (state) {
        case 'connected':
          return 'bg-green-500';
        case 'connecting':
          return 'bg-yellow-500';
        case 'wrong-network':
          return 'bg-orange-500';
        case 'error':
          return 'bg-red-500';
        default:
          return 'bg-gray-500';
      }
    };

    const getStatusText = () => {
      switch (state) {
        case 'connected':
          return 'Connected';
        case 'connecting':
          return 'Connecting';
        case 'wrong-network':
          return 'Wrong Network';
        case 'error':
          return 'Error';
        default:
          return 'Disconnected';
      }
    };

    return (
      <div className="flex items-center gap-2 text-xs text-white/80">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span>{getStatusText()}</span>
      </div>
    );
  };

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.button
        className={getButtonStyles()}
        onClick={handleClick}
        disabled={isLoading}
        whileHover={{ scale: isLoading ? 1 : 1.05 }}
        whileTap={{ scale: isLoading ? 1 : 0.95 }}
        transition={{ duration: 0.1 }}
      >
        {/* Wallet icon */}
        {state !== 'connected' && (
          <Image
            src="/assets/profile-icon.svg"
            alt="Wallet"
            width={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
            height={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
            className="filter brightness-0 invert"
          />
        )}
        
        {/* Connected indicator */}
        {state === 'connected' && (
          <div className="w-2 h-2 bg-white rounded-full" />
        )}
        
        {/* Button text */}
        <span>{getButtonText()}</span>
        
        {/* Loading spinner */}
        {isLoading && (
          <motion.div
            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </motion.button>
      
      {/* Status text */}
      <StatusIndicator />
      
      {/* Network warning */}
      {state === 'wrong-network' && (
        <motion.p
          className="text-xs text-orange-400 text-center max-w-[200px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Please switch to Base network to continue
        </motion.p>
      )}
      
      {/* Connected address */}
      {state === 'connected' && address && (
        <motion.p
          className="text-xs text-white/60 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {address}
        </motion.p>
      )}
    </motion.div>
  );
};

/**
 * Compact wallet button for tight spaces
 */
export const CompactWalletButton = () => {
  const { state, displayAddress, connect, switchToBase } = useWeb3Wallet();
  const { needsConnection, needsNetworkSwitch } = useWalletStatus();

  const handleClick = () => {
    if (needsConnection) {
      connect();
    } else if (needsNetworkSwitch) {
      switchToBase();
    }
  };

  const getButtonColor = () => {
    switch (state) {
      case 'connected':
        return 'bg-green-500/20 border-green-500 text-green-400';
      case 'connecting':
        return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      case 'wrong-network':
        return 'bg-orange-500/20 border-orange-500 text-orange-400';
      case 'error':
        return 'bg-red-500/20 border-red-500 text-red-400';
      default:
        return 'bg-purple-500/20 border-purple-500 text-purple-400';
    }
  };

  return (
    <motion.button
      className={`
        px-3 py-1.5 
        rounded-full 
        border 
        text-xs 
        font-medium
        transition-all
        duration-200
        ${getButtonColor()}
      `}
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {state === 'connected' ? displayAddress : 'Connect'}
    </motion.button>
  );
};