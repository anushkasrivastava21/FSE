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

  const foodType = FOOD_TYPES.find((f) => f.value === listing?.foodType);
  const qualityTier = QUALITY_TIERS.find((q) => q.value === listing?.qualityTier);
  const expiryDate = listing ? new Date(parseInt(listing.expiryTs, 10) * 1000) : null;
  const isOwner = listing?.donor?.toLowerCase() === address?.toLowerCase();
  const canCancel = isOwner && listing?.chainStatus === "Open";
  const urgency = parseInt(listing?.cachedUrgency || "0", 10);

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
              Listings
            </Link>
            <span className="text-[#8B7E6A] mx-2">/</span>
            <span className="font-mono-wabi text-xs text-[#4A4238] uppercase tracking-wider">
              #{id}
            </span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 flex-1 w-full">
        {!isConnected ? (
          <div className="card text-center py-16">
            <h2 className="font-serif-wabi text-2xl font-bold text-[#2C2620] mb-2">
              Connect Your Wallet
            </h2>
            <p className="font-serif-wabi text-sm text-[#8B7E6A] mb-6">
              Connect your web3 account to review listing details.
            </p>
            <div className="inline-block">
              <ConnectButton />
            </div>
          </div>
        ) : isLoading ? (
          <div className="card text-center py-16 animate-pulse">
            <p className="font-serif-wabi text-lg text-[#8B7E6A]">Loading listing record...</p>
          </div>
        ) : error || !listing ? (
          <div className="card text-center py-12">
            <p className="font-serif-wabi text-lg text-[#A65E3A] mb-4">Listing record not found</p>
            <Link href="/donor/listings" className="btn-secondary">
              ← Return to Listings
            </Link>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[#C8BFB0]/40">
              <div>
                <h1 className="font-serif-wabi text-3xl sm:text-4xl font-bold text-[#2C2620] mb-1.5">
                  {foodType?.label || "Food"} ({listing.quantity} kg)
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
                  <span className="font-mono-wabi text-xs text-[#8B7E6A]">
                    Listing #{listing.listingId}
                  </span>
                </div>
              </div>
              {canCancel && (
                <button
                  onClick={handleCancel}
                  disabled={isPending || isCancelling}
                  className="btn-danger self-start sm:self-auto"
                >
                  {isPending || isCancelling ? "Cancelling..." : "Cancel Listing"}
                </button>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="card p-5">
                <div className="label">Urgency Index</div>
                <div className="font-mono-wabi text-2xl font-bold text-[#A65E3A]">
                  {urgency.toLocaleString()}
                </div>
                <div className="mt-3 h-1.5 bg-[#C8BFB0]/40 rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm transition-all duration-500 bg-gradient-to-r from-[#8B7E6A] via-[#C47952] to-[#A65E3A]"
                    style={{
                      width: `${Math.min(100, Math.max(3, (urgency / 5_000_000) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="card p-5">
                <div className="label">Expiry Horizon</div>
                <div className="font-serif-wabi text-xl font-bold text-[#2C2620]">
                  {expiryDate ? `${expiryDate.toLocaleDateString()} ${expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "N/A"}
                </div>
              </div>

              <div className="card p-5">
                <div className="label">Quality Tier</div>
                <div className="font-serif-wabi text-xl font-bold text-[#2C2620]">
                  {qualityTier?.label || "Standard"}
                </div>
                <div className="font-serif-wabi text-xs text-[#8B7E6A] mt-1">
                  {qualityTier?.description}
                </div>
              </div>

              <div className="card p-5">
                <div className="label">Donor Account</div>
                <div className="font-mono-wabi text-xs text-[#4A4238] break-all">
                  {listing.donor}
                </div>
              </div>
            </div>

            {/* Match Notice */}
            {listing.chainStatus === "Matched" && (
              <div className="card p-6 bg-[#E4DDD1] border-[#8B7E6A]/50 mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#A65E3A]"></span>
                  <h3 className="font-serif-wabi font-bold text-lg text-[#2C2620]">
                    Match Executed on Protocol
                  </h3>
                </div>
                <div className="space-y-2 text-xs font-mono-wabi">
                  <div className="flex justify-between border-b border-[#C8BFB0]/40 pb-2">
                    <span className="text-[#8B7E6A]">Urgency at Match</span>
                    <span className="text-[#2C2620]">{urgency.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-[#8B7E6A]">Custody Stage</span>
                    <span className="text-[#A65E3A] font-semibold">
                      Awaiting NGO pickup / delivery
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Link href="/donor/listings" className="btn-secondary">
              ← Return to My Listings
            </Link>
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
