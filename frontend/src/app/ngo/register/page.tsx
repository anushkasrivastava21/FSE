"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

type NgoProfile = {
  name: string;
  area: string;
  contact: string;
  walletAddress: string;
};

export default function NgoRegisterPage() {
  const { address, isConnected } = useAccount();

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [contact, setContact] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("fse_ngo_profile");
    if (!stored) return;

    try {
      const profile: NgoProfile = JSON.parse(stored);
      setName(profile.name);
      setArea(profile.area);
      setContact(profile.contact);
    } catch {
      localStorage.removeItem("fse_ngo_profile");
    }
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!address) return;

    const profile: NgoProfile = {
      name: name.trim(),
      area: area.trim(),
      contact: contact.trim(),
      walletAddress: address,
    };

    localStorage.setItem("fse_ngo_profile", JSON.stringify(profile));
    setSaved(true);
  }

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
              NGO Registration
            </span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="mb-8">
          <div className="text-[10px] font-mono-wabi text-[#A65E3A] uppercase tracking-widest mb-1">
            NGO Portal / Organization Onboarding
          </div>
          <h1 className="font-serif-wabi text-3xl sm:text-4xl font-bold text-[#2C2620] mb-1">
            Register Organization
          </h1>
          <p className="font-serif-wabi text-base text-[#8B7E6A]">
            Configure your NGO recipient identity to verify your wallet for decentralized food demand matching.
          </p>
        </div>

        {!isConnected ? (
          <div className="card text-center py-16">
            <h2 className="font-serif-wabi text-2xl font-bold text-[#2C2620] mb-2">
              Connect NGO Wallet
            </h2>
            <p className="font-serif-wabi text-sm text-[#8B7E6A] mb-6">
              Connect your NGO administration account to bind your organization profile.
            </p>
            <div className="inline-block">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-8 space-y-6">
            <div className="p-4 bg-[#E4DDD1]/50 border border-[#C8BFB0]/60 rounded-sm">
              <span className="label !mb-0.5">Connected NGO Wallet Address</span>
              <span className="font-mono-wabi text-xs text-[#2C2620] break-all">
                {address}
              </span>
            </div>

            <div>
              <label htmlFor="name" className="label">
                Organization Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved(false);
                }}
                placeholder="e.g. Hope Community Kitchen"
                required
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="area" className="label">
                Operating Service Region *
              </label>
              <input
                id="area"
                type="text"
                value={area}
                onChange={(event) => {
                  setArea(event.target.value);
                  setSaved(false);
                }}
                placeholder="e.g. Central District / Ward 12"
                required
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="contact" className="label">
                Contact Coordinator / Phone *
              </label>
              <input
                id="contact"
                type="text"
                value={contact}
                onChange={(event) => {
                  setContact(event.target.value);
                  setSaved(false);
                }}
                placeholder="e.g. +91 98765 43210 or logistics@hope.org"
                required
                className="input-field"
              />
            </div>

            {saved && (
              <div className="card border-[#8B7E6A]/50 bg-[#E4DDD1] p-4 text-xs font-mono-wabi text-[#2C2620]">
                ✓ Organization Profile Saved Successfully
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="btn-primary flex-1 py-3 text-xs font-mono-wabi tracking-wider uppercase"
              >
                Save NGO Profile
              </button>
              <Link
                href="/ngo/orders/new"
                className="btn-secondary text-center py-3"
              >
                Continue to Order Demand →
              </Link>
            </div>
          </form>
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
