"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toBytes } from "viem";
import { preparePlaceOrderTx } from "../../../../lib/api";

export default function NewOrderPage() {
  const { address, isConnected } = useAccount();

  const { sendTransactionAsync, data: txHash, isPending, error } =
    useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  const [quantity, setQuantity] = useState("");
  const [urgencyFlag, setUrgencyFlag] = useState(false);
  const [locationHash, setLocationHash] = useState("");
  const [formError, setFormError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!address) {
      setFormError("Connect your NGO wallet first.");
      return;
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setFormError("Quantity must be a positive whole number.");
      return;
    }

    if (!locationHash.trim()) {
      setFormError("Location is required.");
      return;
    }

    try {
      const hashedLocation = keccak256(toBytes(locationHash.trim()));
      const tx = await preparePlaceOrderTx({
        quantity: parsedQuantity,
        urgencyFlag,
        locationHash: hashedLocation,
      });

      await sendTransactionAsync({
        to: tx.to,
        data: tx.data,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to place order.";

      setFormError(message);
    }
  }

  const transactionExplorerUrl = txHash
    ? `https://amoy.polygonscan.com/tx/${txHash}`
    : null;

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
            <Link
              href="/ngo/orders"
              className="font-mono-wabi text-xs text-[#8B7E6A] uppercase tracking-wider hover:text-[#2C2620] transition-colors"
            >
              NGO Orders
            </Link>
            <span className="text-[#8B7E6A] mx-2">/</span>
            <span className="font-mono-wabi text-xs text-[#4A4238] uppercase tracking-wider">
              New Demand
            </span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="mb-8">
          <div className="text-[10px] font-mono-wabi text-[#A65E3A] uppercase tracking-widest mb-1">
            NGO Portal / Demand Placement
          </div>
          <h1 className="font-serif-wabi text-3xl sm:text-4xl font-bold text-[#2C2620] mb-1">
            Place a Demand Order
          </h1>
          <p className="font-serif-wabi text-base text-[#8B7E6A]">
            Declare emergency or scheduled food relief demand for automated matching against donor surplus inventory.
          </p>
        </div>

        {!isConnected ? (
          <div className="card text-center py-16">
            <h2 className="font-serif-wabi text-2xl font-bold text-[#2C2620] mb-2">
              Connect NGO Wallet
            </h2>
            <p className="font-serif-wabi text-sm text-[#8B7E6A] mb-6">
              Your connected wallet signs the on-chain demand placement transaction.
            </p>
            <div className="inline-block">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-8 space-y-6">
            <div className="p-4 bg-[#E4DDD1]/50 border border-[#C8BFB0]/60 rounded-sm">
              <span className="label !mb-0.5">Authorized NGO Address</span>
              <span className="font-mono-wabi text-xs text-[#2C2620] break-all">
                {address}
              </span>
            </div>

            <div>
              <label htmlFor="quantity" className="label">
                Required Quantity (kg) *
              </label>
              <input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="e.g. 100"
                required
                className="input-field"
              />
              <p className="font-mono-wabi text-[11px] text-[#8B7E6A] mt-1.5">
                Exact kilogram volume needed for distribution to beneficiaries
              </p>
            </div>

            <div className="p-4 bg-[#E4DDD1]/30 border border-[#C8BFB0] rounded-sm">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={urgencyFlag}
                  onChange={(event) => setUrgencyFlag(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#A65E3A] rounded-sm border-[#C8BFB0]"
                />
                <div>
                  <span className="font-serif-wabi font-semibold text-base text-[#2C2620] block">
                    Flag as High Urgency
                  </span>
                  <span className="font-serif-wabi text-xs text-[#8B7E6A] block mt-0.5">
                    Prioritizes your demand in bipartite LP matching for immediate dispatch.
                  </span>
                </div>
              </label>
            </div>

            <div>
              <label htmlFor="locationHash" className="label">
                Pickup Region / Pincode *
              </label>
              <input
                id="locationHash"
                type="text"
                value={locationHash}
                onChange={(event) => setLocationHash(event.target.value)}
                placeholder="e.g. 400001 or Mumbai Central"
                required
                className="input-field"
              />
              <p className="font-mono-wabi text-[11px] text-[#8B7E6A] mt-1.5">
                Hashed to keccak256 on-chain to match with nearby donors within transport range
              </p>
            </div>

            {formError && (
              <div className="card border-[#A65E3A]/40 bg-[#A65E3A]/10 p-4 text-xs font-mono-wabi text-[#A65E3A] break-words">
                {formError}
              </div>
            )}

            {error && !formError && (
              <div className="card border-[#A65E3A]/40 bg-[#A65E3A]/10 p-4 text-xs font-mono-wabi text-[#A65E3A] break-words">
                {error.message}
              </div>
            )}

            {txHash && (
              <div className="card border-[#8B7E6A]/50 bg-[#E4DDD1] p-4">
                <div className="font-serif-wabi font-semibold text-sm text-[#2C2620] mb-1">
                  {isConfirmed
                    ? "Demand Order Confirmed on Polygon"
                    : isConfirming
                    ? "Confirming Transaction on Blockchain..."
                    : "Order Transaction Submitted"}
                </div>
                <div className="font-mono-wabi text-xs text-[#8B7E6A] break-all">
                  {txHash}
                </div>
                {transactionExplorerUrl && (
                  <a
                    href={transactionExplorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-2 font-mono-wabi text-xs text-[#A65E3A] hover:underline"
                  >
                    View on PolygonScan ↗
                  </a>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || isConfirming}
              className="btn-primary w-full py-3.5 text-xs font-mono-wabi tracking-wider uppercase"
            >
              {isPending
                ? "Confirm in Wallet..."
                : isConfirming
                ? "Submitting to Blockchain..."
                : "+ Place Demand Order"}
            </button>

            {txHash && isConfirmed && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/ngo/orders" className="btn-secondary flex-1 text-center">
                  View My Orders →
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setQuantity("");
                    setUrgencyFlag(false);
                    setLocationHash("");
                    setFormError("");
                  }}
                  className="btn-secondary flex-1"
                >
                  Place Another Request
                </button>
              </div>
            )}
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
