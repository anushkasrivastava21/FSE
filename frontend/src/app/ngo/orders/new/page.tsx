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
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/ngo/orders"
            className="text-surface-200/60 hover:text-white transition"
          >
            ← My Orders
          </Link>

          <ConnectButton />
        </div>

        <div className="mb-8">
          <div className="text-brand-400 text-sm font-semibold uppercase tracking-wider mb-2">
            NGO Portal
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            Place a demand order
          </h1>

          <p className="text-surface-200/60 leading-relaxed">
            Tell the exchange how much surplus food your NGO needs. The order
            is submitted on-chain through your connected wallet.
          </p>
        </div>

        {!isConnected ? (
          <div className="card text-center py-10">
            <div className="text-4xl mb-4">🔐</div>

            <h2 className="text-xl font-bold mb-2">
              Connect your NGO wallet
            </h2>

            <p className="text-surface-200/60 mb-6">
              Your wallet is used as the NGO address for the demand order.
            </p>

            <ConnectButton />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-6">
            <div className="rounded-xl border border-surface-700/50 bg-surface-800/40 p-4">
              <div className="text-xs text-surface-200/50 mb-1">
                NGO wallet
              </div>

              <div className="font-mono text-sm break-all">
                {address}
              </div>
            </div>

            <div>
              <label
                htmlFor="quantity"
                className="block text-sm font-medium mb-2"
              >
                Required quantity
              </label>

              <input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="Example: 50"
                required
                className="input"
              />

              <p className="text-xs text-surface-200/40 mt-2">
                Enter the required food quantity using the contract's
                quantity unit.
              </p>
            </div>

            <div className="rounded-xl border border-surface-700/50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={urgencyFlag}
                  onChange={(event) =>
                    setUrgencyFlag(event.target.checked)
                  }
                  className="mt-1 h-4 w-4"
                />

                <span>
                  <span className="block font-medium">
                    Mark as urgent
                  </span>

                  <span className="block text-sm text-surface-200/50 mt-1">
                    Flag this demand for urgency-aware matching.
                  </span>
                </span>
              </label>
            </div>

            <div>
              <label
                htmlFor="locationHash"
                className="block text-sm font-medium mb-2"
              >
                Pickup Region / Pincode
              </label>

              <input
                id="locationHash"
                type="text"
                value={locationHash}
                onChange={(event) => setLocationHash(event.target.value)}
                placeholder="e.g. 400001 or Mumbai Central"
                required
                className="input"
              />

              <p className="text-xs text-surface-200/40 mt-2">
                This is hashed on-chain to match with nearby donors.
              </p>
            </div>

            {formError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm break-words">
                {formError}
              </div>
            )}

            {error && !formError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm break-words">
                {error.message}
              </div>
            )}

            {txHash && (
              <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-4">
                <div className="font-semibold text-brand-300 mb-2">
                  {isConfirmed
                    ? "✓ Order transaction confirmed"
                    : isConfirming
                      ? "⏳ Waiting for confirmation..."
                      : "✓ Transaction submitted"}
                </div>

                <div className="text-xs text-surface-200/50 mb-1">
                  Transaction hash
                </div>

                <div className="font-mono text-xs break-all text-surface-200/80">
                  {txHash}
                </div>

                {transactionExplorerUrl && (
                  <a
                    href={transactionExplorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-3 text-sm text-brand-400 hover:text-brand-300"
                  >
                    View on PolygonScan →
                  </a>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || isConfirming}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending
                ? "Confirm in wallet..."
                : isConfirming
                  ? "Confirming transaction..."
                  : "Place Demand Order"}
            </button>

            {txHash && isConfirmed && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/ngo/orders"
                  className="btn-secondary flex-1 text-center"
                >
                  View My Orders
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
                  Place Another Order
                </button>
              </div>
            )}
          </form>
        )}

        <div className="mt-6 text-xs text-surface-200/40 leading-relaxed">
          The browser requests an unsigned transaction from the FSE backend.
          Your connected wallet signs the transaction; the backend never
          receives your private key.
        </div>
      </div>
    </main>
  );
}
