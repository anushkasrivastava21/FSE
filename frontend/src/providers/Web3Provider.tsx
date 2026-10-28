"use client";

import { useEffect } from "react";
import {
  connectorsForWallets,
  RainbowKitProvider,
  lightTheme,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http, WagmiProvider } from "wagmi";
import { polygonAmoy, hardhat } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";
const isValidWalletConnectProjectId =
  Boolean(projectId) &&
  projectId !== "demo-fse-project" &&
  projectId.length >= 30;

// Filter out WalletConnect-dependent wallets if no real 32-character Project ID is configured to prevent relay WebSocket interruptions
const walletList = isValidWalletConnectProjectId
  ? [injectedWallet, metaMaskWallet, coinbaseWallet, walletConnectWallet]
  : [injectedWallet];

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: walletList,
    },
  ],
  {
    appName: "Food Surplus Exchange",
    projectId: isValidWalletConnectProjectId ? projectId : "21fef48091f12692cad574a6f775364e",
  }
);

const isLocalhost = process.env.NEXT_PUBLIC_CHAIN_NETWORK === "localhost";
const activeChains = isLocalhost ? [hardhat, polygonAmoy] as const : [polygonAmoy, hardhat] as const;

const config = createConfig({
  connectors,
  chains: activeChains,
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [polygonAmoy.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Suppress unhandled WebSocket subscription drops from third-party RPC / WalletConnect relays
    const handleRejection = (event: PromiseRejectionEvent) => {
      const msg = event?.reason?.message || "";
      if (
        msg.includes("Connection interrupted while trying to subscribe") ||
        msg.includes("WebSocket connection") ||
        msg.includes("Failed to subscribe")
      ) {
        event.preventDefault();
      }
    };

    const handleError = (event: ErrorEvent) => {
      const msg = event?.message || "";
      if (
        msg.includes("Connection interrupted while trying to subscribe") ||
        msg.includes("WebSocket connection") ||
        msg.includes("Failed to subscribe")
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: "#4A4238",
            accentColorForeground: "#EEE9E0",
            borderRadius: "small",
            fontStack: "system",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
