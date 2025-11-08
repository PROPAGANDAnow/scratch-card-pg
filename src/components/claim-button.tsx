import { useMiniApp } from "@neynar/react";
import { motion } from "framer-motion";
import { useCallback } from "react";
import { useClaimSignature, useContractClaiming } from "~/hooks/useContractClaiming";
import { useWallet } from "~/hooks/useWeb3Wallet";
import { ClaimSignature } from "~/lib/blockchain";
import { useAppStore, useCardStore } from "~/stores";

const ClaimPrizeButton = () => {
    const { cards, currentCardIndex } = useCardStore()
    const { address } = useWallet();
    const cardData = cards[currentCardIndex]?.state
    const appColor = useAppStore((s) => s.appColor);
    const { haptics } = useMiniApp();
    const {
        claimPrize,
        // claimPrizeWithBonus,
        // reset: resetClaiming
    } = useContractClaiming();
    const { createSignature } = useClaimSignature();

    // Handle prize claiming on-chain
    const handleClaimPrize = useCallback(async (tokenId: number, claimSignature: ClaimSignature) => {
        if (cardData?.prize_amount === -1) {
            // Claim with bonus for friend
            // await claimPrizeWithBonus(
            //     tokenId,
            //     claimSignature,
            //     address || undefined,
            //     bestFriend.wallet as Address
            // );
        } else {
            // Standard claim
            await claimPrize(
                tokenId,
                claimSignature,
                address || undefined
            );
        }

        haptics.notificationOccurred('success');
    }, []);

    const handleClaimBtnClick = async () => {
        if (!cardData) return;
        const tokenId = cardData.token_id;

        // Generate claim signature for on - chain claiming
        const signature = await createSignature(tokenId);

        if (!signature) {
            throw new Error("signature not found")
        }

        await handleClaimPrize(tokenId, signature)
    }
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
                className="w-full py-2 bg-white/80 rounded-[40px] font-semibold text-[14px] hover:bg-white h-11 transition-colors"
                style={{
                    color: appColor,
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
            >
                Claim Prize
            </motion.button>
        </motion.div>
    )
}

export default ClaimPrizeButton