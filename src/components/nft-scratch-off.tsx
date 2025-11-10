/**
 * NFT Scratch Off Component
 * 
 * Integrates on-chain prize claiming with existing scratch mechanics
 * Maintains social features while using smart contracts for prizes
 */

'use client';

import { useMiniApp } from "@neynar/react";
import clsx from "clsx";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { Address } from "viem";
import { BestFriend } from "~/app/interface/bestFriends";
import { Card, CardCell } from "~/app/interface/card";
import ModalPortal from "~/components/ModalPortal";

import { useContractClaiming } from "~/hooks/useContractClaiming";
import { useDebouncedScratchDetection } from "~/hooks/useDebouncedScratchDetection";
import { useTrackScratch } from "~/hooks/useTrackScratch";
import { useUIActions } from "~/hooks/useUIActions";
import { useWallet } from "~/hooks/useWeb3Wallet";
import { ClaimSignature, PAYMENT_TOKEN } from "~/lib/blockchain";
import {
  APP_COLORS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  SCRATCH_RADIUS,
} from "~/lib/constants";
import { formatCell } from "~/lib/formatCell";
import { chunk3, findWinningRow } from "~/lib/winningRow";
import { extractBonusFriendFromNumbers } from "~/lib/token-utils";
import { useCardStore } from "~/stores";
import { useAppStore } from "~/stores/app-store";
import { useUserStore } from "~/stores/user-store";

interface NftScratchOffProps {
  cardData: Card | null;
  tokenId?: number;
  isDetailView?: boolean;
  onPrizeRevealed?: (tokenId: number, prizeAmount: number) => void;
  hasNext?: boolean;
  onNext?: () => void;
}

const NftScratchOff = ({
  cardData: currCardData,
  hasNext,
  onNext,
  onPrizeRevealed
}: NftScratchOffProps) => {
  const setAppColor = useAppStore((s) => s.setAppColor);
  const setAppBackground = useAppStore((s) => s.setAppBackground);
  const { getWinnerGif } = useUIActions();
  const user = useUserStore((s) => s.user);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // const [scratched, setScratched] = useState(false);
  const {
    scratched,
    setScratched,
    updateCardMeta,
  } = useCardStore()

  const activeCard = useCardStore(state => state.cards.find(c => String(c.state.token_id) === state.activeTokenId))

  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [prizeAmount, setPrizeAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBlurOverlay, setShowBlurOverlay] = useState(false);
  const [bestFriend, setBestFriend] = useState<BestFriend | null>(null);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);
  const linkCopyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { actions, haptics } = useMiniApp();
  const { address } = useWallet();
  const { playWinSound } = useUIActions()
  const { activeTokenId } = useCardStore()

  // Web3 claiming hooks
  const {
    claimPrize,
    claimPrizeWithBonus,
    reset: resetClaiming
  } = useContractClaiming();

  // Scratch tracking hook
  const trackScratch = useTrackScratch();

  // const { canClaim: canClaimToken, isClaimed: isTokenClaimed } = useTokenClaimability(
  //   tokenId || null,
  //   address || null
  // );


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

  // Handle prize claiming on-chain
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleClaimPrize = useCallback(async (tokenId: number, claimSignature: ClaimSignature) => {
    if (bestFriend && currCardData?.prize_amount === -1) {
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
  }, [
    bestFriend,
    currCardData,
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
            ? `I just won ${formatCell(prizeAmount, PAYMENT_TOKEN.ADDRESS)}!`
            : `I just won a free card for @${bestFriend?.username}!`,
        embeds: [frameUrl],
      });
    } catch (error) {
      console.error("Failed to share:", error);
      window.open(frameUrl, "_blank");
    }
  }, [user, prizeAmount, bestFriend?.username, actions]);

  // Stable scratch deps ref to avoid listener churn
  const scratchDepsRef = useRef({
    currCardData: null as typeof currCardData,
    isProcessing,
    address,
    bestFriend,
    onPrizeRevealed,
    playWinSound,
    prizeAmount,
    setAppBackground,
    setAppColor,
    setScratched,
    trackScratch,
    updateCardMeta,
    user,
    haptics,
    setShowBlurOverlay,
  });

  useEffect(() => {
    scratchDepsRef.current = {
      currCardData,
      isProcessing,
      address,
      bestFriend,
      onPrizeRevealed,
      playWinSound,
      prizeAmount,
      setAppBackground,
      setAppColor,
      setScratched,
      trackScratch,
      updateCardMeta,
      user,
      haptics,
      setShowBlurOverlay,
    };
  }, [currCardData, isProcessing, address, bestFriend, onPrizeRevealed, playWinSound, prizeAmount, setAppBackground, setAppColor, setScratched, trackScratch, updateCardMeta, user, haptics, setShowBlurOverlay]);

  // Scratch detection handler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleScratchDetection = useCallback(async () => {
    const {
      currCardData,
      isProcessing,
      address,
      bestFriend,
      onPrizeRevealed,
      playWinSound,
      prizeAmount,
      setAppBackground,
      setAppColor,
      setScratched,
      trackScratch,
      updateCardMeta,
      user,
      haptics,
      setShowBlurOverlay,
    } = scratchDepsRef.current;

    try {
      if (!currCardData || isProcessing || !address) return;

      const tokenId = currCardData.token_id;
      setIsProcessing(true);

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

      setPrizeAmount(prizeAmount);
      setShowBlurOverlay(prizeAmount > 0 || prizeAmount === -1);
      setScratched(true);

      // Track scratch status in database
      await trackScratch.mutateAsync({
        tokenId,
        scratched: true,
        scratchedBy: address,
        prizeWon: prizeAmount > 0 || prizeAmount === -1,
      });

      updateCardMeta(String(tokenId), { scratched: true });

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
        }),
      }).catch((error) => {
        console.error("Failed to send notification:", error);
      });
    } catch (error) {
      console.error(error);
    }
  }, []);

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
      if (!currCardData || isProcessing) return;
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
      if (!currCardData || isProcessing) return;
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
  }, [currCardData, isProcessing, debouncedScratchDetection, cancelScratchDetection, scratched]);

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

  // Populate best friend from numbers_json (free-card scenario)
  useEffect(() => {
    if (!currCardData?.numbers_json || currCardData?.prize_amount !== -1) {
      setBestFriend(null);
      return;
    }
    const friend = extractBonusFriendFromNumbers(currCardData.numbers_json as unknown as CardCell[]);
    setBestFriend(friend);
  }, [currCardData?.numbers_json, currCardData?.prize_amount]);

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

      const currentTimeout = linkCopyTimeoutRef.current;
      if (currentTimeout) {
        clearTimeout(currentTimeout);
        linkCopyTimeoutRef.current = null;
      }

      setAppColor(APP_COLORS.DEFAULT);
      setAppBackground(`linear-gradient(to bottom, #090210, ${APP_COLORS.DEFAULT})`);
    };
  }, [resetClaiming, setAppBackground, setAppColor, setScratched]);

  const handleQuickReveal = () => {
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
  }

  useEffect(() => {
    console.log("🚀 ~ NftScratchOff ~ activeCard:", activeCard)
    console.log("🚀 ~ NftScratchOff ~ activeCard?.state.scratched:", activeCard?.state.scratched)
    if (activeCard?.state.scratched) {
      handleQuickReveal()
    }
  }, [activeCard?.state.scratched])

  const showCongratsMessage = scratched && currCardData && activeTokenId && String(activeTokenId) === String(currCardData.token_id)

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
            visibility: showCongratsMessage
              ? "visible"
              : "hidden",
            color: currCardData?.prize_amount || prizeAmount
              ? "#fff"
              : "rgba(255, 255, 255, 0.4)",
            textShadow: currCardData?.prize_amount || prizeAmount
              ? "0px 0px 1px #00A34F, 0px 0px 2px #00A34F, 0px 0px 6px #00A34F, 0px 0px 12px #00A34F"
              : "none",
          }}
        >
          {currCardData?.prize_amount || prizeAmount ? (
            prizeAmount === -1 || currCardData?.prize_amount === -1 ? (
              `Won free card!`
            ) : (
              `Won ${formatCell(
                currCardData?.prize_amount || prizeAmount,
                PAYMENT_TOKEN.ADDRESS
              )}!`
            )
          ) : (
            " No win!"
          )}
        </p>
        <div className="flex-1 grow">
          <motion.div
            ref={cardRef}
            layoutId={currCardData ? `card-${currCardData.id}` : undefined}
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
              <Image
                src="/assets/scratched-card-image.png"
                alt="Revealed"
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                style={{
                  objectFit: "cover",
                  borderRadius: 4,
                  display: "block",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
              {currCardData?.numbers_json &&
                (scratched || coverImageLoaded) ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center rotate-[-4deg]">
                  {(() => {
                    const numbersJson = currCardData.numbers_json as unknown as CardCell[];
                    const rows = chunk3(numbersJson);
                    const winningRowIdx = findWinningRow(
                      numbersJson,
                      currCardData.prize_amount,
                      currCardData.prize_asset_contract
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
                                  className={clsx(
                                    `w-[77px] h-[77px] rounded-[14px] font-[ABCGaisyr] font-bold text-[24px] leading-[90%] italic flex items-center justify-center`,
                                    (isWinning && scratched)
                                      ? "!text-[#00A151]/40 !bg-[#00A151]/15"
                                      : "!text-[#000]/15 !bg-[#000]/10"

                                  )}
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
                                    cell.amount == -1 ?
                                      <span className="uppercase select-none">Free Card</span> :
                                      formatCell(
                                        cell.amount,
                                        cell.asset_contract || PAYMENT_TOKEN.ADDRESS
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
              {(!currCardData || (!scratched)) && (
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
                    cursor: currCardData ? "grab" : "default",
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
                  className="absolute left-0 transform -translate-x-1/2 z-50 gap-3 w-full justify-center top-0 md:flex hidden"
                  initial={{ opacity: 0, y: -60 }}
                  animate={{ opacity: 1, y: -40 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                >
                  <div className="w-fit p-1 rounded-[40px] border border-white/50 backdrop-blur-3xl bg-white/10">
                    <button
                      onClick={handleQuickReveal}
                      className="w-full py-1 px-4 rounded-[40px] font-semibold text-[14px] transition-colors text-white/80"
                    >
                      Quick Reveal
                    </button>
                  </div>
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
              <Image
                src={getWinnerGif()?.src || "/assets/winner.gif"}
                alt="winner"
                fill
                className="object-cover"
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
                    {formatCell(prizeAmount, PAYMENT_TOKEN.ADDRESS)}!
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