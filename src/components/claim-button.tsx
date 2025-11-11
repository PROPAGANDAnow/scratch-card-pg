import { useMiniApp } from "@neynar/react";
import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { isAddress, formatUnits } from "viem";
import { CardCell } from "~/app/interface/cardCell";
import { useClaimSignature, useContractClaiming } from "~/hooks/useContractClaiming";
import { useUpdateCardClaimStatus } from "~/hooks/useUpdateCardClaimStatus";
import { useWallet } from "~/hooks/useWeb3Wallet";
import { ClaimSignature, PAYMENT_TOKEN } from "~/lib/blockchain";
import { extractBonusFriendFromNumbers } from "~/lib/token-utils";
import { useAppStore, useCardStore } from "~/stores";

const ClaimPrizeButton = () => {
    const { cards, activeTokenId, setScratched } = useCardStore()
    const { address } = useWallet();
    const [isGeneratingSignature, setIsGeneratingSignature] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    
    // Find current card based on activeTokenId
    const currentCard = activeTokenId ? cards.find(card => card.id === activeTokenId) : null;
    const cardData = currentCard?.state
    const appColor = useAppStore((s) => s.appColor);
    const { haptics } = useMiniApp();
    
    // Calculate prize amount in contract units
    const prizeAmountInContractUnits = cardData?.prize_amount 
        ? BigInt(Math.floor(cardData.prize_amount * Math.pow(10, PAYMENT_TOKEN.DECIMALS)))
        : BigInt(0);
    
    const {
        claimPrize,
        state: claimState,
        claimPrizeWithBonus,
        allowance,
        needsApproval,
        hasSufficientApproval,
        approve,
        approveUnlimited,
        error: claimError,
        // reset: resetClaiming
    } = useContractClaiming(address, prizeAmountInContractUnits);
    
    const { createSignature } = useClaimSignature();
    const { mutateAsync: updateCardClaimStatus, isPending: isUpdatingClaimStatus } = useUpdateCardClaimStatus();
    const bestFriend = currentCard && extractBonusFriendFromNumbers(currentCard?.state.numbers_json as unknown as CardCell[]);
    console.log("🚀 ~ ClaimPrizeButton ~ bestFriend:", bestFriend)

    const handleApprove = useCallback(async () => {
        try {
            await approve(prizeAmountInContractUnits);
            haptics.notificationOccurred('success');
        } catch (error) {
            console.error('Approval failed:', error);
            haptics.notificationOccurred('error');
        }
    }, [approve, prizeAmountInContractUnits, haptics]);

    const handleApproveUnlimited = useCallback(async () => {
        try {
            await approveUnlimited();
            haptics.notificationOccurred('success');
        } catch (error) {
            console.error('Unlimited approval failed:', error);
            haptics.notificationOccurred('error');
        }
    }, [approveUnlimited, haptics]);

    const handleClaimPrize = useCallback(async (tokenId: number, claimSignature: ClaimSignature) => {
        let transactionHash: string;
        if (bestFriend?.wallet && isAddress(bestFriend?.wallet)) {
            // Claim with bonus for friend
            transactionHash = await claimPrizeWithBonus(
                tokenId,
                claimSignature,
                address || undefined,
                bestFriend?.wallet
            );
        } else {
            transactionHash = await claimPrize(
                tokenId,
                claimSignature,
                address || undefined
            );
        }

        haptics.notificationOccurred('success');

        return transactionHash;
    }, [address, claimPrize, claimPrizeWithBonus, haptics, bestFriend?.wallet]);

    const handleClaimBtnClick = async () => {
        if (!cardData) return;
        if (!address) {
            console.error("Wallet address is required to update claim status");
            return;
        }

        // Check if approval is needed first
        if (needsApproval) {
            setShowApprovalModal(true);
            return;
        }

        await performClaim();
    };

    const performClaim = async () => {
        if (!cardData || !address) return;

        const tokenId = cardData.token_id;

        try {
            setIsGeneratingSignature(true);
            setShowApprovalModal(false);

            const signature = await createSignature(tokenId);

            if (!signature) {
                throw new Error("signature not found");
            }

            const transactionHash = await handleClaimPrize(tokenId, signature);

            if (!transactionHash) {
                throw new Error("Transaction hash unavailable after claim");
            }

            await updateCardClaimStatus({
                tokenId,
                claimed: true,
                claimHash: transactionHash,
                claimedBy: address,
            });

            setScratched(false)
        } catch (error) {
            console.error("Failed to process claim", error);
            haptics.notificationOccurred('error');
        } finally {
            setIsGeneratingSignature(false);
        }
    };

    const isClaimProcessing = claimState === 'pending' || claimState === 'confirming';
    const isButtonDisabled = isClaimProcessing || isUpdatingClaimStatus || isGeneratingSignature;
    const claimButtonLabel = isButtonDisabled 
        ? 'Processing…' 
        : needsApproval 
            ? 'Approve & Claim' 
            : 'Claim Prize';

    return (
        <>
            <motion.div
                className="w-full p-1 rounded-[40px] border border-white"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                transition={{
                    type: "spring",
                    stiffness: 700,
                    damping: 45,
                    duration: 0.15,
                }}
            >
                <motion.button
                    onClick={handleClaimBtnClick}
                    className="w-full py-2 bg-white/80 rounded-[40px] font-semibold text-[14px] hover:bg-white disabled:hover:bg-white/80 disabled:opacity-75 disabled:cursor-not-allowed h-11 transition-colors"
                    style={{
                        color: appColor,
                    }}
                    whileTap={isButtonDisabled ? undefined : { scale: 0.98 }}
                    transition={{ duration: 0.1 }}
                    disabled={isButtonDisabled}
                    aria-busy={isButtonDisabled}
                >
                    {claimButtonLabel}
                </motion.button>
            </motion.div>

            {/* Approval Modal */}
            {showApprovalModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold mb-4" style={{ color: appColor }}>
                            Approval Required
                        </h3>
                        
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm font-medium">Prize Amount:</p>
                                <p className="text-lg font-bold">
                                    {cardData?.prize_amount} {PAYMENT_TOKEN.SYMBOL}
                                </p>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-sm font-medium">Current Allowance:</p>
                                <p className="text-lg font-bold">
                                    {formatUnits(allowance, PAYMENT_TOKEN.DECIMALS)} {PAYMENT_TOKEN.SYMBOL}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    Status: {hasSufficientApproval ? '✅ Sufficient' : '❌ Insufficient'}
                                </p>
                            </div>

                            {claimError && (
                                <div className="bg-red-50 p-3 rounded-lg">
                                    <p className="text-sm text-red-600">{claimError}</p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={handleApprove}
                                    disabled={claimState === 'pending'}
                                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
                                >
                                    {claimState === 'pending' ? 'Approving...' : 'Approve Exact'}
                                </button>
                                <button
                                    onClick={handleApproveUnlimited}
                                    disabled={claimState === 'pending'}
                                    className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 text-sm font-medium"
                                >
                                    {claimState === 'pending' ? 'Approving...' : 'Unlimited'}
                                </button>
                            </div>

                            <button
                                onClick={() => setShowApprovalModal(false)}
                                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default ClaimPrizeButton