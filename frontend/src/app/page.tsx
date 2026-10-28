"use client";

import Link from "next/link";
import Image from "next/image";
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
    <div className="min-h-screen flex flex-col bg-[#EEE9E0] text-[#4A4238] font-sans relative selection:bg-[#C8BFB0] selection:text-[#2C2620] overflow-x-hidden">
      
      {/* Subtle Rice-Paper / Washi Grain Texture */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-40 mix-blend-multiply z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`
        }}
      />

      {/* Navigation Bar */}
      <nav className="border-b border-[#C8BFB0]/50 px-6 sm:px-12 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            {/* Hanko-inspired Brand Icon */}
            <div className="w-8 h-8 bg-[#A65E3A] rounded-sm flex items-center justify-center text-[#EEE9E0] font-serif font-bold text-sm shadow-sm select-none">
              余
            </div>
            <div>
              <span className="font-serif-wabi text-xl sm:text-2xl font-bold tracking-tight text-[#2C2620] group-hover:opacity-85 transition-opacity">
                Food Surplus Exchange
              </span>
              <span className="hidden sm:inline-block ml-3 text-[10px] font-mono-wabi text-[#8B7E6A] uppercase tracking-widest">
                FSE Protocol
              </span>
            </div>
          </Link>

          <ConnectButton />
        </div>
      </nav>

      {/* Main Content Area - Preserving the Exact Earlier 2-Column Grid Structure */}
      <main className="flex-1 px-6 sm:px-12 py-10 md:py-16">
        <div className="max-w-7xl mx-auto grid md:grid-cols-[1fr_380px] gap-12 lg:gap-20 items-start">
          
          {/* Left Column: Hero & Copy with Organic Produce Accent */}
          <div className="flex flex-col justify-center">
            
            <div className="inline-flex items-center gap-2 text-[#8B7E6A] text-xs font-mono-wabi font-semibold mb-4 uppercase tracking-[0.2em]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A65E3A]"></span>
              Polygon Amoy Testnet
            </div>

            <div className="relative">
              <h1 className="font-serif-wabi text-4xl md:text-5xl lg:text-6xl text-[#2C2620] font-bold tracking-tight mb-4 leading-[1.12]">
                Log surplus inventory. <br />
                <span className="italic font-light text-[#8B7E6A]">Dispatch to local NGOs.</span>
              </h1>

              {/* Hand-drawn organic wave brush line */}
              <div className="mb-6 opacity-70">
                <svg width="130" height="12" viewBox="0 0 130 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 6C20 11 42 1 65 7C88 12 110 2 128 6" stroke="#8B7E6A" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <p className="font-serif-wabi text-lg sm:text-xl text-[#4A4238]/90 mb-8 max-w-xl leading-relaxed">
              FSE connects donors holding excess food with organizations that need it. 
              Built on transparent on-chain matching algorithms to prioritize delivery speed.
            </p>

            {/* Surplus Produce Visual Feature */}
            <div className="mb-10 p-5 rounded-sm bg-[#E4DDD1]/50 border border-[#C8BFB0]/60 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
                {/* Organic Clay Halo */}
                <div 
                  className="absolute inset-0 bg-[#C8BFB0]/50 organic-blob-halo"
                  style={{ transform: "translate(-4px, 4px)" }}
                />
                {/* Organic Mask Produce Bowl Photo */}
                <div className="relative w-full h-full overflow-hidden organic-blob-1 border border-[#8B7E6A]/30 bg-[#C8BFB0]/20 shadow-sm">
                  <Image 
                    src="/wabi-produce.jpg"
                    alt="Rescued farm produce in a rustic wooden bowl"
                    fill
                    unoptimized
                    sizes="128px"
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="font-serif-wabi text-base font-semibold text-[#2C2620]">
                    Surplus Produce Allocation
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A65E3A]"></span>
                </div>
                <p className="font-serif-wabi text-xs text-[#8B7E6A] leading-relaxed max-w-sm">
                  Fresh, nutritious produce rescued from surplus batches before expiry. Distributed directly to verified shelter pantries.
                </p>
                <div className="text-[10px] font-mono-wabi text-[#A65E3A] uppercase tracking-wider pt-1">
                  Urgency Priority / Zero Landfill
                </div>
              </div>

              {/* Vertical Tagline */}
              <div className="hidden lg:flex flex-col items-center pl-4 border-l border-[#C8BFB0]/50 py-1">
                <span className="vertical-writing font-serif-wabi text-[#8B7E6A] tracking-[0.25em] text-[11px] select-none">
                  Transparent on-chain matching.
                </span>
              </div>
            </div>

            {/* Hand-drawn brush stroke divider above stats */}
            <div className="mb-6 opacity-60">
              <svg className="w-full max-w-lg h-4" viewBox="0 0 500 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 8 C 50 12, 120 4, 210 10 C 310 15, 400 5, 498 8" stroke="#8B7E6A" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-2 max-w-xl">
              {[
                { label: "Active Listings", value: isLoading ? "..." : stats?.activeListings ?? "1" },
                { label: "Matches Today", value: isLoading ? "..." : stats?.matchesToday ?? "1", isAccent: true },
                { label: "Volume (kg)", value: isLoading ? "..." : (stats?.volume ?? 528).toLocaleString() },
              ].map((stat) => (
                <div key={stat.label} className="p-3 bg-[#E4DDD1]/30 border border-[#C8BFB0]/40 rounded-sm">
                  <div className={`text-2xl sm:text-3xl font-serif-wabi font-bold mb-1 [font-variant-numeric:lining-nums] ${
                    stat.isAccent ? "text-[#A65E3A]" : "text-[#2C2620]"
                  }`}>
                    {stat.value}
                  </div>
                  <div className="text-xs font-mono-wabi uppercase tracking-wider text-[#8B7E6A]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Right Column: Portal Navigation Sidebar (Exact Original Structure) */}
          <div className="flex flex-col gap-6">
            
            {!isConnected && (
              <div className="p-6 bg-[#E4DDD1]/80 border border-[#A65E3A]/40 rounded-sm mb-2 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#A65E3A]"></span>
                  <span className="text-xs font-mono-wabi uppercase tracking-wider text-[#A65E3A] font-semibold">
                    Wallet Required
                  </span>
                </div>
                <p className="text-sm font-serif-wabi text-[#4A4238] mb-4">
                  Connect your web3 wallet to access exchange features and create listings.
                </p>
                <ConnectButton />
              </div>
            )}

            {/* Donor Actions Card */}
            <div className="p-6 bg-[#E4DDD1]/70 border border-[#C8BFB0] rounded-sm shadow-sm hover:border-[#8B7E6A] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-mono-wabi font-bold text-[#8B7E6A] uppercase tracking-wider">
                  Donor Portal
                </h2>
                <span className="text-[10px] font-mono-wabi text-[#A65E3A] uppercase tracking-widest">
                  Surplus Supplier
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                <Link 
                  href="/donor/listings/new" 
                  className="inline-flex items-center justify-between px-4 py-2.5 bg-[#4A4238] hover:bg-[#2C2620] text-[#EEE9E0] font-mono-wabi text-xs rounded-sm tracking-wide transition-colors"
                >
                  <span>+ Log Surplus Food</span>
                  <span>→</span>
                </Link>
                <Link 
                  href="/donor/listings" 
                  className="inline-flex items-center justify-between px-4 py-2.5 bg-[#EEE9E0] hover:bg-[#C8BFB0]/40 text-[#4A4238] border border-[#C8BFB0] font-mono-wabi text-xs rounded-sm tracking-wide transition-colors"
                >
                  <span>Active Listings</span>
                  <span>→</span>
                </Link>
                <Link 
                  href="/donor/tokens" 
                  className="inline-flex items-center justify-between px-4 py-2.5 bg-[#EEE9E0] hover:bg-[#C8BFB0]/40 text-[#4A4238] border border-[#C8BFB0] font-mono-wabi text-xs rounded-sm tracking-wide transition-colors"
                >
                  <span>Food Credit Tokens</span>
                  <span className="text-[10px] text-[#A65E3A]">FCT</span>
                </Link>
              </div>
            </div>

            {/* NGO Actions Card */}
            <div className="p-6 bg-[#E4DDD1]/70 border border-[#C8BFB0] rounded-sm shadow-sm hover:border-[#8B7E6A] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-mono-wabi font-bold text-[#8B7E6A] uppercase tracking-wider">
                  NGO Portal
                </h2>
                <span className="text-[10px] font-mono-wabi text-[#8B7E6A] uppercase tracking-widest">
                  Beneficiaries
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                <Link 
                  href="/ngo/register" 
                  className="inline-flex items-center justify-between px-4 py-2.5 bg-[#4A4238] hover:bg-[#2C2620] text-[#EEE9E0] font-mono-wabi text-xs rounded-sm tracking-wide transition-colors"
                >
                  <span>+ Register NGO</span>
                  <span>→</span>
                </Link>
                <Link 
                  href="/ngo/orders/new" 
                  className="inline-flex items-center justify-between px-4 py-2.5 bg-[#4A4238] hover:bg-[#2C2620] text-[#EEE9E0] font-mono-wabi text-xs rounded-sm tracking-wide transition-colors"
                >
                  <span>+ Request Delivery</span>
                  <span>→</span>
                </Link>
                <Link 
                  href="/ngo/orders" 
                  className="inline-flex items-center justify-between px-4 py-2.5 bg-[#EEE9E0] hover:bg-[#C8BFB0]/40 text-[#4A4238] border border-[#C8BFB0] font-mono-wabi text-xs rounded-sm tracking-wide transition-colors"
                >
                  <span>Active Requests</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* System Data Card */}
            <div className="p-6 bg-[#E4DDD1]/70 border border-[#C8BFB0] rounded-sm shadow-sm hover:border-[#8B7E6A] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-mono-wabi font-bold text-[#8B7E6A] uppercase tracking-wider">
                  System Data
                </h2>
                <span className="w-2 h-2 rounded-full bg-[#A65E3A] animate-pulse"></span>
              </div>
              <div className="flex flex-col gap-2.5">
                <Link 
                  href="/analytics" 
                  className="inline-flex items-center justify-between px-4 py-2.5 bg-[#EEE9E0] hover:bg-[#C8BFB0]/40 text-[#4A4238] border border-[#C8BFB0] font-mono-wabi text-xs rounded-sm tracking-wide transition-colors"
                >
                  <span>Live Exchange Ticker</span>
                  <span className="text-[#A65E3A]">Analytics ↗</span>
                </Link>
                <Link 
                  href="/handoffs" 
                  className="inline-flex items-center justify-between px-4 py-2.5 bg-[#EEE9E0] hover:bg-[#C8BFB0]/40 text-[#4A4238] border border-[#C8BFB0] font-mono-wabi text-xs rounded-sm tracking-wide transition-colors"
                >
                  <span>Custody Trail</span>
                  <span>Handoffs ↗</span>
                </Link>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#C8BFB0]/40 px-6 sm:px-12 py-5 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono-wabi text-[#8B7E6A]">
          <div>
            Food Surplus Exchange | Web3 Protocol Infrastructure
          </div>
          <div className="text-xs uppercase tracking-wider">
            Decentralized Allocation & Custody Protocol
          </div>
        </div>
      </footer>

    </div>
  );
}
