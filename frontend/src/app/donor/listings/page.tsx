"use client";

import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { fetchListings } from "@/lib/api";
import { FOOD_TYPES } from "@/lib/contracts";

function UrgencyBar({ score }: { score: string }) {
  // Normalize score: 0 → 0%, 5_000_000+ → 100%
  const raw = parseInt(score || "0", 10);
  const pct = Math.min(100, Math.max(0, (raw / 5_000_000) * 100));

  const getColor = (p: number) => {
    if (p < 30) return "bg-green-500";
    if (p < 65) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-surface-200/50">Urgency</span>
        <span className="text-xs font-mono text-surface-200/70">
          {raw.toLocaleString()}
        </span>
      </div>
      <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor(pct)}`}
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

  if (diff <= 0) return <span className="text-red-400 text-sm">Expired</span>;

  const hours = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return (
      <span className="text-surface-200/70 text-sm">
        {days}d {hours % 24}h left
      </span>
    );
  }

  return (
    <span
      className={`text-sm font-medium ${
        hours < 6 ? "text-red-400" : hours < 12 ? "text-yellow-400" : "text-surface-200/70"
      }`}
    >
      {hours}h {mins}m left
    </span>
  );
}

function ListingCard({ listing }: { listing: any }) {
  const foodType = FOOD_TYPES.find((f) => f.value === listing.foodType);

  return (
    <Link
      href={`/donor/listings/${listing.listingId}`}
      className="card-hover block animate-slide-up"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-lg">
              {foodType?.label || "Food"} — {listing.quantity} kg
            </h3>
            <StatusBadge status={listing.chainStatus} />
          </div>
          <ExpiryCountdown expiryTs={listing.expiryTs} />
        </div>
        <div className="text-right text-xs text-surface-200/30">
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
    refetchInterval: 30_000, // poll every 30s for live urgency
  });

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="text-surface-200/50 mb-6">
            Connect to view your listings
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  const listings = data?.data || [];

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
            <span className="text-surface-200/60">My Listings</span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Listings</h1>
            <p className="text-surface-200/50 mt-1">
              Urgency scores refresh every 30 seconds
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
                <div className="h-6 bg-surface-800 rounded w-1/3 mb-4" />
                <div className="h-2 bg-surface-800 rounded w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card text-center py-12">
            <p className="text-red-400 mb-2">Failed to load listings</p>
            <p className="text-surface-200/50 text-sm">
              Make sure the backend is running at{" "}
              {process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}
            </p>
          </div>
        ) : listings.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-xl font-bold mb-2 text-surface-200">No active listings</h3>
            <p className="text-surface-400 mb-8 max-w-sm">
              You haven't logged any surplus inventory yet. Add your first listing to match with local NGOs.
            </p>
            <Link href="/donor/listings/new" className="btn-primary">
              Log Surplus Food
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing: any) => (
              <ListingCard key={listing.listingId} listing={listing} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
