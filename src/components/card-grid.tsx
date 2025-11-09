"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { chunk3, findWinningRow } from "~/lib/winningRow";
import { formatCell } from "~/lib/formatCell";
import { Card, CardCell } from "~/app/interface/card";
import { PAYMENT_TOKEN } from "~/lib/blockchain";
import { useRouter } from "next/navigation";

interface CardGridProps {
  cards: (Card & { cardState?: 'unscratched' | 'scratched' | 'claimed' })[];
  onCardSelect: (card: Card & { cardState?: 'unscratched' | 'scratched' | 'claimed' }) => void;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export default function CardGrid({
  cards,
  showViewAll = false,
  onViewAll,
}: CardGridProps) {
  const displayCards = showViewAll ? cards.slice(0, 7) : cards;
  const hasMoreCards = showViewAll && cards.length > 7;
  const { push } = useRouter();

  // Helper function to get card opacity based on state
  const getCardOpacity = (card: Card & { cardState?: 'unscratched' | 'scratched' | 'claimed' }) => {
    if (card.cardState === 'unscratched') return 1;
    if (card.cardState === 'scratched' && card.prize_amount > 0) return 1;
    if (card.cardState === 'claimed') return 0.6;
    return 0.35; // Scratched with no prize
  };

  // Helper function to handle card clicks
  const handleCardClick = (card: Card & { cardState?: 'unscratched' | 'scratched' | 'claimed' }) => {
    push(`/?defaultCardId=${card.token_id}`);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-4 gap-4 mx-auto">
        {displayCards.map((card) => (
          <motion.div
            key={card.id}
            layoutId={`card-${card.id}`}
            transition={{
              layout: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
            }}
            className="cursor-pointer h-fit relative"
            style={{
              opacity: getCardOpacity(card),
            }}
            onClick={() => handleCardClick(card)}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              {card.scratched ? (
                <div
                  className={`absolute rotate-[-4deg] font-[ABCGaisyr] text-[28px] inset-0 rounded-lg z-30 flex items-center justify-center font-bold text-center bg-[#000]/20 text-white`}
                  style={{
                    textShadow: "0px 0px 1px rgba(0, 0, 0, 0.15), 0px 0px 2px rgba(0, 0, 0, 0.15), 0px 0px 6px rgba(0, 0, 0, 0.15)",
                  }}
                >
                  {card.prize_amount > 0 ? `${formatCell(card.prize_amount, card.prize_asset_contract || PAYMENT_TOKEN.ADDRESS)}` : ""}
                </div>
              ) : null}

              {/* State Indicator */}
              <div className="absolute top-1 right-1 z-40">
                {card.cardState === 'unscratched' && (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Unscratched" />
                )}
                {card.cardState === 'scratched' && (
                  <div className={`w-2 h-2 rounded-full ${card.prize_amount > 0 ? 'bg-yellow-400' : 'bg-gray-400'}`}
                    title={card.prize_amount > 0 ? "Scratched - Prize Available" : "Scratched - No Prize"} />
                )}
                {card.cardState === 'claimed' && (
                  <div className="w-2 h-2 bg-blue-400 rounded-full" title="Claimed" />
                )}
              </div>
              {card.scratched && card.numbers_json ? (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center rotate-[-4deg]">
                  {(() => {
                    const numbersJson = card.numbers_json as unknown as CardCell[];
                    const rows = chunk3(numbersJson);
                    const winningRowIdx = findWinningRow(
                      numbersJson,
                      card.prize_amount,
                      card.prize_asset_contract || ""
                    );

                    return (
                      <div className="grid grid-rows-4 gap-[1px]">
                        {rows.map((row, index) => {
                          const isWinning = winningRowIdx === index;
                          return (
                            <div
                              key={index}
                              className="grid grid-cols-3 gap-[1px] rotate-1"
                            >
                              {row.map((cell, cellIndex) => (
                                <div
                                  key={`${cell.amount}-${cellIndex}`}
                                  className={`w-[17.5px] h-[17.5px] rounded-[3px] font-[ABCGaisyr] font-bold text-[8px] leading-[90%] italic flex items-center justify-center ${isWinning
                                    ? "!text-[#00A151]/20 !bg-[#00A151]/10"
                                    : "!text-[#000]/10 !bg-[#000]/5"
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
                                        alt={`${cell.friend_username || 'Friend'}`}
                                        width={12}
                                        height={12}
                                        className="rounded-full object-cover"
                                        style={{
                                          width: 12,
                                          height: 12,
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
                                    formatCell(cell.amount, cell.asset_contract || "")
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
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 0,
                  width: 80,
                  height: 102,
                  background: "rgba(0, 0, 0, 0.4)",
                  filter: "blur(8px)",
                  borderRadius: 4,
                  zIndex: 0,
                }}
              />
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <Image
                  src={
                    card.scratched
                      ? "/assets/scratched-card-image.png"
                      : "/assets/scratch-card-image.png"
                  }
                  alt={card.scratched ? "Scratched Card" : "Unscratched Card"}
                  unoptimized
                  priority
                  width={80}
                  height={102}
                />
              </div>
            </motion.div>
          </motion.div>
        ))}

        {/* View All Overlay */}
        {hasMoreCards && (
          <motion.div
            transition={{
              layout: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
            }}
            className="cursor-pointer h-fit relative"
            onClick={onViewAll}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              {/* Darker background overlay */}
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 0,
                  width: 80,
                  height: 102,
                  background: "rgba(0, 0, 0, 0.6)",
                  filter: "blur(8px)",
                  borderRadius: 4,
                  zIndex: 0,
                }}
              />

              {/* Scratched card image */}
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <Image
                  src="/assets/scratched-card-image.png"
                  alt="View All Cards"
                  unoptimized
                  priority
                  width={80}
                  height={102}
                  className="opacity-60"
                />
              </div>

              {/* View All text overlay */}
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center rotate-[-4deg]">
                <p className="text-white font-[ABCGaisyr] text-[14px] font-bold leading-[90%] mb-1 italic">
                  VIEW
                </p>
                <p className="text-white font-[ABCGaisyr] text-[14px] font-bold leading-[90%] italic">
                  ALL
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
