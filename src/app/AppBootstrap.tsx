"use client";
import { FC, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniApp } from "@neynar/react";
import { useUserStore } from "~/stores/user-store";
import { useAppStore } from "~/stores/app-store";

interface Props {
    children: React.ReactNode;
}

export const AppBootstrap: FC<Props> = ({ children }) => {
    const { context } = useMiniApp();
    const setHasProvider = useUserStore((s) => s.setHasProvider);
    const setPublicKey = useUserStore((s) => s.setPublicKey);
    const setUser = useUserStore((s) => s.setUser);
    const setIsInMiniApp = useAppStore((s) => s.setIsInMiniApp);

    useEffect(() => {
        const init = async () => {
            try {
                const provider = await sdk.wallet.getEthereumProvider();
                setHasProvider(!!provider);

                const isInMiniApp = await sdk.isInMiniApp();
                setIsInMiniApp(isInMiniApp);

                const accounts = (await provider?.request({ method: "eth_accounts" })) as string[];
                const userAddress = accounts?.[0] || "";
                if (userAddress) setPublicKey(userAddress);

                const user = context?.user;
                if (userAddress && user?.fid) {
                    await checkAndCreateUser(userAddress, user.fid, user.username || "", user?.pfpUrl || "");
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error("Bootstrap init failed", err);
            }
        };

        const checkAndCreateUser = async (
            userWallet: string,
            fid: number,
            username: string,
            pfp: string
        ) => {
            try {
                const response = await fetch("/api/users/check-or-create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userWallet, fid, username, pfp }),
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                } else {
                    // eslint-disable-next-line no-console
                    console.error("Failed to check/create user");
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error("Error checking/creating user:", error);
            }
        };

        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <>{children}</>;
};

export default AppBootstrap;


