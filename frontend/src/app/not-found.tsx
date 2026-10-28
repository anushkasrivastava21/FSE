"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#EEE9E0] text-[#4A4238] font-sans selection:bg-[#C8BFB0] selection:text-[#2C2620]">
      {/* Navigation */}
      <nav className="border-b border-[#C8BFB0]/50 px-6 sm:px-12 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-[#A65E3A] rounded-sm flex items-center justify-center text-[#EEE9E0] font-serif font-bold text-sm shadow-sm select-none">
              余
            </div>
            <span className="font-serif-wabi text-xl font-bold tracking-tight text-[#2C2620] group-hover:opacity-85 transition-opacity">
              Food Surplus Exchange
            </span>
          </Link>
        </div>
      </nav>

      {/* Main 404 Content */}
      <main className="max-w-xl mx-auto px-6 py-24 flex-1 flex flex-col items-center justify-center text-center">
        <div className="text-xs font-mono-wabi text-[#A65E3A] uppercase tracking-widest mb-3">
          Error 404
        </div>
        <h1 className="font-serif-wabi text-4xl sm:text-5xl font-bold text-[#2C2620] mb-4">
          Page Not Found
        </h1>
        <p className="font-serif-wabi text-base text-[#8B7E6A] max-w-md mb-8 leading-relaxed">
          The requested protocol route or resource does not exist or has been moved to a new ledger location.
        </p>

        <Link
          href="/"
          className="btn-primary px-6 py-3 text-xs font-mono-wabi uppercase tracking-wider"
        >
          ← Return to Exchange Home
        </Link>
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
