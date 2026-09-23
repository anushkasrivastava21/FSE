"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import Link from "next/link";
import toast from "react-hot-toast";
import { fetchDashboardTicker, fetchForecastsPending } from "@/lib/api";
import { ForecastRegistryABI, getContractAddresses } from "@/lib/contracts";

export default function AnalyticsPage() {
  const { isConnected, address } = useAccount();
  const [period, setPeriod] = useState("1");
  const [quantity, setQuantity] = useState("100");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const { data: tickerData, isLoading: isLoadingTicker } = useQuery({
    queryKey: ["ticker"],
    queryFn: () => fetchDashboardTicker(),
    refetchInterval: 15_000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!period || !quantity) return;

    try {
      const { forecastRegistry } = getContractAddresses();
      writeContract({
        address: forecastRegistry,
        abi: ForecastRegistryABI,
        functionName: "submitForecast",
        args: [BigInt(period), BigInt(quantity)],
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit forecast");
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success("Forecast submitted to blockchain!");
      setPeriod("");
      setQuantity("");
    }
  }, [isSuccess]);

  return (
    <div className="min-h-screen">
      <nav className="border-b border-surface-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                F
              </div>
              <span className="text-lg font-bold tracking-tight">FSE</span>
            </Link>
            <span className="text-surface-200/30 mx-2">/</span>
            <span className="text-surface-200/60">AI Analytics & Ticker</span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Predictive Analytics</h1>
          <p className="text-surface-400 mb-8">
            Submit food surplus forecasts to the blockchain and view historical predictions.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6 card">
            <h2 className="text-xl font-semibold mb-4">Submit New Forecast</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Period (e.g., Week #)</label>
                <input
                  type="number"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Predicted Demand (kg)</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isPending || isConfirming || !period || !quantity}
              className="btn-primary w-full mt-4 py-3 text-lg"
            >
              {isPending
                ? "Please confirm in your wallet..."
                : isConfirming
                ? "Confirming on-chain..."
                : "Submit Forecast"}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Live Exchange Ticker</h2>
          {isLoadingTicker ? (
            <div className="animate-pulse space-y-4">
              <div className="card h-24 bg-surface-800/50" />
              <div className="card h-24 bg-surface-800/50" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="card text-center p-4">
                  <div className="text-3xl font-bold text-brand-400">{tickerData?.totalListings || 0}</div>
                  <div className="text-xs text-surface-200/50 mt-1 uppercase tracking-wider">Open Listings</div>
                </div>
                <div className="card text-center p-4">
                  <div className="text-3xl font-bold text-blue-400">{tickerData?.totalOrders || 0}</div>
                  <div className="text-xs text-surface-200/50 mt-1 uppercase tracking-wider">Open Demand</div>
                </div>
                <div className="card text-center p-4">
                  <div className="text-3xl font-bold text-green-400">{tickerData?.tradeVolumeToday || 0}</div>
                  <div className="text-xs text-surface-200/50 mt-1 uppercase tracking-wider">Trades Today</div>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-3">Recent Matches</h3>
              {tickerData?.recentTrades?.length === 0 ? (
                <div className="card text-center py-8">
                  <p className="text-surface-200/50">No matches executed yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickerData?.recentTrades?.map((trade: any, idx: number) => (
                    <div key={idx} className="card p-4 flex justify-between items-center">
                      <div>
                        <div className="font-semibold">Match #{trade.id}</div>
                        <div className="text-xs text-surface-200/50 font-mono mt-1">Listing {trade.listingId} ↔ Order {trade.orderId}</div>
                      </div>
                      <div className="text-right">
                        <div className="badge badge-matched">Urgency: {trade.urgencyScoreAtMatch}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
