/**
 * NFT Initial Screen Component
 * 
 * Replaces traditional card buying with NFT minting
 * Integrates wallet connection and NFT minting
 */

'use client';

import Image from "next/image";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
} from "~/lib/constants";
import { AppContext } from "~/app/context";
import { FC, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WalletButton } from "./wallet-button";
import { Minting } from "./minting";
import { useWallet, useWalletStatus } from "~/hooks/useWeb3Wallet";
import { useUserCards } from "~/hooks/useContractMinting";

interface NftInitialScreenProps {
  onScratchNow: () => void;
}

const NftInitialScreen: FC<NftInitialScreenProps> = ({ onScratchNow }) => {
  const [state] = useContext(AppContext);
  const [showMinting, setShowMinting] = useState(false);

  // Web3 hooks
  const { address, isConnected } = useWallet();
  const { canTransact } = useWalletStatus();
  const { tokenIds } = useUserCards(address);

  const textShadowStyle = {
    textShadow: `1px 1px 0px #7727DE33,
0px 0px 3.91px #7727DE,
0px 0px 7.82px #7727DE,
0px 0px 27.38px #7727DE,
0px 0px 54.76px #7727DE,
0px 0px 93.88px #7727DE,
0px 0px 164.29px #7727DE
 `,
  };

  // Handle minting success
  const handleMintingSuccess = useCallback((tokenIds: bigint[]) => {
    console.log('Minting successful:', tokenIds);
    setShowMinting(false);

    // Refresh cards after successful minting
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }, []);

  // Handle minting error
  const handleMintingError = useCallback((error: string) => {
    console.error('Minting error:', error);
  }, []);

  // Handle scratch now
  const handleScratchNow = useCallback(() => {
    const tokenIdsArray = Array.isArray(tokenIds) ? tokenIds : [];
    if (canTransact && tokenIdsArray.length > 0) {
      onScratchNow();
    } else if (!isConnected) {
      // Show wallet connection prompt
    } else if (tokenIdsArray.length === 0) {
      // Show minting interface
      setShowMinting(true);
    }
  }, [canTransact, tokenIds, isConnected, onScratchNow]);

  // Check if user has cards
  const hasCards = Array.isArray(tokenIds) && tokenIds.length > 0;

  return (
    <div
      className="h-[100dvh] relative w-full max-w-[400px] mx-auto"
      style={{ background: state.appBackground }}
    >
      <AnimatePresence mode="wait">
        {!showMinting ? (
          <motion.div
            key="main-screen"
            className="h-full flex flex-col items-center justify-center p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Logo/Title */}
            <motion.div
              className="mb-8 text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1
                className="font-[ABCGaisyr] text-[48px] font-bold italic text-white leading-[90%] mb-2"
                style={textShadowStyle}
              >
                Scratch Off
              </h1>
              <p className="text-white/80 text-sm">
                Mint NFT scratch cards and win prizes on Base
              </p>
            </motion.div>

            {/* Card Preview */}
            <motion.div
              className="relative mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              {/* Shadow */}
              <motion.div
                style={{
                  position: "absolute",
                  top: 30,
                  left: 0,
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  background: "rgba(0, 0, 0, 0.4)",
                  filter: "blur(28px)",
                  borderRadius: 4,
                  zIndex: 0,
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
              />

              {/* Card Image */}
              <motion.div
                style={{
                  position: "relative",
                  zIndex: 1,
                }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Image
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  src="/assets/scratch-card-image.png"
                  alt="Scratch card"
                  style={{
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    objectFit: "cover",
                    borderRadius: 4,
                    display: "block",
                    userSelect: "none",
                  }}
                />

                {/* Card count overlay */}
                {hasCards && (
                  <motion.div
                    className="absolute top-2 right-2 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                  >
                    {tokenIds.length} Card{tokenIds.length > 1 ? 's' : ''}
                  </motion.div>
                )}
              </motion.div>
            </motion.div>

            {/* Wallet Connection Status */}
            <motion.div
              className="mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.3 }}
            >
              <WalletButton
                showStatus={true}
                size="lg"
              />
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              className="flex flex-col gap-4 w-full max-w-[280px]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.3 }}
            >
              {isConnected && (
                <>
                  {hasCards ? (
                    <motion.button
                      className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-full text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                      onClick={handleScratchNow}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Start Scratching
                    </motion.button>
                  ) : (
                    <motion.button
                      className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-full text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                      onClick={() => setShowMinting(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Mint Your First Card
                    </motion.button>
                  )}

                  <motion.button
                    className="w-full py-3 bg-white/20 text-white font-semibold rounded-full border border-white/30 hover:bg-white/30 transition-all duration-200"
                    onClick={() => setShowMinting(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {hasCards ? 'Mint More Cards' : 'Learn More'}
                  </motion.button>
                </>
              )}

              {!isConnected && (
                <motion.div
                  className="text-center text-white/60 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0, duration: 0.3 }}
                >
                  <p>Connect your wallet to get started</p>
                  <p className="mt-2 text-xs">
                    Powered by Base network
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* Features */}
            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.3 }}
            >
              <div className="flex justify-center gap-6 text-white/60 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>On-Chain</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>USDC Prizes</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span>NFTs</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="minting-screen"
            className="h-full flex items-center justify-center p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-full max-w-[360px]">
              <Minting
                onSuccess={handleMintingSuccess}
                onError={handleMintingError}
                showQuantitySelector={true}
                defaultQuantity={1}
              />

              {/* Back button */}
              <motion.button
                className="w-full mt-4 py-3 bg-white/10 text-white/60 font-medium rounded-full hover:bg-white/20 transition-all duration-200"
                onClick={() => setShowMinting(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Back
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NftInitialScreen;