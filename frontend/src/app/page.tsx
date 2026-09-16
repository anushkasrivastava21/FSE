"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import Link from "next/link";

export default function HomePage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-surface-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              F
            </div>
            <span className="text-lg font-bold tracking-tight">
              Food Surplus Exchange
            </span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
            Live on Polygon Amoy Testnet
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Reduce food waste.
            <br />
            <span className="text-brand-400">Feed communities.</span>
          </h1>

          <p className="text-xl text-surface-200/70 mb-10 max-w-lg mx-auto leading-relaxed">
            A decentralized exchange matching surplus food donors with NGOs
            using urgency-scored, transparent matching — verified on-chain.
          </p>

          {isConnected ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/donor/listings" className="btn-primary text-lg px-8 py-4">
                📦 View My Listings
              </Link>
              <Link href="/donor/listings/new" className="btn-secondary text-lg px-8 py-4">
                ✨ List Surplus Food
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-surface-200/50 text-sm">
                Connect your wallet to start listing surplus food
              </p>
              <ConnectButton />
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-6 mt-16 pt-10 border-t border-surface-700/30">
            {[
              { label: "Listings Created", value: "—" },
              { label: "Matches Made", value: "—" },
              { label: "Food Saved (kg)", value: "—" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-surface-200/50 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-700/30 px-6 py-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-surface-200/30">
          FSE — Built with Solidity, NestJS, Next.js & Polygon
        </div>
      </footer>
    </div>
  );
}
