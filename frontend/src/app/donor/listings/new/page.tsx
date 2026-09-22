"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toBytes } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  ListingABI,
  getContractAddresses,
  FOOD_TYPES,
  QUALITY_TIERS,
} from "@/lib/contracts";

export default function NewListingPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [form, setForm] = useState({
    foodType: 0,
    quantity: "",
    expiryDate: "",
    expiryTime: "",
    qualityTier: 0,
    location: "",
    description: "",
  });

  const updateField = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.quantity || !form.expiryDate || !form.location) {
      toast.error("Please fill in all required fields");
      return;
    }

    const qty = parseInt(form.quantity, 10);
    if (qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    // Build expiry timestamp
    const expiryStr = form.expiryTime
      ? `${form.expiryDate}T${form.expiryTime}`
      : `${form.expiryDate}T23:59`;
    const expiryTs = Math.floor(new Date(expiryStr).getTime() / 1000);

    if (expiryTs <= Math.floor(Date.now() / 1000)) {
      toast.error("Expiry must be in the future");
      return;
    }

    // Hash the location/region for on-chain storage
    const locationHash = keccak256(toBytes(form.location));

    // For MVP, metadataURI is the description text or empty
    const metadataURI = form.description || "";

    try {
      const { listing } = getContractAddresses();

      writeContract({
        address: listing,
        abi: ListingABI,
        functionName: "createListing",
        args: [
          form.foodType,
          BigInt(qty),
          BigInt(expiryTs),
          form.qualityTier,
          locationHash,
          metadataURI,
        ],
      });

      toast.success("Transaction submitted!");
    } catch (err: any) {
      toast.error(err.message || "Transaction failed");
    }
  };

  // Redirect on success
  if (isSuccess) {
    toast.success("Listing created on-chain! 🎉");
    router.push("/donor/listings");
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="text-surface-200/50 mb-6">
            You need to connect your wallet to create a listing
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Nav */}
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
            <span className="text-surface-200/60">New Listing</span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">List Surplus Food</h1>
        <p className="text-surface-200/50 mb-8">
          Create an on-chain listing. The matching engine will automatically
          find the best NGO based on urgency scoring.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Food Type */}
          <div>
            <label className="label">Food Type *</label>
            <div className="grid grid-cols-3 gap-3">
              {FOOD_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => updateField("foodType", ft.value)}
                  className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    form.foodType === ft.value
                      ? "bg-brand-600/20 border-brand-500 text-brand-400"
                      : "bg-surface-850 border-surface-700 text-surface-200/70 hover:border-surface-200/30"
                  }`}
                >
                  {ft.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="label">Quantity (kg) *</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 50"
              value={form.quantity}
              onChange={(e) => updateField("quantity", e.target.value)}
              className="input-field"
            />
          </div>

          {/* Expiry */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Expiry Date *</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => updateField("expiryDate", e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Expiry Time</label>
              <input
                type="time"
                value={form.expiryTime}
                onChange={(e) => updateField("expiryTime", e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Quality Tier */}
          <div>
            <label className="label">Quality Tier *</label>
            <div className="space-y-3">
              {QUALITY_TIERS.map((qt) => (
                <button
                  key={qt.value}
                  type="button"
                  onClick={() => updateField("qualityTier", qt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    form.qualityTier === qt.value
                      ? "bg-brand-600/20 border-brand-500"
                      : "bg-surface-850 border-surface-700 hover:border-surface-200/30"
                  }`}
                >
                  <span
                    className={`font-medium ${
                      form.qualityTier === qt.value
                        ? "text-brand-400"
                        : "text-white"
                    }`}
                  >
                    {qt.label}
                  </span>
                  <span className="text-sm text-surface-200/50 ml-2">
                    — {qt.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="label">Pickup Region / Pincode *</label>
            <input
              type="text"
              placeholder="e.g. 400001 or Mumbai Central"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              className="input-field"
            />
            <p className="text-xs text-surface-200/30 mt-2">
              This is hashed on-chain to match with nearby NGOs
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description (optional)</label>
            <textarea
              rows={3}
              placeholder="Any additional details about the food..."
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              className="input-field resize-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isPending || isConfirming}
              className="btn-primary w-full text-lg py-4"
            >
              {isPending
                ? "Waiting for wallet..."
                : isConfirming
                ? "Confirming on-chain..."
                : "🚀 Create Listing"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
