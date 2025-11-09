import { useMiniApp } from "@neynar/react";
import { motion } from "framer-motion";
import { useCallback } from "react";
import { useClaimSignature, useContractClaiming } from "~/hooks/useContractClaiming";
import { useUpdateCardClaimStatus } from "~/hooks/useUpdateCardClaimStatus";
import { useWallet } from "~/hooks/useWeb3Wallet";
import { ClaimSignature } from "~/lib/blockchain";
import { useAppStore, useCardStore } from "~/stores";

const ClaimPrizeButton = () => {
    const { cards, activeTokenId, setScratched } = useCardStore()
    const { address } = useWallet();
    // Find the current card based on activeTokenId
    const currentCard = activeTokenId ? cards.find(card => card.id === activeTokenId) : null;
    const cardData = currentCard?.state
    const appColor = useAppStore((s) => s.appColor);
    const { haptics } = useMiniApp();
    const {
        claimPrize,
        state: claimState,
        claimPrizeWithBonus,
        // reset: resetClaiming
    } = useContractClaiming();
    const { createSignature } = useClaimSignature();
    const { mutateAsync: updateCardClaimStatus, isPending: isUpdatingClaimStatus } = useUpdateCardClaimStatus();

    const handleClaimPrize = useCallback(async (tokenId: number, claimSignature: ClaimSignature) => {

        let transactionHash: string;
        if (cardData?.prize_amount === -1) {
            if (!address) {
                throw new Error("address is not there")
            }

            // Claim with bonus for friend
            transactionHash = await claimPrizeWithBonus(
                tokenId,
                claimSignature,
                address || undefined,
                address
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
    }, [address, cardData?.prize_amount, claimPrize, haptics]);

    const handleClaimBtnClick = async () => {
        if (!cardData) return;
        if (!address) {
            console.error("Wallet address is required to update claim status");
            return;
        }

        const tokenId = cardData.token_id;

        try {
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
        }
    }

    const isClaimProcessing = claimState === 'pending' || claimState === 'confirming';
    const isButtonDisabled = isClaimProcessing || isUpdatingClaimStatus;
    const claimButtonLabel = isButtonDisabled ? 'Processing…' : 'Claim Prize';

    return (
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
    )
}

export default ClaimPrizeButton