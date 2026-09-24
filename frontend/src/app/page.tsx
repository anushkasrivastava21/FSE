"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { fetchSystemStats } from "@/lib/api";

export default function HomePage() {
  const { isConnected } = useAccount();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["systemStats"],
    queryFn: fetchSystemStats,
    refetchInterval: 10000,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-surface-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              F
            </div>

            <span className="text-lg font-bold tracking-tight">
              Food Surplus Exchange
            </span>
          </Link>

          <ConnectButton />
        </div>
      </nav>

      <main className="flex-1 px-6 py-12 md:py-24">
        <div className="max-w-7xl mx-auto grid md:grid-cols-[1fr_380px] gap-12 lg:gap-24">
          
          {/* Left Column: Hero & Copy */}
          <div className="flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 text-surface-400 text-sm font-semibold mb-6 uppercase tracking-wider">
              Polygon Amoy Testnet
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Log surplus inventory. <br />
              Dispatch to local NGOs.
            </h1>

            <p className="text-lg text-surface-300 mb-10 max-w-xl leading-relaxed">
              FSE connects donors holding excess food with organizations that need it. 
              Built on transparent on-chain matching algorithms to prioritize delivery speed.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-8 border-t border-surface-800">
              {[
                { label: "Active Listings", value: isLoading ? "..." : stats?.activeListings ?? "0" },
                { label: "Matches Today", value: isLoading ? "..." : stats?.matchesToday ?? "0" },
                { label: "Volume (kg)", value: isLoading ? "..." : (stats?.volume ?? 0).toLocaleString() },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-surface-500">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Portal Navigation Sidebar */}
          <div className="flex flex-col gap-6">
            {!isConnected && (
              <div className="card bg-surface-900/50 border-brand-500/30 mb-2">
                <p className="text-sm text-surface-200 mb-4 font-medium">
                  Connect your wallet to access the exchange.
                </p>
                <ConnectButton />
              </div>
            )}

            {/* Donor Actions */}
            <div className="card">
              <h2 className="text-sm font-bold text-surface-400 uppercase tracking-wider mb-4">Donor Portal</h2>
              <div className="flex flex-col gap-2">
                <Link href="/donor/listings/new" className="btn-primary w-full justify-start">
                  + Log Surplus Food
                </Link>
                <Link href="/donor/listings" className="btn-secondary w-full justify-start">
                  Active Listings
                </Link>
                <Link href="/donor/tokens" className="btn-secondary w-full justify-start">
                  Food Credit Tokens
                </Link>
              </div>
            </div>

            {/* NGO Actions */}
            <div className="card">
              <h2 className="text-sm font-bold text-surface-400 uppercase tracking-wider mb-4">NGO Portal</h2>
              <div className="flex flex-col gap-2">
                <Link href="/ngo/register" className="btn-primary w-full justify-start">
                  + Register NGO
                </Link>
                <Link href="/ngo/orders/new" className="btn-primary w-full justify-start">
                  + Request Delivery
                </Link>
                <Link href="/ngo/orders" className="btn-secondary w-full justify-start">
                  Active Requests
                </Link>
              </div>
            </div>

            {/* Analytics */}
            <div className="card">
              <h2 className="text-sm font-bold text-surface-400 uppercase tracking-wider mb-4">System Data</h2>
              <div className="flex flex-col gap-2">
                <Link href="/analytics" className="btn-secondary w-full justify-start">
                  Live Exchange Ticker
                </Link>
              </div>
            </div>

          </div>
        </div>
      </main>

      <footer className="border-t border-surface-700/30 px-6 py-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-surface-200/30">
          FSE — Built with Solidity, NestJS, Next.js & Polygon
        </div>
      </footer>
    </div>
  );
}
