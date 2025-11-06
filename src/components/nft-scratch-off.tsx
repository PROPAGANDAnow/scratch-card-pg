/**
 * NFT Scratch Off Component
 * 
 * Integrates on-chain prize claiming with existing scratch mechanics
 * Maintains social features while using smart contracts for prizes
 */

'use client';

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  memo,

} from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Address } from "viem";
import { useAppStore } from "~/stores/app-store";
import { useUIActions } from "~/hooks/useUIActions";
import { useUserStore } from "~/stores/user-store";
import {
  APP_COLORS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  SCRATCH_RADIUS,
} from "~/lib/constants";
import { USDC_ADDRESS } from "~/lib/blockchain";
import { useMiniApp } from "@neynar/react";
import { Card, CardCell } from "~/app/interface/card";
import { formatCell } from "~/lib/formatCell";
import { chunk3, findWinningRow } from "~/lib/winningRow";
import { BestFriend } from "~/app/interface/bestFriends";
import { useDebouncedScratchDetection } from "~/hooks/useDebouncedScratchDetection";
import { useBatchedUpdates } from "~/hooks/useBatchedUpdates";
import { useContractClaiming, useTokenClaimability, useClaimSignature, ClaimingState } from "~/hooks/useContractClaiming";
import { useWallet } from "~/hooks/useWeb3Wallet";
import { isMobile } from "~/lib/devices";
import {
  ClaimSignature,
  createClaimSignature
} from "~/lib/blockchain";
import ModalPortal from "~/components/ModalPortal";

interface NftScratchOffProps {
  cardData: Card | null;
  tokenId?: number;
  isDetailView?: boolean;
  onPrizeRevealed?: (tokenId: number, prizeAmount: number) => void;
  hasNext?: boolean;
  onNext?: () => void;
}

const NftScratchOff = ({
  cardData,
  tokenId,
  onPrizeRevealed,
  hasNext,
  onNext,
}: NftScratchOffProps) => {
  const setAppColor = useAppStore((s) => s.setAppColor);
  const setAppBackground = useAppStore((s) => s.setAppBackground);
  const { getWinnerGif, playWinSound } = useUIActions();
  const user = useUserStore((s) => s.user);
  const bestFriends = useUserStore((s) => s.bestFriends);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [scratched, setScratched] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [prizeAmount, setPrizeAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBlurOverlay, setShowBlurOverlay] = useState(false);
  const [bestFriend] = useState<BestFriend | null>(null);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);
  const linkCopyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { actions, haptics } = useMiniApp();

  const { batchUpdate } = useBatchedUpdates(() => { });
  const { address } = useWallet();

  // Web3 claiming hooks
  const {
    claimPrize,
    claimPrizeWithBonus,
    reset: resetClaiming
  } = useContractClaiming();

  // const { canClaim: canClaimToken, isClaimed: isTokenClaimed } = useTokenClaimability(
  //   tokenId || null,
  //   address || null
  // );

  const { createSignature } = useClaimSignature();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!showBlurOverlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showBlurOverlay]);

  // Mouse handlers for card tilt
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const percentX = (x / rect.width) * 2 - 1;
    const percentY = (y / rect.height) * 2 - 1;
    setTilt({
      x: percentY * 20,
      y: percentX * 20,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  // Generate claim signature when card is scratched
  const generateClaimSignature = useCallback(async (cardData: Card) => {
    if (!cardData) return null;

    const tokenId = cardData.token_id

    try {
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const { signature } = await createSignature(tokenId);

      return createClaimSignature(
        cardData.prize_amount,
        USDC_ADDRESS as Address,
        deadline,
        signature
      );
    } catch (error) {
      console.error('Failed to generate claim signature:', error);
      return null;
    }
  }, [tokenId, cardData, createSignature]);

  // Handle prize claiming on-chain
  const handleClaimPrize = useCallback(async (tokenId: number, claimSignature: ClaimSignature) => {
    try {
      if (bestFriend && cardData?.prize_amount === -1) {
        // Claim with bonus for friend
        await claimPrizeWithBonus(
          tokenId,
          claimSignature,
          address || undefined,
          bestFriend.wallet as Address
        );
      } else {
        // Standard claim
        await claimPrize(
          tokenId,
          claimSignature,
          address || undefined
        );
      }

      haptics.notificationOccurred('success');

    } catch (error) {
      console.error('Claiming failed:', error);
      haptics.notificationOccurred('error');
    }
  }, [
    tokenId,
    bestFriend,
    cardData,
    claimPrize,
    claimPrizeWithBonus,
    address,
    haptics
  ]);

  // Handle sharing (maintains existing social functionality)
  const handleShare = useCallback(async () => {
    if (!user) return;

    const baseUrl = process.env.NEXT_PUBLIC_URL;
    const frameUrl =
      `${baseUrl}/api/frame-share?` +
      new URLSearchParams({
        prize: prizeAmount.toString(),
        username: user.address || "",
        friend_username: bestFriend?.username || "",
      }).toString();

    try {
      await actions.composeCast({
        text:
          prizeAmount > 0
            ? `I just won ${formatCell(prizeAmount, USDC_ADDRESS)}!`
            : `I just won a free card for @${bestFriend?.username}!`,
        embeds: [frameUrl],
      });
    } catch (error) {
      console.error("Failed to share:", error);
      window.open(frameUrl, "_blank");
    }
  }, [user, prizeAmount, bestFriend?.username, actions]);

  // Scratch detection handler
  const handleScratchDetection = useCallback(async () => {
    if (!cardData || isProcessing) return;

    const prizeAmount = cardData?.prize_amount || 0;
    setIsProcessing(true);

    // Generate claim signature for on-chain claiming
    const signature = await generateClaimSignature(cardData);

    if (!signature) {
      throw new Error("signature not found")
    }

    await handleClaimPrize(Number(cardData.id), signature)

    // Update local state (optimistic updates)
    // no-op batching retained; state updates handled elsewhere
    // batchUpdate([]);
    setScratched(true);

    if (tokenId && onPrizeRevealed) {
      onPrizeRevealed(tokenId, prizeAmount);
    }

    // Handle UI updates
    if (prizeAmount > 0 || prizeAmount === -1) {
      setAppColor(APP_COLORS.WON);
      setAppBackground(`linear-gradient(to bottom, #090210, ${APP_COLORS.WON})`);
      haptics.impactOccurred("heavy");
      haptics.notificationOccurred("success");
      playWinSound();
    } else {
      setAppColor(APP_COLORS.LOST);
      setAppBackground(`linear-gradient(to bottom, #090210, ${APP_COLORS.LOST})`);
    }

    // Send notification (maintains existing social features)
    // TODO: make this quick auth as well 
    fetch("/api/neynar/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fid: user?.fid,
        username: user?.address,
        amount: prizeAmount,
        friend_fid: bestFriend?.fid,
        bestFriends,
      }),
    }).catch((error) => {
      console.error("Failed to send notification:", error);
    });

    setPrizeAmount(prizeAmount);
    setShowBlurOverlay(prizeAmount > 0 || prizeAmount === -1);
  }, [cardData, isProcessing, generateClaimSignature, batchUpdate, tokenId, onPrizeRevealed, setAppColor, setAppBackground, haptics, playWinSound, user, bestFriends, bestFriend?.fid]);

  // Debounced scratch detection with Web3 integration
  const {
    debouncedCallback: debouncedScratchDetection,
    cancel: cancelScratchDetection,
  } = useDebouncedScratchDetection(handleScratchDetection, 100);

  // Canvas setup (maintains existing scratch mechanics)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const scale = devicePixelRatio;

    canvas.width = CANVAS_WIDTH * scale;
    canvas.height = CANVAS_HEIGHT * scale;
    canvas.style.width = CANVAS_WIDTH + "px";
    canvas.style.height = CANVAS_HEIGHT + "px";
    canvas.style.willChange = "transform";

    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";
    ctx.textBaseline = "top";

    const coverImg = new window.Image();
    coverImg.src = "/assets/scratch-card-image.png";
    coverImg.onload = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(
        coverImg,
        0,
        0,
        coverImg.width,
        coverImg.height,
        0,
        0,
        CANVAS_WIDTH,
        CANVAS_HEIGHT
      );
      setCoverImageLoaded(true);
    };
  }, []);

  // Scratch logic (maintains existing mechanics)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isDrawing = false;
    let lastPoint: { x: number; y: number } | null = null;

    const getEventPoint = (e: TouchEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;

      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
        y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
      };
    };

    const scratch = (x: number, y: number) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, SCRATCH_RADIUS, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    };

    const drawLine = (
      from: { x: number; y: number },
      to: { x: number; y: number }
    ) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.lineWidth = SCRATCH_RADIUS * 2;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    };

    const touchStart = (e: TouchEvent) => {
      if (!cardData || isProcessing) return;
      e.preventDefault();
      const point = getEventPoint(e);
      if (!point) return;

      isDrawing = true;
      lastPoint = point;
      scratch(point.x, point.y);
    };

    const touchMove = (e: TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const point = getEventPoint(e);
      if (!point) return;

      if (lastPoint) {
        drawLine(lastPoint, point);
      }
      lastPoint = point;
      scratch(point.x, point.y);
    };

    const touchEnd = (e: TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      isDrawing = false;
      lastPoint = null;
      setTimeout(checkScratched, 300);
    };

    const mouseDown = (e: MouseEvent) => {
      if (!cardData || isProcessing) return;
      e.preventDefault();
      const point = getEventPoint(e);
      if (!point) return;

      isDrawing = true;
      lastPoint = point;
      scratch(point.x, point.y);
    };

    const mouseMove = (e: MouseEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const point = getEventPoint(e);
      if (!point) return;

      if (lastPoint) {
        drawLine(lastPoint, point);
      }
      lastPoint = point;
      scratch(point.x, point.y);
    };

    const mouseUp = () => {
      if (!isDrawing) return;
      isDrawing = false;
      lastPoint = null;
      setTimeout(checkScratched, 300);
    };

    const checkScratched = () => {
      const actualWidth = canvas.width;
      const actualHeight = canvas.height;
      const imageData = ctx.getImageData(0, 0, actualWidth, actualHeight);
      let transparent = 0;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] === 0) transparent++;
      }
      const percent = (transparent / (actualWidth * actualHeight)) * 100;

      if (percent > 40 && !scratched && !isProcessing) {
        debouncedScratchDetection();
      }
    };

    canvas.addEventListener("touchstart", touchStart, { passive: false });
    canvas.addEventListener("touchmove", touchMove, { passive: false });
    canvas.addEventListener("touchend", touchEnd, { passive: false });
    canvas.addEventListener("mousedown", mouseDown);
    document.addEventListener("mousemove", mouseMove);
    document.addEventListener("mouseup", mouseUp);

    return () => {
      cancelScratchDetection();
      canvas.removeEventListener("touchstart", touchStart);
      canvas.removeEventListener("touchmove", touchMove);
      canvas.removeEventListener("touchend", touchEnd);
      canvas.removeEventListener("mousedown", mouseDown);
      document.removeEventListener("mousemove", mouseMove);
      document.removeEventListener("mouseup", mouseUp);
    };
  }, [cardData, isProcessing, debouncedScratchDetection, scratched]);

  // Populate best friend state
  // useEffect(() => {
  //   // Note: shared_to field removed from Card model, replaced with gifted_to_user_id relation
  //   const sharedTo = null; // Disabled until proper relation is implemented
  //   if (false && cardData?.numbers_json && sharedTo?.wallet) { // Disabled since sharedTo is always null
  //     const numbersJson = cardData.numbers_json as unknown as CardCell[];
  //     const friendCell = numbersJson.find(
  //       (cell) => cell.friend_wallet === sharedTo.wallet
  //     );

  //     if (
  //       friendCell &&
  //       friendCell.friend_fid &&
  //       friendCell.friend_username &&
  //       friendCell.friend_pfp &&
  //       friendCell.friend_wallet
  //     ) {
  //       setBestFriend({
  //         fid: friendCell.friend_fid,
  //         username: friendCell.friend_username,
  //         pfp: friendCell.friend_pfp,
  //         wallet: friendCell.friend_wallet,
  //       });
  //     }
  // } else {
  //   setBestFriend(null);
  // }
  // }, [cardData]);

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      setScratched(false);
      setPrizeAmount(0);
      setIsProcessing(false);
      setShowBlurOverlay(false);
      setTilt({ x: 0, y: 0 });
      setCoverImageLoaded(false);
      resetClaiming();

      if (linkCopyTimeoutRef.current) {
        clearTimeout(linkCopyTimeoutRef.current);
      }

      setAppColor(APP_COLORS.DEFAULT);
      setAppBackground(`linear-gradient(to bottom, #090210, ${APP_COLORS.DEFAULT})`);
    };
  }, [resetClaiming, setAppBackground, setAppColor]);

  return (
    <>
      <div
        className="h-full w-full flex flex-col items-center justify-center"
        style={{
          touchAction: !scratched ? "none" : "auto",
        }}
      >
        <p
          className={`font-[ABCGaisyr] text-center mb-1 font-bold italic rotate-[-4deg] text-[30px]`}
          style={{
            visibility: scratched
              ? "visible"
              : "hidden",
            color: cardData?.prize_amount || prizeAmount
              ? "#fff"
              : "rgba(255, 255, 255, 0.4)",
            textShadow: cardData?.prize_amount || prizeAmount
              ? "0px 0px 1px #00A34F, 0px 0px 2px #00A34F, 0px 0px 6px #00A34F, 0px 0px 12px #00A34F"
              : "none",
          }}
        >
          {cardData?.prize_amount || prizeAmount ? (
            prizeAmount === -1 || cardData?.prize_amount === -1 ? (
              `Won free card!`
            ) : (
              `Won ${formatCell(
                cardData?.prize_amount || prizeAmount,
                USDC_ADDRESS
              )}!`
            )
          ) : (
            " No win!"
          )}
        </p>
        <div className="flex-1 grow">
          <motion.div
            ref={cardRef}
            layoutId={cardData ? `card-${cardData.id}` : undefined}
            className="w-full relative"
            animate={{
              rotateX: tilt.x,
              rotateY: tilt.y,
              scale: scratched ? [1, 1.25, 1] : 1,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              layout: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
              scale: {
                duration: 0.6,
                ease: "easeOut",
              },
            }}
            style={{
              perspective: 1000,
              willChange: "transform, opacity",
              transform: "translateZ(0)",
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Shadow element */}
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
              transition={{ duration: 0.2 }}
            />
            <div
              style={{
                position: "relative",
                zIndex: 1,
              }}
              className="flex items-center justify-center"
            >
              <img
                src="/assets/scratched-card-image.png"
                alt="Revealed"
                style={{
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  objectFit: "cover",
                  borderRadius: 4,
                  display: "block",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
              {cardData?.numbers_json &&
                (scratched || coverImageLoaded) ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center rotate-[-4deg]">
                  {(() => {
                    const numbersJson = cardData.numbers_json as unknown as CardCell[];
                    const rows = chunk3(numbersJson);
                    const winningRowIdx = findWinningRow(
                      numbersJson,
                      cardData.prize_amount,
                      cardData.prize_asset_contract
                    );

                    return (
                      <div className="grid grid-rows-4 gap-1">
                        {rows.map((row, index) => {
                          const isWinning = winningRowIdx === index;
                          return (
                            <div
                              key={index}
                              className="grid grid-cols-3 gap-1 rotate-1"
                            >
                              {row.map((cell, cellIndex) => (
                                <div
                                  key={`${cell.amount}-${cellIndex}`}
                                  className={`w-[77px] h-[77px] rounded-[14px] font-[ABCGaisyr] font-bold text-[24px] leading-[90%] italic flex items-center justify-center ${isWinning
                                    ? "!text-[#00A151]/40 !bg-[#00A151]/15"
                                    : "!text-[#000]/15 !bg-[#000]/10"
                                    }`}
                                  style={{
                                    filter:
                                      "drop-shadow(0px 0.5px 0.5px rgba(0, 0, 0, 0.15))",
                                    textShadow:
                                      "0px 0.5px 0.5px rgba(0, 0, 0, 0.15), 0px -0.5px 0.5px rgba(255, 255, 255, 0.1)",
                                  }}
                                >
                                  {cell.friend_pfp ? (
                                    <div className="relative">
                                      <Image
                                        src={cell.friend_pfp}
                                        alt={`${cell.friend_username || "Friend"
                                          }`}
                                        width={48}
                                        height={48}
                                        className="rounded-full object-cover"
                                        style={{
                                          width: 48,
                                          height: 48,
                                          filter: "saturate(0.01)",
                                          opacity: 0.8,
                                        }}
                                        unoptimized
                                      />
                                      {isWinning && (
                                        <div
                                          className="absolute inset-0 rounded-full"
                                          style={{
                                            backgroundColor: "#00a151",
                                            opacity: 0.4,
                                          }}
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    formatCell(
                                      cell.amount,
                                      cell.asset_contract || USDC_ADDRESS
                                    )
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ) : null}

              {/* Scratch cover */}
              {(!cardData || (!scratched)) && (
                <canvas
                  ref={canvasRef}
                  style={{
                    zIndex: 20,
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%) translateZ(0)",
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    borderRadius: 4,
                    cursor: cardData ? "grab" : "default",
                    touchAction: "manipulation",
                    WebkitTouchCallout: "none",
                    WebkitUserSelect: "none",
                    userSelect: "none",
                    willChange: "transform",
                  }}
                />
              )}

              {/* Quick reveal buttons - show when card is not scratched */}
              {!scratched && (
                <motion.div
                  className="absolute bottom-[120px] left-0 transform -translate-x-1/2 z-30 flex gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                >
                  <button
                    onClick={() => {
                      // Clear the canvas to reveal the card
                      const canvas = canvasRef.current;
                      if (canvas) {
                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                          ctx.clearRect(0, 0, canvas.width, canvas.height);
                        }
                      }
                      // Trigger scratch detection
                      handleScratchDetection();
                    }}
                  >
                    <div className="px-8 py-4 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors">
                      <span className="font-[ABCGaisyr] font-bold text-[20px] italic" style={{ color: APP_COLORS.WON }}>
                        Quick Reveal
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      // Create scratch animation effect
                      const canvas = canvasRef.current;
                      if (canvas) {
                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                          // Create a scratch pattern to simulate scratching
                          ctx.globalCompositeOperation = "destination-out";

                          // Create multiple scratch lines for a realistic effect
                          const scratchPattern = () => {
                            for (let i = 0; i < 20; i++) {
                              const startX = Math.random() * CANVAS_WIDTH;
                              const startY = Math.random() * CANVAS_HEIGHT;
                              const endX = Math.random() * CANVAS_WIDTH;
                              const endY = Math.random() * CANVAS_HEIGHT;

                              ctx.beginPath();
                              ctx.moveTo(startX, startY);
                              ctx.lineTo(endX, endY);
                              ctx.lineWidth = SCRATCH_RADIUS * 2;
                              ctx.lineCap = "round";
                              ctx.stroke();
                            }

                            // Add some circular scratches
                            for (let i = 0; i < 30; i++) {
                              const x = Math.random() * CANVAS_WIDTH;
                              const y = Math.random() * CANVAS_HEIGHT;

                              ctx.beginPath();
                              ctx.arc(x, y, SCRATCH_RADIUS, 0, 2 * Math.PI);
                              ctx.fill();
                            }
                          };

                          // Animate the scratching
                          let scratches = 0;
                          const animateScratch = () => {
                            if (scratches < 5) {
                              scratchPattern();
                              scratches++;
                              requestAnimationFrame(animateScratch);
                            } else {
                              // Final clear to ensure full reveal
                              ctx.clearRect(0, 0, canvas.width, canvas.height);
                              // Trigger scratch detection
                              handleScratchDetection();
                            }
                          };
                          animateScratch();
                        }
                      }
                    }}
                  >
                    <div className="px-8 py-4 bg-gradient-to-r from-purple-500/90 to-pink-500/90 backdrop-blur-sm rounded-full shadow-lg hover:from-purple-500 hover:to-pink-500 transition-all">
                      <span className="font-[ABCGaisyr] font-bold text-[20px] italic text-white flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="animate-pulse">
                          <path d="M9 3L15 12L9 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M15 3L21 12L15 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Scratch All
                      </span>
                    </div>
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Prize reveal modal with Web3 claiming */}
      {showBlurOverlay && (
        <ModalPortal>
          <motion.div
            className="fixed inset-0 z-[9999] text-white flex flex-col items-center justify-center"
            style={{
              pointerEvents: "auto",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowBlurOverlay(false);
              }
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setShowBlurOverlay(false)}
              className="absolute top-4 left-4 z-10 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <Image
                src="/assets/cross-icon.svg"
                alt="Close"
                width={16}
                height={16}
                className="filter brightness-0 invert"
              />
            </button>

            {getWinnerGif() ? (
              <img
                src={getWinnerGif()?.src || "/assets/winner.gif"}
                alt="winner"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <Image
                src={"/assets/winner.gif"}
                alt="winner"
                fill
                className="object-cover"
                unoptimized
              />
            )}

            <p className="font-[ABCGaisyr] font-bold text-center text-white text-[46px] mb-6 leading-[92%] italic rotate-[-6deg]">
              {prizeAmount > 0 ? (
                <>You&apos;ve won</>
              ) : (
                <>
                  You&apos;ve won a free card for you and @
                  {bestFriend?.username}
                </>
              )}
              {prizeAmount > 0 ? (
                <>
                  <br />
                  <span className="font-[ABCGaisyr] font-bold text-white text-[94px] leading-[92%] italic">
                    {formatCell(prizeAmount, USDC_ADDRESS)}!
                  </span>
                </>
              ) : null}
            </p>

            {/* Social sharing (maintains existing functionality) */}
            <div className="absolute w-[90%] bottom-[36px] flex flex-col items-center justify-center gap-4">
              {bestFriend?.username && prizeAmount === -1 ? (
                <div className="w-full p-1 rounded-[40px] border border-white">
                  <button
                    onClick={handleShare}
                    className="w-full py-2 bg-white/80 rounded-[40px] font-semibold text-[14px] hover:bg-white h-11 transition-colors"
                    style={{
                      color: APP_COLORS.WON,
                    }}
                  >
                    Send to @{bestFriend?.username}
                  </button>
                </div>
              ) : (
                <motion.div
                  className="bg-black/80 backdrop-blur-sm rounded-[24px] p-6 w-full"
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
                  <p className="text-[18px] leading-[90%] text-white font-semibold mb-6">
                    Share with friends
                  </p>
                  <div className="flex items-center justify-between w-full">
                    <button
                      onClick={() => {/* WhatsApp sharing */ }}
                      className="rounded-full border border-[#fff]/[0.02] bg-[#fff]/[0.08] w-[64px] h-[64px] flex items-center justify-center hover:bg-[#fff]/[0.15] transition-colors"
                    >
                      <Image
                        src="/assets/whatsapp-icon.svg"
                        alt="Whatsapp"
                        width={28}
                        height={28}
                      />
                    </button>
                    <button
                      onClick={() => {/* Telegram sharing */ }}
                      className="rounded-full border border-[#fff]/[0.02] bg-[#fff]/[0.08] w-[64px] h-[64px] flex items-center justify-center hover:bg-[#fff]/[0.15] transition-colors"
                    >
                      <Image
                        src="/assets/telegram-icon.svg"
                        alt="Telegram"
                        width={28}
                        height={28}
                      />
                    </button>
                    <button
                      onClick={handleShare}
                      className="rounded-full border border-[#fff]/[0.02] bg-[#fff]/[0.08] hover:bg-[#fff]/[0.15] w-[64px] h-[64px] flex items-center justify-center transition-all duration-200"
                    >
                      <Image
                        src="/assets/farcaster-icon.svg"
                        alt="Farcaster"
                        width={28}
                        height={28}
                      />
                    </button>
                  </div>
                </motion.div>
              )}

              {hasNext && prizeAmount !== -1 ? (
                <div className="w-full p-1 rounded-[40px] border border-white">
                  <button
                    onClick={onNext}
                    className="w-full py-2 bg-white/80 rounded-[40px] font-semibold text-[14px] hover:bg-white h-11 transition-colors"
                    style={{
                      color: APP_COLORS.WON,
                    }}
                  >
                    Next Card
                  </button>
                </div>
              ) : !hasNext ? (
                <div className="w-full p-1 rounded-[40px] border border-white">
                  <button
                    onClick={() => {
                      // buyCards?.();
                      setShowBlurOverlay(false);
                    }}
                    className="w-full py-2 bg-white/80 rounded-[40px] font-semibold text-[14px] hover:bg-white h-11 transition-colors"
                    style={{
                      color: APP_COLORS.WON,
                    }}
                  >
                    Buy Cards
                  </button>
                </div>
              ) : null}
            </div>
          </motion.div>
        </ModalPortal>
      )}
    </>
  );
};

export default memo(NftScratchOff);