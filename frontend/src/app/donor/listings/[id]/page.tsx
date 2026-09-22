"use client";

import { useParams } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import toast from "react-hot-toast";
import { fetchListing } from "@/lib/api";
import {
  ListingABI,
  getContractAddresses,
  FOOD_TYPES,
  QUALITY_TIERS,
} from "@/lib/contracts";

export default function ListingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { isConnected, address } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isCancelling } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListing(id),
    refetchInterval: 15_000,
  });

  const handleCancel = async () => {
    try {
      const { listing: listingAddr } = getContractAddresses();
      writeContract({
        address: listingAddr,
        abi: ListingABI,
        functionName: "cancelListing",
        args: [BigInt(id)],
      });
      toast.success("Cancel transaction submitted");
    } catch (err: any) {
      toast.error(err.message || "Cancel failed");
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-surface-200/50">Loading listing...</div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center py-12">
          <p className="text-red-400 mb-2">Listing not found</p>
          <Link href="/donor/listings" className="btn-secondary mt-4">
            ← Back to listings
          </Link>
        </div>
      </div>
    );
  }

  const foodType = FOOD_TYPES.find((f) => f.value === listing.foodType);
  const qualityTier = QUALITY_TIERS.find((q) => q.value === listing.qualityTier);
  const expiryDate = new Date(parseInt(listing.expiryTs, 10) * 1000);
  const isOwner = listing.donor?.toLowerCase() === address?.toLowerCase();
  const canCancel = isOwner && listing.chainStatus === "Open";
  const urgency = parseInt(listing.cachedUrgency || "0", 10);

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
            <Link href="/donor/listings" className="text-surface-200/60 hover:text-white transition-colors">
              Listings
            </Link>
            <span className="text-surface-200/30 mx-2">/</span>
            <span className="text-surface-200/60">#{id}</span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {foodType?.label || "Food"} — {listing.quantity} kg
            </h1>
            <div className="flex items-center gap-3">
              <span
                className={`badge ${
                  listing.chainStatus === "Open"
                    ? "badge-open"
                    : listing.chainStatus === "Matched"
                    ? "badge-matched"
                    : listing.chainStatus === "Settled"
                    ? "badge-settled"
                    : listing.chainStatus === "Expired"
                    ? "badge-expired"
                    : "badge-cancelled"
                }`}
              >
                {listing.chainStatus}
              </span>
              <span className="text-sm text-surface-200/50">
                Listing #{listing.listingId}
              </span>
            </div>
          </div>
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={isPending || isCancelling}
              className="btn-danger"
            >
              {isPending || isCancelling ? "Cancelling..." : "Cancel Listing"}
            </button>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="card">
            <div className="text-sm text-surface-200/50 mb-1">Urgency Score</div>
            <div className="text-2xl font-bold font-mono text-brand-400">
              {urgency.toLocaleString()}
            </div>
            <div className="mt-3 h-2 bg-surface-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  urgency < 500_000
                    ? "bg-green-500"
                    : urgency < 2_000_000
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{
                  width: `${Math.min(100, Math.max(3, (urgency / 5_000_000) * 100))}%`,
                }}
              />
            </div>
          </div>

          <div className="card">
            <div className="text-sm text-surface-200/50 mb-1">Expires</div>
            <div className="text-xl font-semibold">
              {expiryDate.toLocaleDateString()} {expiryDate.toLocaleTimeString()}
            </div>
          </div>

          <div className="card">
            <div className="text-sm text-surface-200/50 mb-1">Quality Tier</div>
            <div className="text-xl font-semibold">{qualityTier?.label || "—"}</div>
            <div className="text-sm text-surface-200/40 mt-1">
              {qualityTier?.description}
            </div>
          </div>

          <div className="card">
            <div className="text-sm text-surface-200/50 mb-1">Donor</div>
            <div className="text-sm font-mono text-surface-200/70 break-all">
              {listing.donor}
            </div>
          </div>
        </div>

        {/* Match confirmation */}
        {listing.chainStatus === "Matched" && (
          <div className="card border-blue-500/30 bg-blue-500/5 mb-8">
            <h3 className="text-lg font-semibold text-blue-400 mb-4">
              ✅ Match Confirmed
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-200/50">Urgency at Match</span>
                <span className="font-mono">{urgency.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-200/50">Status</span>
                <span className="text-blue-400 font-medium">
                  Awaiting handoff by NGO
                </span>
              </div>
            </div>
          </div>
        )}

        <Link
          href="/donor/listings"
          className="btn-secondary"
        >
          ← Back to My Listings
        </Link>
      </main>
    </div>
  );
}
