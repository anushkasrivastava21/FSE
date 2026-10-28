"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { fetchDashboardTicker } from "@/lib/api";

export default function HandoffsIndexPage() {
  const { data: tickerData, isLoading } = useQuery({
    queryKey: ["ticker"],
    queryFn: () => fetchDashboardTicker(),
    refetchInterval: 5000,
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
              Custody Trails
            </span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="mb-8 pb-4 border-b border-[#C8BFB0]/40">
          <div className="text-[10px] font-mono-wabi text-[#A65E3A] uppercase tracking-widest mb-1">
            Settlement Layer / Custody Trails
          </div>
          <h1 className="font-serif-wabi text-3xl sm:text-4xl font-bold text-[#2C2620] mb-1">
            Verified Physical Handoffs
          </h1>
          <p className="font-serif-wabi text-base text-[#8B7E6A]">
            Audit and verify physical custody transfer progressions recorded on-chain by authorized exchange actors.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="card h-24 bg-[#C8BFB0]/30" />
            <div className="card h-24 bg-[#C8BFB0]/30" />
          </div>
        ) : tickerData?.recentTrades?.length === 0 ? (
          <div className="card text-center py-16">
            <h3 className="font-serif-wabi text-xl font-bold text-[#2C2620] mb-2">
              No Handoffs Recorded
            </h3>
            <p className="font-serif-wabi text-sm text-[#8B7E6A] max-w-md mx-auto mb-6">
              When matched pairs are executed on the protocol, their immutable custody handoff trails will be viewable here.
            </p>
            <Link href="/analytics" className="btn-primary text-xs uppercase">
              View Protocol Telemetry
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tickerData?.recentTrades?.map((trade: any, idx: number) => (
              <Link
                href={`/handoffs/${encodeURIComponent(trade.matchId)}`}
                key={idx}
                className="card-hover p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 block"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif-wabi font-semibold text-lg text-[#2C2620]">
                      Match #{trade.matchId ? trade.matchId.slice(0, 12) + "..." : `#${idx + 1}`}
                    </span>
                    <span className="badge-matched">Verified</span>
                  </div>
                  <div className="font-mono-wabi text-xs text-[#8B7E6A] mt-1">
                    Listing #{trade.listingId} ↔ NGO Order #{trade.orderId}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono-wabi text-[#A65E3A] font-semibold">
                    Inspect Custody Trail →
                  </span>
                </div>
              </Link>
            ))}
          </div>
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
