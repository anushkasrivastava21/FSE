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
      const response: TokenResponse =
        await fetchTokensByDonor(address);

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
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/"
            className="text-surface-200/60 hover:text-white transition"
          >
            ← Home
          </Link>

          <ConnectButton />
        </div>

        <div className="mb-8">
          <div className="text-brand-400 text-sm font-semibold uppercase tracking-wider mb-2">
            Donor Portal
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            Food Credit Token History
          </h1>

          <p className="text-surface-200/60 leading-relaxed">
            View the Food Credit Tokens minted for your completed food
            donations.
          </p>
        </div>

        {!isConnected ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4">🔐</div>

            <h2 className="text-xl font-bold mb-2">
              Connect your donor wallet
            </h2>

            <p className="text-surface-200/60 mb-6">
              Connect the wallet that receives Food Credit Tokens.
            </p>

            <ConnectButton />
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-surface-700/50 bg-surface-800/30 px-4 py-3 mb-6">
              <div className="text-xs text-surface-200/40 mb-1">
                Donor wallet
              </div>

              <div className="font-mono text-sm break-all">
                {address}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-6 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-surface-200/50">
                {total} {total === 1 ? "token" : "tokens"} minted
              </div>

              <button
                type="button"
                onClick={loadTokens}
                disabled={loading}
                className="btn-secondary text-sm"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {loading && tokens.length === 0 ? (
              <div className="card text-center py-12 text-surface-200/50">
                Loading Food Credit Token history...
              </div>
            ) : tokens.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-4xl mb-4">🏅</div>

                <h2 className="text-xl font-bold mb-2">
                  No Food Credit Tokens yet
                </h2>

                <p className="text-surface-200/50 max-w-lg mx-auto">
                  Tokens appear here after a matched donation reaches the
                  Delivered stage and Settlement confirms the delivery.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tokens.map((token) => (
                  <div
                    key={token.tokenId}
                    className="card"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span className="text-xl font-bold">
                            Food Credit #{token.tokenId}
                          </span>

                          <span className="inline-flex items-center rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-300">
                            Minted
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                          <div>
                            <div className="text-xs text-surface-200/40 mb-1">
                              Match ID
                            </div>

                            <div className="font-mono text-xs break-all">
                              {token.matchId}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-surface-200/40 mb-1">
                              Minted
                            </div>

                            <div>
                              {new Date(
                                Number(token.mintedAt) * 1000,
                              ).toLocaleString()}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-surface-200/40 mb-1">
                              Metadata URI
                            </div>

                            <div className="break-all text-surface-200/70">
                              {token.metadataUri || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-surface-200/40 mb-1">
                              Token ID
                            </div>

                            <div className="font-mono">
                              {token.tokenId}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 lg:min-w-48">
                        {token.txHash && (
                          <a
                            href={`https://amoy.polygonscan.com/tx/${token.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary text-center"
                          >
                            View Mint Transaction →
                          </a>
                        )}

                        <Link
                          href={`/handoffs/${encodeURIComponent(
                            token.matchId,
                          )}`}
                          className="btn-secondary text-center"
                        >
                          View Custody Trail →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-8 text-xs text-surface-200/40 leading-relaxed">
          Food Credit Tokens are minted by Settlement when a matched
          donation reaches Delivered. This page reads the indexed mint
          history for the connected donor wallet.
        </div>
      </div>
    </main>
  );
}
