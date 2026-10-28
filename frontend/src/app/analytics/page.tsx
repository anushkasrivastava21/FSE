"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import Link from "next/link";
import toast from "react-hot-toast";
import { fetchDashboardTicker, executeMatching } from "@/lib/api";
import { ForecastRegistryABI, getContractAddresses } from "@/lib/contracts";

export default function AnalyticsPage() {
  const { isConnected } = useAccount();
  const [period, setPeriod] = useState("1");
  const [quantity, setQuantity] = useState("100");
  const [isExecutingMatch, setIsExecutingMatch] = useState(false);
  const [lastMatchResult, setLastMatchResult] = useState<{
    success: boolean;
    message: string;
    txHash?: string;
    matchedCount?: number;
  } | null>(null);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const {
    data: tickerData,
    isLoading: isLoadingTicker,
    refetch: refetchTicker,
  } = useQuery({
    queryKey: ["ticker"],
    queryFn: () => fetchDashboardTicker(),
    refetchInterval: 3000,
  });

  const handleExecuteMatch = async () => {
    setIsExecutingMatch(true);
    setLastMatchResult(null);
    const toastId = toast.loading("Executing Bipartite Matching on-chain...");

    try {
      const res = await executeMatching();
      setLastMatchResult(res);

      if (res.success) {
        toast.success(
          res.message ||
            `Match executed successfully! ${res.matchedCount || 0} pair(s) matched.`,
          { id: toastId, duration: 6000 }
        );
        refetchTicker();
      } else {
        toast(res.message || "No matches executed.", {
          id: toastId,
          icon: "ℹ️",
          duration: 5000,
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || "Failed to execute matching engine";
      toast.error(errorMsg, { id: toastId });
      setLastMatchResult({
        success: false,
        message: errorMsg,
      });
    } finally {
      setIsExecutingMatch(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!period || !quantity) return;

    try {
      const { forecastRegistry } = getContractAddresses();
      writeContract({
        address: forecastRegistry,
        abi: ForecastRegistryABI as any,
        functionName: "submitForecast",
        args: [
          BigInt(Math.floor(Number(period || 0))),
          BigInt(Math.floor(Number(quantity || 0))),
        ],
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit forecast");
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success("Forecast registered on blockchain!");
      setPeriod("");
      setQuantity("");
    }
  }, [isSuccess]);

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
              AI Analytics & Ticker
            </span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-10 flex-1 w-full items-start">
        {/* Left Column: Forecast Registry */}
        <div>
          <div className="mb-6">
            <div className="text-[10px] font-mono-wabi text-[#A65E3A] uppercase tracking-widest mb-1">
              Forecast Registry
            </div>
            <h1 className="font-serif-wabi text-3xl sm:text-4xl font-bold text-[#2C2620]">
              Predictive Demand
            </h1>
            <p className="font-serif-wabi text-base text-[#8B7E6A] mt-1">
              Submit predictive food surplus forecasts directly to the ForecastRegistry smart contract.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card p-8 space-y-6">
            <div className="font-serif-wabi font-semibold text-lg text-[#2C2620] pb-2 border-b border-[#C8BFB0]/40">
              Submit Forecast Period
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Period (e.g. Week #) *</label>
                <input
                  type="number"
                  min="1"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="input-field"
                  placeholder="1"
                  required
                />
              </div>
              <div>
                <label className="label">Predicted Demand (kg) *</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input-field"
                  placeholder="100"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || isConfirming || !period || !quantity}
              className="btn-primary w-full py-3.5 text-xs font-mono-wabi tracking-wider uppercase mt-4"
            >
              {isPending
                ? "Confirm in Wallet..."
                : isConfirming
                ? "Recording on Blockchain..."
                : "+ Submit Forecast to Chain"}
            </button>
          </form>
        </div>

        {/* Right Column: Live Exchange Ticker */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono-wabi text-[#A65E3A] uppercase tracking-widest mb-1">
                Exchange Telemetry
              </div>
              <h2 className="font-serif-wabi text-3xl sm:text-4xl font-bold text-[#2C2620]">
                Live Market Ticker
              </h2>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-[#A65E3A] animate-pulse"></span>
          </div>

          {isLoadingTicker ? (
            <div className="space-y-4 animate-pulse">
              <div className="card h-28 bg-[#C8BFB0]/30" />
              <div className="card h-28 bg-[#C8BFB0]/30" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Ticker Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card text-center p-4">
                  <div className="font-serif-wabi text-3xl font-bold text-[#2C2620]">
                    {tickerData?.totalListings || 0}
                  </div>
                  <div className="font-mono-wabi text-[10px] text-[#8B7E6A] uppercase tracking-wider mt-1">
                    Open Listings
                  </div>
                </div>

                <div className="card text-center p-4">
                  <div className="font-serif-wabi text-3xl font-bold text-[#A65E3A]">
                    {tickerData?.totalOrders || 0}
                  </div>
                  <div className="font-mono-wabi text-[10px] text-[#8B7E6A] uppercase tracking-wider mt-1">
                    Open Orders
                  </div>
                </div>

                <div className="card text-center p-4">
                  <div className="font-serif-wabi text-3xl font-bold text-[#4A4238]">
                    {tickerData?.tradeVolumeToday || 0}
                  </div>
                  <div className="font-mono-wabi text-[10px] text-[#8B7E6A] uppercase tracking-wider mt-1">
                    Matches Executed
                  </div>
                </div>
              </div>

              {/* On-Demand Matching Engine Dispatcher */}
              <div className="card p-5 border border-[#C8BFB0]/80 bg-[#E4DDD1]/25 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif-wabi font-semibold text-base text-[#2C2620]">
                        Matching Engine Dispatcher
                      </span>
                      <span className="badge-pending text-[10px] uppercase tracking-wider">
                        Auto: 30m
                      </span>
                    </div>
                    <p className="font-serif-wabi text-xs text-[#8B7E6A] mt-0.5">
                      Pair open surplus listings with NGO orders sharing matching locations on-chain.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteMatch}
                    disabled={isExecutingMatch}
                    className="btn-primary whitespace-nowrap text-xs font-mono-wabi tracking-wider uppercase px-4 py-2.5 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    {isExecutingMatch ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 border-2 border-[#EEE9E0] border-t-transparent rounded-full animate-spin"></span>
                        <span>Matching Engine Running...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ Run Matching Engine Now</span>
                      </>
                    )}
                  </button>
                </div>

                {lastMatchResult && (
                  <div
                    className={`text-xs font-mono-wabi p-3 rounded-sm border ${
                      lastMatchResult.success
                        ? "bg-[#A65E3A]/10 border-[#A65E3A]/30 text-[#4A4238]"
                        : "bg-[#E4DDD1]/80 border-[#C8BFB0] text-[#8B7E6A]"
                    }`}
                  >
                    <div className="font-semibold">
                      {lastMatchResult.success ? "✓ Execution Complete" : "ℹ Protocol Notice"}
                    </div>
                    <div className="mt-0.5">{lastMatchResult.message}</div>
                    {lastMatchResult.txHash && (
                      <div className="mt-1 text-[11px] truncate text-[#A65E3A]">
                        Tx: {lastMatchResult.txHash}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Recent Trades / Matches */}
              <div>
                <h3 className="font-serif-wabi font-semibold text-lg text-[#2C2620] mb-3">
                  Recent Protocol Matches
                </h3>

                {tickerData?.recentTrades?.length === 0 ? (
                  <div className="card text-center py-10">
                    <p className="font-serif-wabi text-sm text-[#8B7E6A]">
                      No matched trades recorded on the ledger yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {tickerData?.recentTrades?.map((trade: any, idx: number) => (
                      <Link
                        href={`/handoffs/${encodeURIComponent(trade.matchId)}`}
                        key={idx}
                        className="card-hover p-4 flex justify-between items-center transition cursor-pointer"
                      >
                        <div>
                          <div className="font-serif-wabi font-semibold text-base text-[#2C2620]">
                            Match #{trade.matchId ? trade.matchId.slice(0, 10) + "..." : `#${idx + 1}`}
                          </div>
                          <div className="font-mono-wabi text-xs text-[#8B7E6A] mt-0.5">
                            Listing #{trade.listingId} ↔ Order #{trade.orderId}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="badge-matched">
                            Urgency: {trade.urgencyAtMatch}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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
