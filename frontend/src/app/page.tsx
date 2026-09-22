"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

export default function HomePage() {
  const { isConnected } = useAccount();

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

      <main className="flex-1 px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-400 text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
              Live on Polygon Amoy Testnet
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
              Reduce food waste.
              <br />
              <span className="text-brand-400">Feed communities.</span>
            </h1>

            <p className="text-xl text-surface-200/70 mb-10 max-w-2xl mx-auto leading-relaxed">
              A decentralized exchange matching surplus food donors with NGOs
              using urgency-scored, transparent matching — verified on-chain.
            </p>

            {!isConnected && (
              <div className="flex flex-col items-center gap-4 mb-14">
                <p className="text-surface-200/50 text-sm">
                  Connect your wallet to use the exchange
                </p>

                <ConnectButton />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
              <section className="card">
                <div className="text-3xl mb-4">📦</div>

                <h2 className="text-2xl font-bold mb-2">
                  Donor Portal
                </h2>

                <p className="text-surface-200/60 mb-6">
                  Create surplus food listings, track matches, and view Food
                  Credit Token history.
                </p>

                <div className="flex flex-col gap-3">
                  <Link
                    href="/donor/listings"
                    className="btn-primary text-center"
                  >
                    My Listings
                  </Link>

                  <Link
                    href="/donor/listings/new"
                    className="btn-secondary text-center"
                  >
                    List Surplus Food
                  </Link>

                  <Link
                    href="/donor/tokens"
                    className="btn-secondary text-center"
                  >
                    Food Credit Tokens
                  </Link>
                </div>
              </section>

              <section className="card">
                <div className="text-3xl mb-4">🏥</div>

                <h2 className="text-2xl font-bold mb-2">
                  NGO Portal
                </h2>

                <p className="text-surface-200/60 mb-6">
                  Register your organization, place food demand orders, and
                  track order status.
                </p>

                <div className="flex flex-col gap-3">
                  <Link
                    href="/ngo/register"
                    className="btn-primary text-center"
                  >
                    NGO Registration
                  </Link>

                  <Link
                    href="/ngo/orders/new"
                    className="btn-secondary text-center"
                  >
                    Place Demand Order
                  </Link>

                  <Link
                    href="/ngo/orders"
                    className="btn-secondary text-center"
                  >
                    My Demand Orders
                  </Link>
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 pt-10 border-t border-surface-700/30">
              {[
                { label: "Listings Created", value: "—" },
                { label: "Matches Made", value: "—" },
                { label: "Food Saved (kg)", value: "—" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {stat.value}
                  </div>

                  <div className="text-sm text-surface-200/50 mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
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
