"use client";

import { useState, useEffect } from "react";
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

    const expiryStr = form.expiryTime
      ? `${form.expiryDate}T${form.expiryTime}`
      : `${form.expiryDate}T23:59`;
    const expiryTs = Math.floor(new Date(expiryStr).getTime() / 1000);

    if (expiryTs <= Math.floor(Date.now() / 1000)) {
      toast.error("Expiry must be in the future");
      return;
    }

    const locationHash = keccak256(toBytes(form.location));
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
    } catch (err: any) {
      toast.error(err.message || "Transaction failed");
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success("Listing created on-chain!");
      router.push("/donor/listings");
    }
  }, [isSuccess, router]);

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
            <Link
              href="/donor/listings"
              className="font-mono-wabi text-xs text-[#8B7E6A] uppercase tracking-wider hover:text-[#2C2620] transition-colors"
            >
              My Listings
            </Link>
            <span className="text-[#8B7E6A] mx-2">/</span>
            <span className="font-mono-wabi text-xs text-[#4A4238] uppercase tracking-wider">
              Log Surplus
            </span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12 flex-1 w-full">
        {!isConnected ? (
          <div className="card text-center py-16">
            <h2 className="font-serif-wabi text-2xl font-bold text-[#2C2620] mb-2">
              Connect Your Wallet
            </h2>
            <p className="font-serif-wabi text-sm text-[#8B7E6A] mb-6">
              Connect your web3 account to create surplus food listings.
            </p>
            <div className="inline-block">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="font-serif-wabi text-3xl sm:text-4xl font-bold text-[#2C2620] mb-1">
                Log Surplus Food
              </h1>
              <p className="font-serif-wabi text-base text-[#8B7E6A]">
                Record inventory on-chain for algorithmic bipartite matching with local NGO demand.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="card p-8 space-y-6">
              {/* Food Type */}
              <div>
                <label className="label">Food Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {FOOD_TYPES.map((ft) => (
                    <button
                      key={ft.value}
                      type="button"
                      onClick={() => updateField("foodType", ft.value)}
                      className={`px-3 py-2.5 rounded-sm border text-xs font-mono-wabi tracking-wide transition-colors ${
                        form.foodType === ft.value
                          ? "bg-[#4A4238] border-[#4A4238] text-[#EEE9E0]"
                          : "bg-[#EEE9E0] border-[#C8BFB0] text-[#4A4238] hover:bg-[#C8BFB0]/30"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Expiry Date *</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => updateField("expiryDate", e.target.value)}
                    className="input-field font-mono-wabi text-sm"
                  />
                </div>
                <div>
                  <label className="label">Expiry Time</label>
                  <input
                    type="time"
                    value={form.expiryTime}
                    onChange={(e) => updateField("expiryTime", e.target.value)}
                    className="input-field font-mono-wabi text-sm"
                  />
                </div>
              </div>

              {/* Quality Tier */}
              <div>
                <label className="label">Quality Tier *</label>
                <div className="space-y-2.5">
                  {QUALITY_TIERS.map((qt) => (
                    <button
                      key={qt.value}
                      type="button"
                      onClick={() => updateField("qualityTier", qt.value)}
                      className={`w-full text-left px-4 py-3 rounded-sm border transition-colors ${
                        form.qualityTier === qt.value
                          ? "bg-[#EEE9E0] border-[#8B7E6A] shadow-sm ring-1 ring-[#8B7E6A]/50"
                          : "bg-[#EEE9E0]/60 border-[#C8BFB0] hover:border-[#8B7E6A]/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif-wabi font-semibold text-base text-[#2C2620]">
                          {qt.label}
                        </span>
                        <span className="text-xs font-mono-wabi text-[#8B7E6A]">
                          Tier {qt.value}
                        </span>
                      </div>
                      <p className="font-serif-wabi text-xs text-[#8B7E6A] mt-0.5">
                        {qt.description}
                      </p>
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
                <p className="font-mono-wabi text-[11px] text-[#8B7E6A] mt-1.5">
                  Hashed on-chain to match with NGOs in the same delivery perimeter
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="label">Batch Notes (optional)</label>
                <textarea
                  rows={3}
                  placeholder="Packaging details, allergen notes, storage guidelines..."
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className="input-field resize-none"
                />
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending || isConfirming}
                  className="btn-primary w-full py-3.5 text-xs font-mono-wabi tracking-wider uppercase"
                >
                  {isPending
                    ? "Confirm in Wallet..."
                    : isConfirming
                    ? "Recording on Blockchain..."
                    : "+ Submit Surplus Listing"}
                </button>
              </div>
            </form>
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
