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
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/"
            className="text-surface-200/60 hover:text-white transition"
          >
            ← Back to home
          </Link>

          <ConnectButton />
        </div>

        <div className="mb-8">
          <div className="text-brand-400 text-sm font-semibold uppercase tracking-wider mb-2">
            NGO Portal
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            Register your NGO
          </h1>

          <p className="text-surface-200/60 leading-relaxed">
            Create your NGO profile before placing food demand orders.
            Your connected wallet identifies your organization on the
            exchange.
          </p>
        </div>

        <div className="card">
          {!isConnected ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-4">🔐</div>

              <h2 className="text-xl font-bold mb-2">
                Connect your wallet
              </h2>

              <p className="text-surface-200/60 mb-6">
                Connect an NGO wallet to continue registration.
              </p>

              <ConnectButton />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="ngo-name"
                  className="block text-sm font-medium mb-2"
                >
                  NGO name
                </label>

                <input
                  id="ngo-name"
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setSaved(false);
                  }}
                  placeholder="Example: Community Food Foundation"
                  required
                  className="input"
                />
              </div>

              <div>
                <label
                  htmlFor="ngo-area"
                  className="block text-sm font-medium mb-2"
                >
                  Area / service location
                </label>

                <input
                  id="ngo-area"
                  type="text"
                  value={area}
                  onChange={(event) => {
                    setArea(event.target.value);
                    setSaved(false);
                  }}
                  placeholder="Example: Chennai South"
                  required
                  className="input"
                />
              </div>

              <div>
                <label
                  htmlFor="ngo-contact"
                  className="block text-sm font-medium mb-2"
                >
                  Contact
                </label>

                <input
                  id="ngo-contact"
                  type="text"
                  value={contact}
                  onChange={(event) => {
                    setContact(event.target.value);
                    setSaved(false);
                  }}
                  placeholder="Phone or email"
                  required
                  className="input"
                />
              </div>

              <div className="rounded-xl border border-surface-700/50 bg-surface-800/40 p-4">
                <div className="text-xs text-surface-200/50 mb-1">
                  Connected wallet
                </div>

                <div className="font-mono text-sm break-all">
                  {address}
                </div>
              </div>

              {saved && (
                <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-brand-300 text-sm">
                  ✓ NGO profile saved on this device.
                </div>
              )}

              <button type="submit" className="btn-primary w-full">
                Save NGO Profile
              </button>

              {saved && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/ngo/orders/new"
                    className="btn-secondary flex-1 text-center"
                  >
                    Place a Demand Order →
                  </Link>

                  <Link
                    href="/ngo/orders"
                    className="btn-secondary flex-1 text-center"
                  >
                    View My Orders
                  </Link>
                </div>
              )}
            </form>
          )}
        </div>

        <div className="mt-6 text-xs text-surface-200/40 leading-relaxed">
          Note: this registration currently stores the NGO profile locally
          in the browser. The current Person B contract/API specification
          does not define an on-chain NGO registration function.
        </div>
      </div>
    </main>
  );
}
