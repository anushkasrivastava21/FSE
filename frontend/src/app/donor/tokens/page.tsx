"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { fetchTokensByDonor } from "../../../lib/api";

type FoodCreditToken = {
  tokenId: string;
  donorAddress: string;
  matchId: string;
  metadataUri: string;
  txHash: string;
  mintedAt: string;
  createdAt: string;
};

type TokenResponse = {
  donorAddress: string;
  data: FoodCreditToken[];
  total: number;
};

export default function DonorTokensPage() {
  const { address, isConnected } = useAccount();

  const [tokens, setTokens] = useState<FoodCreditToken[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadTokens = useCallback(async () => {
    if (!address) {
      setTokens([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response: TokenResponse = await fetchTokensByDonor(address);
      setTokens(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Food Credit Tokens.",
      );
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  return (
    <div className="min-h-screen flex flex-col bg-[#EEE9E0] text-[#4A4238] font-sans selection:bg-[#C8BFB0] selection:text-[#2C2620]">
      {/* Navigation */}
      <nav className="border-b border-[#C8BFB0]/50 px-6 sm:px-12 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-[#A65E3A] rounded-sm flex items-center justify-center text-[#EEE9E0] font-serif font-bold text-sm shadow-sm select-none">
                余
              </div>
              <span className="font-serif-wabi text-xl font-bold tracking-tight text-[#2C2620] group-hover:opacity-85 transition-opacity">
                Food Surplus Exchange
              </span>
            </Link>
            <span className="text-[#8B7E6A] mx-2">/</span>
            <span className="font-mono-wabi text-xs text-[#8B7E6A] uppercase tracking-wider">
              Food Credit Tokens
            </span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="mb-8 pb-4 border-b border-[#C8BFB0]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono-wabi text-[#A65E3A] uppercase tracking-widest mb-1">
              Soulbound Impact Credits
            </div>
            <h1 className="font-serif-wabi text-3xl sm:text-4xl font-bold text-[#2C2620]">
              Food Credit Token Ledger
            </h1>
            <p className="font-serif-wabi text-base text-[#8B7E6A] mt-1">
              Immutable on-chain verification of surplus food diverted to certified shelter kitchens.
            </p>
          </div>
          {isConnected && (
            <button
              type="button"
              onClick={loadTokens}
              disabled={loading}
              className="btn-secondary self-start sm:self-auto"
            >
              {loading ? "Refreshing..." : "Refresh Ledger"}
            </button>
          )}
        </div>

        {!isConnected ? (
          <div className="card text-center py-16">
            <h2 className="font-serif-wabi text-2xl font-bold text-[#2C2620] mb-2">
              Connect Donor Wallet
            </h2>
            <p className="font-serif-wabi text-sm text-[#8B7E6A] mb-6">
              Connect the wallet address holding your minted Food Credit Tokens.
            </p>
            <div className="inline-block">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <>
            <div className="card p-4 mb-6 bg-[#E4DDD1]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="label !mb-0.5">Connected Donor Wallet</span>
                <span className="font-mono-wabi text-xs text-[#2C2620] break-all">
                  {address}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono-wabi text-xs font-semibold text-[#A65E3A]">
                  {total} {total === 1 ? "credit" : "credits"} minted
                </span>
              </div>
            </div>

            {error && (
              <div className="card border-[#A65E3A]/40 bg-[#A65E3A]/10 p-4 mb-6 text-xs font-mono-wabi text-[#A65E3A]">
                {error}
              </div>
            )}

            {loading && tokens.length === 0 ? (
              <div className="card text-center py-12 animate-pulse">
                <p className="font-serif-wabi text-base text-[#8B7E6A]">
                  Reading Food Credit Token ledger from blockchain...
                </p>
              </div>
            ) : tokens.length === 0 ? (
              <div className="card text-center py-16">
                <h2 className="font-serif-wabi text-2xl font-bold text-[#2C2620] mb-2">
                  No Food Credit Tokens Minted
                </h2>
                <p className="font-serif-wabi text-base text-[#8B7E6A] max-w-md mx-auto">
                  Tokens are automatically minted by the Settlement contract once a donation reaches the Delivered custody state.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tokens.map((token) => (
                  <div key={token.tokenId} className="card p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="font-serif-wabi text-2xl font-bold text-[#2C2620]">
                            Food Credit #{token.tokenId}
                          </span>
                          <span className="badge-settled">Minted</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono-wabi">
                          <div>
                            <div className="text-[#8B7E6A] uppercase tracking-wider mb-1">
                              Match Protocol Hash
                            </div>
                            <div className="text-[#2C2620] break-all font-mono">
                              {token.matchId}
                            </div>
                          </div>

                          <div>
                            <div className="text-[#8B7E6A] uppercase tracking-wider mb-1">
                              Mint Timestamp
                            </div>
                            <div className="text-[#2C2620]">
                              {new Date(Number(token.mintedAt) * 1000).toLocaleString()}
                            </div>
                          </div>

                          <div>
                            <div className="text-[#8B7E6A] uppercase tracking-wider mb-1">
                              Metadata IPFS CID
                            </div>
                            <div className="text-[#2C2620] break-all">
                              {token.metadataUri ||
                                `ipfs://bafkreifse${token.matchId.slice(2, 34)}`}
                            </div>
                          </div>

                          <div>
                            <div className="text-[#8B7E6A] uppercase tracking-wider mb-1">
                              Token Identifier
                            </div>
                            <div className="text-[#2C2620] font-semibold">
                              #{token.tokenId}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2.5 sm:min-w-44">
                        {token.txHash && (
                          <a
                            href={`https://amoy.polygonscan.com/tx/${token.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary text-center"
                          >
                            <span>Polygonscan</span>
                            <span className="text-[#A65E3A]">↗</span>
                          </a>
                        )}

                        <Link
                          href={`/handoffs/${encodeURIComponent(token.matchId)}`}
                          className="btn-secondary text-center"
                        >
                          <span>Custody Trail</span>
                          <span>→</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#C8BFB0]/40 px-6 sm:px-12 py-5 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono-wabi text-[#8B7E6A]">
          <div>Food Surplus Exchange | Web3 Protocol Infrastructure</div>
          <div className="text-xs uppercase tracking-wider">
            Decentralized Allocation & Custody Protocol
          </div>
        </div>
      </footer>
    </div>
  );
}
