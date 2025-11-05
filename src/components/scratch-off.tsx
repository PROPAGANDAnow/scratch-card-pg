"use client";
import { useMiniApp } from "@neynar/react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BestFriend } from "~/app/interface/bestFriends";
import { Card, CardCell } from "~/app/interface/card";
import { Reveal } from "~/app/interface/reveal";
import { useDebouncedScratchDetection } from "~/hooks/useDebouncedScratchDetection";
import {
  APP_COLORS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  SCRATCH_RADIUS,
} from "~/lib/constants";
import { USDC_ADDRESS } from "~/lib/blockchain";
import { formatCell } from "~/lib/formatCell";
import { getLevelRequirement } from "~/lib/level";
import { chunk3, findWinningRow } from "~/lib/winningRow";
import { useAppStore, useCardStore, useUserStore } from "~/stores";
import { useUIActions } from "~/hooks/useUIActions";
import { useUserTokens } from "~/hooks";
// removed reducer batching; using direct zustand setters
import ModalPortal from "~/components/ModalPortal";
import { CircularProgress } from "./circular-progress";

interface ScratchOffProps {
  cardData: Card | null;
  isDetailView?: boolean;
  onPrizeRevealed?: (prizeAmount: number) => void;
  hasNext?: boolean;
  onNext?: () => void;
}

const ScratchOff = ({
  cardData,
  onPrizeRevealed,
  hasNext,
  onNext,
}: ScratchOffProps) => {
  const user = useUserStore((s) => s.user);
  const bestFriends = useUserStore((s) => s.bestFriends);
  // const setUser = useUserStore((s) => s.setUser); // Not used after schema changes

  const appStats = useAppStore((s) => s.appStats);
  const setAppStats = useAppStore((s) => s.setAppStats);
  const setAppColor = useAppStore((s) => s.setAppColor);
  const setAppBackground = useAppStore((s) => s.setAppBackground);

  const activity = useAppStore((s) => s.activity);
  const setActivity = useAppStore((s) => s.setActivity);

  const cards = useCardStore((s) => s.cards);
  const setCards = useCardStore((s) => s.setCards);
  const updateCardMeta = useCardStore((s) => s.updateCardMeta);
  const showBuyModal = useCardStore((s) => s.showBuyModal);
  const setShowBuyModal = useCardStore((s) => s.setShowBuyModal);

  const { playWinSound, getWinnerGif } = useUIActions();
  const { refetch } = useUserTokens();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scratched, setScratched] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [prizeAmount, setPrizeAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBlurOverlay, setShowBlurOrverlay] = useState(false);
  const [bestFriend] = useState<BestFriend | null>(null);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const linkCopyTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const { actions, haptics } = useMiniApp();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!showBlurOverlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showBlurOverlay]);

  // Mouse handlers for card tilt - memoized for performance
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const percentX = (x / rect.width) * 2 - 1; // -1 to 1
    const percentY = (y / rect.height) * 2 - 1; // -1 to 1
    setTilt({
      x: percentY * 20, // max 20deg up/down
      y: percentX * 20, // max 20deg left/right
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

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
      console.error("Failed to copy to clipboard:", error);
      // Fallback: open in new tab
      window.open(frameUrl, "_blank");
    }
  }, [user, prizeAmount, bestFriend?.username, actions]);

  const getShareUrl = useCallback(() => {
    const baseUrl = process.env.NEXT_PUBLIC_URL;
    return (
      `${baseUrl}/api/frame-share?` +
      new URLSearchParams({
        prize: prizeAmount.toString(),
        username: user?.address || "",
        friend_username: bestFriend?.username || "",
      }).toString()
    );
  }, [prizeAmount, user?.address, bestFriend?.username]);

  const handleWhatsAppShare = useCallback(() => {
    const shareUrl = getShareUrl();
    const shareText =
      prizeAmount > 0
        ? `I just won ${formatCell(prizeAmount, USDC_ADDRESS)}!`
        : `I just won a free card for @${bestFriend?.username}!`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
      shareText + " " + shareUrl
    )}`;
    window.open(whatsappUrl, "_blank");
  }, [getShareUrl, prizeAmount, bestFriend?.username]);

  const handleTelegramShare = useCallback(() => {
    const shareUrl = getShareUrl();
    const shareText =
      prizeAmount > 0
        ? `I just won ${formatCell(prizeAmount, USDC_ADDRESS)}!`
        : `I just won a free card for @${bestFriend?.username}!`;

    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
      shareUrl
    )}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, "_blank");
  }, [getShareUrl, prizeAmount, bestFriend?.username]);

  const handleLinkCopy = useCallback(() => {
    const shareUrl = getShareUrl();

    // Clear any existing timeout
    if (linkCopyTimeoutRef.current) {
      clearTimeout(linkCopyTimeoutRef.current);
    }

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setLinkCopied(true);
        linkCopyTimeoutRef.current = setTimeout(
          () => setLinkCopied(false),
          2000
        );
      })
      .catch(() => {
        // Fallback: open in new tab
        window.open(shareUrl, "_blank");
      });
  }, [getShareUrl]);

  // Debounced scratch detection to prevent excessive API calls
  const {
    debouncedCallback: debouncedScratchDetection,
    cancel: cancelScratchDetection,
  } = useDebouncedScratchDetection(() => {
    if (!cardData || isProcessing) return;

    const prizeAmount = cardData?.prize_amount || 0;
    setPrizeAmount(prizeAmount);
    setShowBlurOrverlay(prizeAmount > 0 || prizeAmount === -1);
    setIsProcessing(true);

    // Update app stats
    // Note: appStats.id field mismatch, handling properly
    setAppStats({
      id: 1,
      cards: appStats?.cards || 0,
      reveals: (appStats?.reveals || 0) + 1,
      winnings: (appStats?.winnings || 0) + (prizeAmount < 0 ? 0 : prizeAmount),
      created_at: typeof appStats?.created_at === 'string' ? appStats.created_at : (appStats?.created_at || new Date()).toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Update card locally
    if (cardData?.id) {
      updateCardMeta(cardData.id, {
        scratched: true,
        scratched_at: new Date(),
        claimed: true,
      });
    } else {
      // fallback: map set
      setCards(
        cards.map((card) =>
          card.id === cardData?.id
            ? { ...card, scratched: true, scratched_at: new Date(), claimed: true }
            : card
        )
      );
    }

    // Update user snapshot - fields removed from schema
    // if (user) {
    //   const newUser = {
    //     ...user,
    //     amount_won: (user.amount_won || 0) + (prizeAmount < 0 ? 0 : prizeAmount),
    //     total_wins: (user.total_wins || 0) + (prizeAmount !== 0 ? 1 : 0),
    //     total_reveals: (user.total_reveals || 0) + 1,
    //     current_level:
    //       getRevealsToNextLevel(user.current_level || 1) === 0
    //         ? (user.current_level || 1) + 1
    //         : user.current_level || 1,
    //     reveals_to_next_level:
    //       (user.reveals_to_next_level || getRevealsToNextLevel(user.current_level || 1)) === 0
    //         ? getRevealsToNextLevel((user.current_level || 1) + 1)
    //         : getRevealsToNextLevel(user.current_level || 1),
    //     last_active: new Date().toISOString(),
    //   };
    //   setUser(newUser);
    // }

    // Update activity list
    // Note: user_wallet field removed from Reveal interface
    setActivity([
      ...activity,
      {
        id: (cardData?.id || "") + new Date().toISOString(),
        prize_amount: prizeAmount < 0 ? 0 : prizeAmount,
        created_at: new Date(),
        username: user?.address,
        pfp: undefined,
        payment_tx: cardData?.payment_tx,
        payout_tx: null,
        won: prizeAmount > 0,
      } as unknown as Reveal,
    ]);

    // Update leaderboard snapshot
    // Note: user_wallet field removed from Card model, can't update leaderboard without it
    // setLeaderboard(
    //   leaderboard.map((lbUser) =>
    //     lbUser.wallet === cardData?.user_wallet
    //       ? {
    //           ...lbUser,
    //           amount_won: (lbUser.amount_won || 0) + (prizeAmount < 0 ? 0 : prizeAmount),
    //           total_wins: (lbUser.total_wins || 0) + (prizeAmount !== 0 ? 1 : 0),
    //           total_reveals: (lbUser.total_reveals || 0) + 1,
    //           current_level:
    //             getRevealsToNextLevel(user?.current_level || 1) === 0
    //               ? (user?.current_level || 1) + 1
    //               : user?.current_level || 1,
    //           reveals_to_next_level:
    //             (user?.reveals_to_next_level ||
    //               getRevealsToNextLevel(user?.current_level || 1)) === 0
    //               ? getRevealsToNextLevel((user?.current_level || 1) + 1)
    //               : getRevealsToNextLevel(user?.current_level || 1),
    //           last_active: new Date().toISOString(),
    //         }
    //       : lbUser
    //   )
    // );

    setScratched(true);
    onPrizeRevealed?.(prizeAmount);

    // Handle background color changes and haptics
    if (prizeAmount > 0 || prizeAmount === -1) {
      setAppColor(APP_COLORS.WON);
      setAppBackground(`linear-gradient(to bottom, #090210, ${APP_COLORS.WON})`);
      haptics.impactOccurred("heavy");
      haptics.notificationOccurred("success");
      // Play win sound
      playWinSound();
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
    } else {
      setAppColor(APP_COLORS.LOST);
      setAppBackground(`linear-gradient(to bottom, #090210, ${APP_COLORS.LOST})`);
    }

    // Process prize immediately
    if (cardData?.id) {
      fetch("/api/cards/process-prize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: cardData.id,
          userWallet: '', // Field removed from Card model
          username: user?.address,
          pfp: undefined,
          userFid: user?.fid,
          friends: bestFriends,
        }),
      })
        .then((response) => response.json())
        .then((processData) => {
          const pa = Number(processData.prizeAmount || 0);
          setPrizeAmount(pa);
          if (processData.success) {
            onPrizeRevealed?.(prizeAmount);

            // If user leveled up and got free cards, refetch user cards
            if (processData.leveledUp && processData.freeCardsAwarded > 0) {
              setTimeout(() => {
                refetch();
              }, 1000); // Wait 1 second for database to be fully updated
            }
          }
        })
        .catch((error) => {
          console.error("Failed to process prize:", error);
        });
    }
  }, 100);

  // Draw the cover image on the canvas with optimized setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Optimized DPI scaling - reduced for better mobile performance
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for mobile
    const scale = devicePixelRatio;

    // Set the actual canvas size to the scaled dimensions
    canvas.width = CANVAS_WIDTH * scale;
    canvas.height = CANVAS_HEIGHT * scale;

    // Scale the canvas back down using CSS
    canvas.style.width = CANVAS_WIDTH + "px";
    canvas.style.height = CANVAS_HEIGHT + "px";
    canvas.style.willChange = "transform";

    // Scale the drawing context so everything draws at the higher resolution
    ctx.scale(scale, scale);

    // Optimized image smoothing settings for mobile
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium"; // Reduced from "high" for better performance
    ctx.textBaseline = "top";

    // Use preloaded image from context
    const coverImg = new window.Image();
    coverImg.src = "/assets/scratch-card-image.png";
    coverImg.onload = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      // Scale the image to fill the entire canvas, removing any borders
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

  // Scratch logic with touch/mouse events instead of pointer events
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

    // Touch events
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

    // Mouse events (fallback)
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
      // Use the actual canvas dimensions (high-DPI scaled)
      const actualWidth = canvas.width;
      const actualHeight = canvas.height;
      const imageData = ctx.getImageData(0, 0, actualWidth, actualHeight);
      let transparent = 0;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] === 0) transparent++;
      }
      const percent = (transparent / (actualWidth * actualHeight)) * 100;

      if (percent > 50 && !scratched && !isProcessing) {
        // Use debounced scratch detection instead of immediate processing
        debouncedScratchDetection();
      }
    };

    // Add touch events (primary for mobile/webview)
    canvas.addEventListener("touchstart", touchStart, { passive: false });
    canvas.addEventListener("touchmove", touchMove, { passive: false });
    canvas.addEventListener("touchend", touchEnd, { passive: false });

    // Add mouse events (fallback for desktop)
    canvas.addEventListener("mousedown", mouseDown);
    document.addEventListener("mousemove", mouseMove);
    document.addEventListener("mouseup", mouseUp);

    return () => {
      // Cancel any pending debounced calls
      cancelScratchDetection();

      // Remove touch events
      canvas.removeEventListener("touchstart", touchStart);
      canvas.removeEventListener("touchmove", touchMove);
      canvas.removeEventListener("touchend", touchEnd);

      // Remove mouse events
      canvas.removeEventListener("mousedown", mouseDown);
      document.removeEventListener("mousemove", mouseMove);
      document.removeEventListener("mouseup", mouseUp);
    };
  }, []);

  useEffect(() => {
    if (cardData && cardData.scratched) {
      if (cardData.prize_amount > 0 || cardData.prize_amount === -1) {
        setAppColor(APP_COLORS.WON);
        setAppBackground(`linear-gradient(to bottom, #090210, ${APP_COLORS.WON})`);
      } else {
        setAppColor(APP_COLORS.LOST);
        setAppBackground(`linear-gradient(to bottom, #090210, ${APP_COLORS.LOST})`);
      }
    }
  }, [cardData, setAppBackground, setAppColor]);

  // Populate best friend state when cardData changes
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
  //   } else {
  //     setBestFriend(null);
  //   }
  // }, [cardData]);

  // Reset all state when component unmounts
  useEffect(() => {
    return () => {
      setScratched(false);
      setPrizeAmount(0);
      setIsProcessing(false);
      setShowBlurOrverlay(false);
      setTilt({ x: 0, y: 0 });
      setCoverImageLoaded(false);
      setLinkCopied(false);

      // Clear any pending timeouts
      if (linkCopyTimeoutRef.current) {
        clearTimeout(linkCopyTimeoutRef.current);
      }

      setAppColor(APP_COLORS.DEFAULT);
      setAppBackground(`linear-gradient(to bottom, #090210, ${APP_COLORS.DEFAULT})`);
    };
  }, []);

  // Pre-scratch banner when the card was shared to the current user
  // Note: shared_from field removed from Card model, replaced with gifter_id relation
  const isPreScratchShared = useMemo(() => false, [cardData, scratched]);

  return (
    <>
      <div
        className="h-full w-full flex flex-col items-center justify-center"
        style={{
          touchAction: !cardData?.scratched && !scratched ? "none" : "auto",
        }}
      >
        <p
          className={`font-[ABCGaisyr] text-center mb-1 font-bold italic rotate-[-4deg] ${isPreScratchShared ? "text-[14px]" : "text-[30px]"
            }`}
          style={{
            visibility:
              cardData?.scratched || scratched || isPreScratchShared
                ? "visible"
                : "hidden",
            color: isPreScratchShared
              ? "#fff"
              : cardData?.prize_amount || prizeAmount
                ? "#fff"
                : "rgba(255, 255, 255, 0.4)",
            textShadow: isPreScratchShared
              ? "none"
              : cardData?.prize_amount || prizeAmount
                ? "0px 0px 1px #00A34F, 0px 0px 2px #00A34F, 0px 0px 6px #00A34F, 0px 0px 12px #00A34F"
                : "none",
          }}
        >
          {isPreScratchShared ? (
            <>
              shared by
              <br />
              <span className="text-[16px]">
                {/* Note: shared_from field removed from Card model */}
                @
              </span>
            </>
          ) : cardData?.prize_amount || prizeAmount ? (
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
              transform: "translateZ(0)", // Force GPU acceleration
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Shadow element below the card */}
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
                (cardData?.scratched || scratched || coverImageLoaded) ? (
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
                                    // Show friend PFP if available
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
                                    // Show amount if no friend PFP
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
              {(!cardData || (!cardData?.scratched && !scratched)) && (
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
            </div>
          </motion.div>
        </div>
      </div>
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
              // Tap outside content to dismiss
              if (e.target === e.currentTarget) {
                setShowBlurOrverlay(false);
              }
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setShowBlurOrverlay(false)}
              className="absolute top-4 left-4 z-10 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              style={{ top: "16px", left: "16px" }}
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
            <motion.div className="flex items-center justify-center gap-2">
              <motion.p className="text-white text-[16px] font-medium leading-[90%]">
                Level 1
              </motion.p>
              <motion.div
                className="bg-white/20 rounded-full"
                style={{ width: "3px", height: "3px" }}
              />

              {/* Circular Progress */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
              >
                <CircularProgress
                  revealsToNextLevel={25}
                  totalRevealsForLevel={getLevelRequirement(2)}
                />
              </motion.div>

              <motion.p className="text-white text-[14px] font-medium leading-[90%] text-center">
                25 wins away from
                level 2
              </motion.p>
            </motion.div>


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
                      onClick={handleWhatsAppShare}
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
                      onClick={handleTelegramShare}
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
                      className={`rounded-full border border-[#fff]/[0.02] bg-[#fff]/[0.08] hover:bg-[#fff]/[0.15] w-[64px] h-[64px] flex items-center justify-center transition-all duration-200`}
                    >
                      <Image
                        src="/assets/farcaster-icon.svg"
                        alt="Farcaster"
                        width={28}
                        height={28}
                      />
                    </button>
                    <button
                      onClick={handleLinkCopy}
                      className={`rounded-full border border-[#fff]/[0.02] w-[64px] h-[64px] flex items-center justify-center transition-all duration-200 ${linkCopied
                        ? `bg-[${APP_COLORS.WON}]/[0.2] border-[${APP_COLORS.WON}]/[0.5]`
                        : "bg-[#fff]/[0.08] hover:bg-[#fff]/[0.15]"
                        }`}
                    >
                      {linkCopied ? (
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M9 12L11 14L15 10"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <Image
                          src="/assets/link-icon.svg"
                          alt="Link"
                          width={28}
                          height={28}
                        />
                      )}
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
              ) : buyCards && !hasNext ? (
                <div className="w-full p-1 rounded-[40px] border border-white">
                  <button
                    onClick={() => {
                      buyCards?.();
                      setShowBlurOrverlay(false);
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

export default memo(ScratchOff);
