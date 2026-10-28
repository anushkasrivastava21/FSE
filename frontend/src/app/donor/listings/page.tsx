"use client";

import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { fetchListings } from "@/lib/api";
import { FOOD_TYPES } from "@/lib/contracts";

function UrgencyBar({ score }: { score: string }) {
  const raw = parseInt(score || "0", 10);
  const pct = Math.min(100, Math.max(0, (raw / 5_000_000) * 100));

  return (
    <div className="w-full mt-3 pt-3 border-t border-[#C8BFB0]/40">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-mono-wabi text-[#8B7E6A] uppercase tracking-wider">
          Urgency Index
        </span>
        <span className="text-xs font-mono-wabi text-[#4A4238] font-medium">
          {raw.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 bg-[#C8BFB0]/40 rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm transition-all duration-500 bg-gradient-to-r from-[#8B7E6A] via-[#C47952] to-[#A65E3A]"
          style={{ width: `${Math.max(3, pct)}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    Open: "badge-open",
    Matched: "badge-matched",
    Settled: "badge-settled",
    Expired: "badge-expired",
    Cancelled: "badge-cancelled",
  };
  return <span className={cls[status] || "badge"}>{status}</span>;
}

function ExpiryCountdown({ expiryTs }: { expiryTs: string }) {
  const now = Math.floor(Date.now() / 1000);
  const expiry = parseInt(expiryTs, 10);
  const diff = expiry - now;

  if (diff <= 0) {
    return <span className="font-mono-wabi text-xs text-[#A65E3A] font-medium">Expired</span>;
  }

  const hours = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return (
      <span className="font-mono-wabi text-xs text-[#8B7E6A]">
        {days}d {hours % 24}h remaining
      </span>
    );
  }

  return (
    <span
      className={`font-mono-wabi text-xs ${
        hours < 6 ? "text-[#A65E3A] font-bold" : "text-[#8B7E6A]"
      }`}
    >
      {hours}h {mins}m remaining
    </span>
  );
}

function ListingCard({ listing }: { listing: any }) {
  const foodType = FOOD_TYPES.find((f) => f.value === listing.foodType);

  return (
    <Link
      href={`/donor/listings/${listing.listingId}`}
      className="card-hover block p-5 rounded-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-serif-wabi font-semibold text-xl text-[#2C2620]">
              {foodType?.label || "Food"} ({listing.quantity} kg)
            </h3>
            <StatusBadge status={listing.chainStatus} />
          </div>
          <ExpiryCountdown expiryTs={listing.expiryTs} />
        </div>
        <div className="text-right font-mono-wabi text-xs text-[#8B7E6A]">
          #{listing.listingId}
        </div>
      </div>
      <UrgencyBar score={listing.cachedUrgency} />
    </Link>
  );
}

export default function MyListingsPage() {
  const { address, isConnected } = useAccount();

  const { data, isLoading, error } = useQuery({
    queryKey: ["listings", address],
    queryFn: () => fetchListings({ donor: address }),
    enabled: !!address,
    refetchInterval: 30_000,
  });

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
              My Listings
            </span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 w-full">
        {!isConnected ? (
          <div className="card text-center py-16">
            <h2 className="font-serif-wabi text-2xl font-bold text-[#2C2620] mb-2">
              Connect Your Wallet
            </h2>
            <p className="font-serif-wabi text-sm text-[#8B7E6A] mb-6">
              Connect your web3 account to review your logged surplus inventory.
            </p>
            <div className="inline-block">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#C8BFB0]/40">
              <div>
                <h1 className="font-serif-wabi text-3xl sm:text-4xl font-bold text-[#2C2620]">
                  My Listings
                </h1>
                <p className="font-serif-wabi text-base text-[#8B7E6A] mt-1">
                  Urgency scores refresh automatically every 30 seconds
                </p>
              </div>
              <Link href="/donor/listings/new" className="btn-primary">
                + New Listing
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="h-6 bg-[#C8BFB0]/40 rounded w-1/3 mb-4" />
                    <div className="h-2 bg-[#C8BFB0]/40 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="card text-center py-12">
                <p className="font-serif-wabi text-lg text-[#A65E3A] mb-1">
                  Unable to connect to indexer
                </p>
                <p className="font-mono-wabi text-xs text-[#8B7E6A]">
                  Ensure backend service is running on port 3001
                </p>
              </div>
            ) : !data?.data || data.data.length === 0 ? (
              <div className="card flex flex-col items-center justify-center py-16 text-center">
                <h3 className="font-serif-wabi text-2xl font-bold mb-2 text-[#2C2620]">
                  No active listings recorded
                </h3>
                <p className="font-serif-wabi text-base text-[#8B7E6A] mb-6 max-w-sm">
                  You haven&apos;t logged any surplus inventory yet. Add your first listing to match with local NGOs.
                </p>
                <Link href="/donor/listings/new" className="btn-primary">
                  + Log Surplus Food
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {data.data.map((listing: any) => (
                  <ListingCard key={listing.listingId} listing={listing} />
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
