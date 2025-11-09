/**
 * NFT Minting Component
 * 
 * Replaces traditional card buying with NFT minting
 * Integrates with existing Mini App UI and social features
 */

'use client';

import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useMiniApp } from '@neynar/react';
import { useContractMinting, useMintingCost } from '~/hooks/useContractMinting';
import { useWallet, useWalletAction } from '~/hooks/useWeb3Wallet';
import { useCardStore } from '~/stores';


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

  /** Auto-close modal after success (default: true) */
  autoClose?: boolean;
}

/**
 * NFT minting component for scratch card NFTs
 * Replaces API-based card purchasing with smart contract minting
 */
export const MintCardForm = ({
  onSuccess,
  onError,
  showQuantitySelector = true,
  defaultQuantity = 1,
  className = '',
  autoClose = true,
}: MintingProps) => {
  // Web3 hooks
  const { isConnected, isCorrectNetwork, address } = useWallet();
  const { ensureWalletReady } = useWalletAction();
  const { haptics } = useMiniApp();
  const { refetchCards, setMinting } = useCardStore()

  // Minting hooks
  const {
    state: mintingState,
    maxBatchSize,
    mintCardsBatch,
    canMint,
    error: mintingError,
    approval,
  } = useContractMinting(address);

  const { calculateCost, singleCardPrice } = useMintingCost();

  // Local state
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [mintingStatus, setMintingStatus] = useState<string | null>(null);

  // Calculate total cost
  const totalCost = useMemo(() => {
    return calculateCost(quantity);
  }, [calculateCost, quantity]);

  // Can proceed with batched approval + minting
  const canProceed = useMemo(() => {
    return isConnected && isCorrectNetwork && canMint && quantity > 0;
  }, [isConnected, isCorrectNetwork, canMint, quantity]);

  // Update status based on approval state
  useEffect(() => {
    if (approval.state === 'pending') {
      setMintingStatus('Approving USDC...');
    } else if (approval.state === 'confirming') {
      setMintingStatus('Confirming approval...');
    }
  }, [approval.state]);

  // Update status based on minting state
  useEffect(() => {
    if (mintingState === 'pending') {
      setMintingStatus('Minting cards...');
    } else if (mintingState === 'confirming') {
      setMintingStatus('Checking onchain...');
    }
  }, [mintingState]);

  // Handle batched approval + minting
  const handleMint = useCallback(async () => {
    try {
      // Ensure wallet is ready
      const walletReady = await ensureWalletReady();
      if (!walletReady) return;

      // Validate quantity
      if (quantity <= 0 || quantity > maxBatchSize) {
        throw new Error(`Quantity must be between 1 and ${maxBatchSize}`);
      }

      // Let hook manage approval per-amount with 0.2 USDC buffer
      console.log("🚀 ~ MintCardForm ~ approval:", approval)

      if (!address) return

      console.log("🚀 ~ MintCardForm ~ address:", address)
      setMinting(true)
      
      // The approval and minting status will be automatically updated by useEffect hooks above
      // Mint cards (this includes approval inside)
      await mintCardsBatch(
        quantity,
        address
      );

      // After minting completes, show adding cards status
      setMintingStatus('Adding cards...')
      
      // Retry logic for fetching cards (Alchemy may take a few seconds to index)
      const retries = 3;
      let lastCardCount = 0;
      
      for (let i = 0; i < retries; i++) {
        // Wait before each attempt (first attempt after 2s, then 2s between retries)
        await new Promise(res => setTimeout(res, 2000))
        
        // Get current card count before refetch
        const currentCards = useCardStore.getState().cards;
        lastCardCount = currentCards.length;
        
        // Refetch cards from API
        await refetchCards()
        
        // Check if new cards were added
        const newCards = useCardStore.getState().cards;
        if (newCards.length > lastCardCount) {
          console.log(`✅ Successfully fetched ${newCards.length - lastCardCount} new cards`);
          break;
        }
        
        if (i < retries - 1) {
          console.log(`⏳ Retrying card fetch (${i + 1}/${retries})...`);
        }
      }

      setMintingStatus('Complete!')
      // Haptic feedback
      haptics.impactOccurred('medium');

      // Wait a bit before calling onSuccess to show the "Complete!" message
      await new Promise(res => setTimeout(res, 1500))

      // Only call onSuccess if autoClose is enabled
      if (autoClose) {
        onSuccess?.([])
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Minting failed';
      console.error('Minting error:', error);
      setMintingStatus(null)
      onError?.(errorMessage);
    } finally {
      setMinting(false)
      setMintingStatus(null)
    }
  }, [
    ensureWalletReady,
    quantity,
    maxBatchSize,
    mintCardsBatch,
    haptics,
    onError,
    approval,
    address,
    refetchCards,
    onSuccess,
    autoClose,
    setMinting,
  ]);


  // Handle errors
  useEffect(() => {
    if (mintingError) {
      haptics.notificationOccurred('error');
      onError?.(mintingError);
    }
  }, [mintingError, haptics, onError]);

  // Handle approval errors
  useEffect(() => {
    if (approval.error) {
      haptics.notificationOccurred('error');
      onError?.(approval.error);
    }
  }, [approval.error, haptics, onError]);

  // Quantity increment/decrement
  const incrementQuantity = () => {
    setQuantity(prev => Math.min(prev + 1, maxBatchSize));
  };

  const decrementQuantity = () => {
    setQuantity(prev => Math.max(prev - 1, 1));
  };

  return (
    <motion.div
      className={`bg-black/80 backdrop-blur-sm w-full rounded-[24px] p-6 ${className}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 700,
        damping: 45,
        duration: 0.15,
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-[18px] leading-[90%] text-white font-semibold">
          Buy Cards
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-xs text-white/60">Live on Base</span>
        </div>
      </div>

      {/* Price Display */}
      {/* <div className="bg-white/10 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-white/60 font-normal text-[15px] leading-[120%]">Price per card</span>
          <span className="text-white font-medium text-[15px] leading-[120%]">
            {singleCardPrice} USDC
          </span>
        </div>
      </div> */}

      {/* Quantity Selector */}
      {showQuantitySelector && (
        <div className="mb-6">
          {/* <label className="text-sm text-white/60 mb-2 block">Quantity</label> */}
          <div className="flex flex-col gap-2 w-full">
            <div className="py-[14px] px-[18px] rounded-[46px] bg-white/10 flex items-center justify-between w-full">
              <motion.button
                className="text-[18px] font-semibold font-mono leading-[100%] text-white/90 cursor-pointer hover:text-white"
                onClick={incrementQuantity}
                disabled={quantity >= maxBatchSize}
                whileHover={{ scale: quantity < maxBatchSize ? 1.05 : 1 }}
                whileTap={{ scale: quantity < maxBatchSize ? 0.95 : 1 }}
              >
                +
              </motion.button>

              <span className="text-[15px] font-semibold font-mono leading-[100%] text-white">
                {quantity}
              </span>

              <motion.button
                className="text-[18px] font-semibold font-mono leading-[100%] text-white/90 cursor-pointer hover:text-white"
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                whileHover={{ scale: quantity > 1 ? 1.05 : 1 }}
                whileTap={{ scale: quantity > 1 ? 0.95 : 1 }}
              >
                -
              </motion.button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1, 5, 10].map((amount) => (
                <button
                  key={amount}
                  className={`py-[14px] px-[18px] rounded-[46px] transition-colors ${quantity === amount
                    ? "bg-white shadow-lg shadow-gray-600/50 hover:bg-white"
                    : "bg-white/10 hover:bg-white/20"
                    }`}
                  onClick={() => {
                    setQuantity(amount);
                  }}
                >
                  <p
                    className={`text-[15px] font-semibold font-mono leading-[100%] ${quantity === amount
                      ? "text-[#090909]"
                      : "text-white"
                      }`}
                  >
                    {amount}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* <div className="text-xs text-white/40 mt-2 text-center">
            Max batch size: {maxBatchSize}
          </div> */}
        </div>
      )}

      {/* Recipient Input */}
      {/* <div className="mb-6">
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
      </div> */}

      {/* Total Cost */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <span className="text-white/60 font-normal text-[15px] leading-[120%]">
              {quantity}x
            </span>
            <span className="text-white font-normal text-[15px] leading-[120%]">
              Scratch-off Card
            </span>
          </div>
          <span className="text-white font-medium text-[15px] leading-[120%]">
            {singleCardPrice} USDC
          </span>
        </div>
        <hr className="border-[0.5px] border-white/10" />
        <div className="flex items-center justify-between w-full">
          <span className="text-white font-normal text-[15px] leading-[120%]">
            Total
          </span>
          <span className="text-white font-medium text-[15px] leading-[120%]">
            {totalCost} USDC
          </span>
        </div>
      </div>

      {/* Mint Button */}
      <motion.button
        className={`
            w-full py-2 rounded-[40px] font-semibold text-[14px] h-11 transition-colors
             border border-white
            ${canProceed && !mintingStatus
            ? 'bg-white/80 hover:bg-white text-black'
            : 'bg-white/20 text-white/60 cursor-not-allowed'
          }
          `}
        onClick={handleMint}
        disabled={!canProceed || !!mintingStatus || mintingState === 'pending' || mintingState === 'confirming'}
        whileHover={canProceed && !mintingStatus ? { scale: 1.02 } : {}}
        whileTap={canProceed && !mintingStatus ? { scale: 0.98 } : {}}
      >

        {mintingStatus ? mintingStatus : (
          <>
            {mintingState === 'pending' && 'Minting...'}
            {mintingState === 'confirming' && 'Confirming...'}
            {mintingState === 'success' && 'Minted Successfully!'}
            {mintingState === 'error' && 'Try Again'}
            {mintingState === 'idle' && (
              !isConnected ? 'Connect Wallet' :
                !isCorrectNetwork ? 'Switch to Base' :
                  `Mint ${quantity} Card${quantity > 1 ? 's' : ''}`
            )}
          </>
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