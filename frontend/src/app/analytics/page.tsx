"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import Link from "next/link";
import toast from "react-hot-toast";
import { fetchForecasts } from "@/lib/api";
import { ForecastRegistryABI, getContractAddresses } from "@/lib/contracts";

export default function AnalyticsPage() {
  const { isConnected, address } = useAccount();
  const [location, setLocation] = useState("Mumbai");
  const [quantity, setQuantity] = useState("100");
  const [foodType, setFoodType] = useState("1");
  const [confidence, setConfidence] = useState("85");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const { data: forecastsData, isLoading } = useQuery({
    queryKey: ["forecasts", location],
    queryFn: () => fetchForecasts(location),
    enabled: !!location,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !quantity || !foodType || !confidence) return;

    try {
      const { forecastRegistry } = getContractAddresses();
      writeContract({
        address: forecastRegistry,
        abi: ForecastRegistryABI,
        functionName: "submitForecast",
        args: [
          location,
          BigInt(quantity),
          BigInt(foodType),
          BigInt(confidence)
        ],
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit forecast");
    }
  };

  if (isSuccess) {
    toast.success("Forecast submitted to blockchain!");
  }

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
            <span className="text-surface-200/60">AI Analytics</span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 animate-fade-in grid md:grid-cols-2 gap-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Predictive Analytics</h1>
          <p className="text-surface-200/50 mb-8">
            Submit food surplus forecasts to the blockchain and view historical predictions.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6 card">
            <h2 className="text-xl font-semibold mb-4">Submit New Forecast</h2>
            <div>
              <label className="label">Location (Region/City)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input-field"
                placeholder="e.g. Mumbai"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Predicted Qty (kg)</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Confidence (%)</label>
                <input
                  type="number"
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                  className="input-field"
                  max="100"
                />
              </div>
            </div>
            <div>
              <label className="label">Food Type Code</label>
              <input
                type="number"
                value={foodType}
                onChange={(e) => setFoodType(e.target.value)}
                className="input-field"
              />
            </div>
            
            <button
              type="submit"
              disabled={isPending || isConfirming || !isConnected}
              className="btn-primary w-full mt-4 py-3"
            >
              {!isConnected 
                ? "Connect Wallet to Submit" 
                : isPending 
                ? "Waiting..." 
                : isConfirming 
                ? "Confirming on-chain..." 
                : "Submit Forecast"}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Insights for {location}</h2>
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card h-24 bg-surface-800/50" />
              ))}
            </div>
          ) : forecastsData?.data?.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-surface-200/50">No forecasts found for this location.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {forecastsData?.data?.map((forecast: any, idx: number) => (
                <div key={idx} className="card">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-lg">{forecast.predictedQuantity} kg</span>
                    <span className="badge badge-open">{forecast.confidenceScore}% Confidence</span>
                  </div>
                  <div className="text-sm text-surface-200/60">
                    Food Type: {forecast.foodType}
                  </div>
                  <div className="text-xs text-surface-200/40 mt-3 font-mono break-all">
                    By: {forecast.oracleAddress}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
