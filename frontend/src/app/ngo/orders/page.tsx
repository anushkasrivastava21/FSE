"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  fetchOrders,
  prepareCancelOrderTx,
} from "../../../lib/api";

type Order = {
  orderId: string;
  ngoAddress: string;
  quantity: number;
  urgencyFlag: boolean;
  locationHash: string;
  chainStatus: string;
  txHash: string;
  createdAt: string;
};

type OrdersResponse = {
  data: Order[];
  total: number;
  limit: number;
  offset: number;
};

export default function NgoOrdersPage() {
  const { address, isConnected } = useAccount();

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );

  const [cancelError, setCancelError] = useState("");

  const {
    sendTransactionAsync,
    data: cancelTxHash,
    isPending: isCancelPending,
  } = useSendTransaction();

  const { isLoading: isCancelConfirming, isSuccess: isCancelConfirmed } =
    useWaitForTransactionReceipt({
      hash: cancelTxHash,
    });

  const loadOrders = useCallback(async () => {
    if (!address) {
      setOrders([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const response: OrdersResponse = await fetchOrders({
        ngoAddress: address,
        limit: 50,
        offset: 0,
      });

      setOrders(response.data);
      setTotal(response.total);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load orders.",
      );
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (isCancelConfirmed) {
      setCancellingOrderId(null);

      const timer = window.setTimeout(() => {
        loadOrders();
      }, 1000);

      return () => window.clearTimeout(timer);
    }
  }, [isCancelConfirmed, loadOrders]);

  async function handleCancel(orderId: string) {
    setCancelError("");
    setCancellingOrderId(orderId);

    try {
      const tx = await prepareCancelOrderTx(orderId);

      await sendTransactionAsync({
        to: tx.to,
        data: tx.data,
      });
    } catch (error) {
      setCancellingOrderId(null);

      setCancelError(
        error instanceof Error
          ? error.message
          : "Failed to cancel order.",
      );
    }
  }

  function statusClass(status: string) {
    switch (status) {
      case "Open":
        return "text-brand-300 bg-brand-500/10 border-brand-500/20";

      case "Cancelled":
        return "text-red-300 bg-red-500/10 border-red-500/20";

      case "Matched":
        return "text-blue-300 bg-blue-500/10 border-blue-500/20";

      case "Settled":
        return "text-purple-300 bg-purple-500/10 border-purple-500/20";

      default:
        return "text-surface-200/70 bg-surface-800 border-surface-700";
    }
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/"
            className="text-surface-200/60 hover:text-white transition"
          >
            ← Home
          </Link>

          <ConnectButton />
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
          <div>
            <div className="text-brand-400 text-sm font-semibold uppercase tracking-wider mb-2">
              NGO Portal
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight mb-3">
              My Demand Orders
            </h1>

            <p className="text-surface-200/60">
              Track the demand orders submitted by your connected NGO wallet.
            </p>
          </div>

          {isConnected && (
            <Link
              href="/ngo/orders/new"
              className="btn-primary text-center"
            >
              + New Demand Order
            </Link>
          )}
        </div>

        {!isConnected ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4">🔐</div>

            <h2 className="text-xl font-bold mb-2">
              Connect your NGO wallet
            </h2>

            <p className="text-surface-200/60 mb-6">
              Connect the wallet used to place your demand orders.
            </p>

            <ConnectButton />
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-surface-700/50 bg-surface-800/30 px-4 py-3 mb-6">
              <div className="text-xs text-surface-200/40 mb-1">
                Viewing orders for
              </div>

              <div className="font-mono text-sm break-all">
                {address}
              </div>
            </div>

            {loadError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-6 text-red-300 text-sm">
                {loadError}
              </div>
            )}

            {cancelError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-6 text-red-300 text-sm break-words">
                {cancelError}
              </div>
            )}

            {cancelTxHash && (
              <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 mb-6">
                <div className="text-sm text-brand-300 font-medium">
                  {isCancelConfirmed
                    ? "✓ Cancellation confirmed"
                    : isCancelConfirming
                      ? "⏳ Cancellation transaction confirming..."
                      : "✓ Cancellation transaction submitted"}
                </div>

                <div className="font-mono text-xs text-surface-200/60 break-all mt-2">
                  {cancelTxHash}
                </div>

                <a
                  href={`https://amoy.polygonscan.com/tx/${cancelTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-2 text-sm text-brand-400 hover:text-brand-300"
                >
                  View on PolygonScan →
                </a>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-surface-200/50">
                {total} {total === 1 ? "order" : "orders"}
              </div>

              <button
                type="button"
                onClick={loadOrders}
                disabled={loading}
                className="btn-secondary text-sm"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {loading && orders.length === 0 ? (
              <div className="card text-center py-12 text-surface-200/50">
                Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-4xl mb-4">📋</div>

                <h2 className="text-xl font-bold mb-2">
                  No demand orders yet
                </h2>

                <p className="text-surface-200/50 mb-6">
                  Place your first demand order to request surplus food.
                </p>

                <Link
                  href="/ngo/orders/new"
                  className="btn-primary inline-block"
                >
                  Place Demand Order
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const isCancelling =
                    cancellingOrderId === order.orderId;

                  const canCancel = order.chainStatus === "Open";

                  return (
                    <div
                      key={order.orderId}
                      className="card"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className="font-semibold">
                              Order #{order.orderId}
                            </span>

                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                                order.chainStatus,
                              )}`}
                            >
                              {order.chainStatus}
                            </span>

                            {order.urgencyFlag && (
                              <span className="inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
                                Urgent
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-xs text-surface-200/40 mb-1">
                                Quantity
                              </div>

                              <div className="font-medium">
                                {order.quantity}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-surface-200/40 mb-1">
                                Created
                              </div>

                              <div className="font-medium">
                                {new Date(
                                  Number(order.createdAt) * 1000,
                                ).toLocaleString()}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-surface-200/40 mb-1">
                                Location hash
                              </div>

                              <div className="font-mono text-xs break-all text-surface-200/70">
                                {order.locationHash}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:min-w-40">
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => handleCancel(order.orderId)}
                              disabled={
                                isCancelling ||
                                isCancelPending ||
                                isCancelConfirming
                              }
                              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isCancelling
                                ? isCancelPending
                                  ? "Confirm in wallet..."
                                  : isCancelConfirming
                                    ? "Confirming..."
                                    : "Cancelling..."
                                : "Cancel Order"}
                            </button>
                          )}

                          {order.txHash && (
                            <a
                              href={`https://amoy.polygonscan.com/tx/${order.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-secondary text-center"
                            >
                              View Transaction →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
