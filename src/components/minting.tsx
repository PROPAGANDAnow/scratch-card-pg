/**
 * NFT Minting Component
 * 
 * Replaces traditional card buying with NFT minting
 * Integrates with existing Mini App UI and social features
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Address } from 'viem';
import { useContractMinting, useMintingCost } from '~/hooks/useContractMinting';
import { useWeb3Wallet, useWalletAction } from '~/hooks/useWeb3Wallet';
import { useMiniApp } from '@neynar/react';


interface MintingProps {
  /** Callback when minting is successful */
  onSuccess?: (tokenIds: bigint[]) => void;
  
  /** Callback when minting fails */
  onError?: (error: string) => void;
  
  /** Show quantity selector */
  showQuantitySelector?: boolean;
  
  /** Default quantity */
  defaultQuantity?: number;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * NFT minting component for scratch card NFTs
 * Replaces API-based card purchasing with smart contract minting
 */
export const Minting = ({
  onSuccess,
  onError,
  showQuantitySelector = true,
  defaultQuantity = 1,
  className = '',
}: MintingProps) => {
  // Web3 hooks
  const { isConnected, isCorrectNetwork } = useWeb3Wallet();
  const { ensureWalletReady } = useWalletAction();
  const { haptics } = useMiniApp();
  
  // Minting hooks
  const { 
    state: mintingState, 
    maxBatchSize, 
    mintCardsBatch,
    canMint,
    error: mintingError,
    reset: resetMinting
  } = useContractMinting();
  
  const { calculateCost, singleCardPrice } = useMintingCost();

  // Local state
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [recipient, setRecipient] = useState<Address | ''>('');
  const [showRecipient, setShowRecipient] = useState(false);

  // Calculate total cost
  const totalCost = useMemo(() => {
    return calculateCost(quantity);
  }, [calculateCost, quantity]);

  // Can mint based on wallet state and minting state
  const canProceed = useMemo(() => {
    return isConnected && isCorrectNetwork && canMint && quantity > 0;
  }, [isConnected, isCorrectNetwork, canMint, quantity]);

  // Handle minting
  const handleMint = useCallback(async () => {
    try {
      // Ensure wallet is ready
      const walletReady = await ensureWalletReady();
      if (!walletReady) return;

      // Validate quantity
      if (quantity <= 0 || quantity > maxBatchSize) {
        throw new Error(`Quantity must be between 1 and ${maxBatchSize}`);
      }

      // Mint cards
      await mintCardsBatch(
        quantity, 
        recipient || undefined
      );

      // Haptic feedback
      haptics.impactOccurred('medium');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Minting failed';
      console.error('Minting error:', error);
      onError?.(errorMessage);
    }
  }, [
    ensureWalletReady, 
    quantity, 
    maxBatchSize, 
    recipient, 
    mintCardsBatch, 
    haptics, 
    onError
  ]);

  // Handle success
  useEffect(() => {
    if (mintingState === 'success') {
      haptics.notificationOccurred('success');
      onSuccess?.([]); // TODO: Get actual token IDs from events
      
      // Reset after delay
      setTimeout(() => {
        resetMinting();
        setQuantity(defaultQuantity);
      }, 2000);
    }
  }, [mintingState, haptics, onSuccess, resetMinting, defaultQuantity]);

  // Handle errors
  useEffect(() => {
    if (mintingError) {
      haptics.notificationOccurred('error');
      onError?.(mintingError);
    }
  }, [mintingError, haptics, onError]);

  // Quantity increment/decrement
  const incrementQuantity = () => {
    setQuantity(prev => Math.min(prev + 1, maxBatchSize));
  };

  const decrementQuantity = () => {
    setQuantity(prev => Math.max(prev - 1, 1));
  };

  return (
    <motion.div
      className={`bg-black/40 backdrop-blur-sm rounded-2xl p-6 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Mint Scratch Cards</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-xs text-white/60">Live on Base</span>
        </div>
      </div>

      {/* Price Display */}
      <div className="bg-white/10 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-white/60">Price per card</span>
          <span className="text-2xl font-bold text-white">
            {singleCardPrice} USDC
          </span>
        </div>
      </div>

      {/* Quantity Selector */}
      {showQuantitySelector && (
        <div className="mb-6">
          <label className="text-sm text-white/60 mb-2 block">Quantity</label>
          <div className="flex items-center gap-4">
            <motion.button
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
              onClick={decrementQuantity}
              disabled={quantity <= 1}
              whileHover={{ scale: quantity > 1 ? 1.1 : 1 }}
              whileTap={{ scale: quantity > 1 ? 0.9 : 1 }}
            >
              -
            </motion.button>
            
            <div className="flex-1 text-center">
              <span className="text-3xl font-bold text-white">{quantity}</span>
            </div>
            
            <motion.button
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
              onClick={incrementQuantity}
              disabled={quantity >= maxBatchSize}
              whileHover={{ scale: quantity < maxBatchSize ? 1.1 : 1 }}
              whileTap={{ scale: quantity < maxBatchSize ? 0.9 : 1 }}
            >
              +
            </motion.button>
          </div>
          
          <div className="text-xs text-white/40 mt-2 text-center">
            Max batch size: {maxBatchSize}
          </div>
        </div>
      )}

      {/* Recipient Input */}
      <div className="mb-6">
        <motion.button
          className="flex items-center gap-2 text-sm text-white/60 mb-2"
          onClick={() => setShowRecipient(!showRecipient)}
          whileHover={{ scale: 1.05 }}
        >
          <Image
            src="/assets/profile-icon.svg"
            alt="Gift"
            width={16}
            height={16}
            className="filter brightness-0 invert"
          />
          Mint as gift
        </motion.button>
        
        <AnimatePresence>
          {showRecipient && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <input
                type="text"
                placeholder="Recipient address (0x...)"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value as Address)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Total Cost */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-white/60">Total Cost</span>
          <span className="text-2xl font-bold text-white">
            {totalCost} USDC
          </span>
        </div>
      </div>

      {/* Minting Status */}
      <AnimatePresence>
        {mintingState !== 'idle' && (
          <motion.div
            className={`rounded-xl p-4 mb-6 ${
              mintingState === 'success' 
                ? 'bg-green-500/20 text-green-400' 
                : mintingState === 'error'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center gap-3">
              {mintingState === 'pending' && (
                <motion.div
                  className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              )}
              
              {mintingState === 'success' && (
                <Image
                  src="/assets/win-icon.svg"
                  alt="Success"
                  width={20}
                  height={20}
                />
              )}
              
              {mintingState === 'error' && (
                <Image
                  src="/assets/cross-icon.svg"
                  alt="Error"
                  width={20}
                  height={20}
                />
              )}
              
              <div>
                <div className="font-medium">
                  {mintingState === 'pending' && 'Minting...'}
                  {mintingState === 'confirming' && 'Confirming...'}
                  {mintingState === 'success' && 'Minting Successful!'}
                  {mintingState === 'error' && 'Minting Failed'}
                </div>
                
                {mintingState === 'success' && (
                  <div className="text-sm opacity-80">
                    Your scratch cards are ready!
                  </div>
                )}
                
                {mintingError && (
                  <div className="text-sm opacity-80">
                    {mintingError}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mint Button */}
      <motion.button
        className={`
          w-full py-3 rounded-full font-semibold text-white transition-all duration-200
          ${canProceed 
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' 
            : 'bg-gray-500 cursor-not-allowed'
          }
        `}
        onClick={handleMint}
        disabled={!canProceed || mintingState === 'pending' || mintingState === 'confirming'}
        whileHover={canProceed ? { scale: 1.02 } : {}}
        whileTap={canProceed ? { scale: 0.98 } : {}}
      >
        {mintingState === 'pending' && 'Minting...'}
        {mintingState === 'confirming' && 'Confirming...'}
        {mintingState === 'success' && 'Minted Successfully!'}
        {mintingState === 'error' && 'Try Again'}
        {mintingState === 'idle' && (
          !isConnected ? 'Connect Wallet' :
          !isCorrectNetwork ? 'Switch to Base' :
          `Mint ${quantity} Card${quantity > 1 ? 's' : ''}`
        )}
      </motion.button>

      {/* Wallet Info */}
      {!isConnected && (
        <div className="text-center mt-4">
          <p className="text-sm text-white/60">
            Connect your wallet to start minting
          </p>
        </div>
      )}
      
      {isConnected && !isCorrectNetwork && (
        <div className="text-center mt-4">
          <p className="text-sm text-orange-400">
            Please switch to Base network
          </p>
        </div>
      )}
    </motion.div>
  );
};