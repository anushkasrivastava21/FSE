"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  usePublicClient,
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

function formatTimestamp(value: string | number) {
  if (!value) return "Just now";
  const num = Number(value);
  if (!isNaN(num) && num > 0) {
    const ms = num < 1e11 ? num * 1000 : num;
    return new Date(ms).toLocaleString();
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? "Just now" : date.toLocaleString();
}

type OrdersResponse = {
  data: Order[];
  total: number;
  limit: number;
  offset: number;
};

export default function NgoOrdersPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

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

  async function handleCancelOrder(orderId: string) {
    setCancelError("");
    setCancellingOrderId(orderId);

    try {
      const tx = await prepareCancelOrderTx(orderId);
      const nonce =
        publicClient && address
          ? await publicClient.getTransactionCount({ address })
          : undefined;

      await sendTransactionAsync({
        to: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        ...(nonce !== undefined ? { nonce } : {}),
      });
    } catch (error) {
      setCancelError(
        error instanceof Error
          ? error.message
          : "Failed to submit cancellation transaction.",
      );
      setCancellingOrderId(null);
    }
  }

  function getStatusClass(status: string) {
    switch (status) {
      case "Open":
        return "badge-open";
      case "Cancelled":
        return "badge-cancelled";
      case "Matched":
        return "badge-matched";
      case "Settled":
        return "badge-settled";
      default:
        return "badge";
    }
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
              NGO Demand Orders
            </span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-4 border-b border-[#C8BFB0]/40">
          <div>
            <div className="text-[10px] font-mono-wabi text-[#A65E3A] uppercase tracking-widest mb-1">
              Beneficiary Distribution
            </div>
            <h1 className="font-serif-wabi text-3xl sm:text-4xl font-bold text-[#2C2620]">
              My Demand Orders
            </h1>
            <p className="font-serif-wabi text-base text-[#8B7E6A] mt-1">
              Track food delivery requests submitted by your registered NGO account.
            </p>
          </div>

          {isConnected && (
            <Link href="/ngo/orders/new" className="btn-primary self-start sm:self-auto">
              + New Demand Order
            </Link>
          )}
        </div>

        {!isConnected ? (
          <div className="card text-center py-16">
            <h2 className="font-serif-wabi text-2xl font-bold text-[#2C2620] mb-2">
              Connect NGO Wallet
            </h2>
            <p className="font-serif-wabi text-sm text-[#8B7E6A] mb-6">
              Connect the registered wallet address used to place demand orders.
            </p>
            <div className="inline-block">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <>
            <div className="card p-4 mb-6 bg-[#E4DDD1]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="label !mb-0.5">Connected NGO Account</span>
                <span className="font-mono-wabi text-xs text-[#2C2620] break-all">
                  {address}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono-wabi text-xs font-semibold text-[#A65E3A]">
                  {total} {total === 1 ? "order" : "orders"} recorded
                </span>
              </div>
            </div>

            {loadError && (
              <div className="card border-[#A65E3A]/40 bg-[#A65E3A]/10 p-4 mb-6 text-xs font-mono-wabi text-[#A65E3A]">
                {loadError}
              </div>
            )}

            {cancelError && (
              <div className="card border-[#A65E3A]/40 bg-[#A65E3A]/10 p-4 mb-6 text-xs font-mono-wabi text-[#A65E3A] break-words space-y-2">
                <div>{cancelError}</div>
                {cancelError.toLowerCase().includes("nonce") && (
                  <div className="pt-2 border-t border-[#A65E3A]/20 text-[11px] text-[#4A4238]">
                    <span className="font-bold text-[#A65E3A]">MetaMask Nonce Desync:</span> Open MetaMask → Settings → Advanced → click <em>Clear activity tab data</em> to synchronize with the local blockchain.
                  </div>
                )}
              </div>
            )}

            {cancelTxHash && (
              <div className="card border-[#8B7E6A]/50 bg-[#E4DDD1] p-4 mb-6">
                <div className="font-serif-wabi font-semibold text-sm text-[#2C2620]">
                  {isCancelConfirmed
                    ? "Cancellation Confirmed on Polygon"
                    : isCancelConfirming
                    ? "Cancellation Transaction Confirming..."
                    : "Cancellation Submitted"}
                </div>
                <div className="font-mono-wabi text-xs text-[#8B7E6A] break-all mt-1">
                  {cancelTxHash}
                </div>
              </div>
            )}

            {loading && orders.length === 0 ? (
              <div className="card text-center py-12 animate-pulse">
                <p className="font-serif-wabi text-base text-[#8B7E6A]">
                  Loading demand orders from blockchain...
                </p>
              </div>
            ) : orders.length === 0 ? (
              <div className="card text-center py-16">
                <h2 className="font-serif-wabi text-2xl font-bold text-[#2C2620] mb-2">
                  No Demand Orders Found
                </h2>
                <p className="font-serif-wabi text-base text-[#8B7E6A] max-w-md mx-auto mb-6">
                  Submit a demand order to match with incoming food surplus batches from local donors.
                </p>
                <Link href="/ngo/orders/new" className="btn-primary">
                  + Request Food Delivery
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const isCurrentCancelling = cancellingOrderId === order.orderId;
                  const canCancel = order.chainStatus === "Open";

                  return (
                    <div key={order.orderId} className="card p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className="font-serif-wabi text-2xl font-bold text-[#2C2620]">
                              Order #{order.orderId}
                            </span>
                            <span className={getStatusClass(order.chainStatus)}>
                              {order.chainStatus}
                            </span>
                            {order.urgencyFlag && (
                              <span className="badge bg-[#A65E3A]/20 text-[#A65E3A] border border-[#A65E3A]/40">
                                High Urgency
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono-wabi mt-3">
                            <div>
                              <div className="text-[#8B7E6A] uppercase tracking-wider mb-1">
                                Requested Quantity
                              </div>
                              <div className="font-serif-wabi text-xl font-bold text-[#2C2620]">
                                {order.quantity} kg
                              </div>
                            </div>

                            <div>
                              <div className="text-[#8B7E6A] uppercase tracking-wider mb-1">
                                Placed Timestamp
                              </div>
                              <div className="text-[#2C2620]">
                                {formatTimestamp(order.createdAt)}
                              </div>
                            </div>

                            <div>
                              <div className="text-[#8B7E6A] uppercase tracking-wider mb-1">
                                Pickup Region Hash
                              </div>
                              <div className="text-[#2C2620] break-all font-mono">
                                {order.locationHash}
                              </div>
                            </div>

                            <div>
                              <div className="text-[#8B7E6A] uppercase tracking-wider mb-1">
                                NGO Identity
                              </div>
                              <div className="text-[#2C2620] break-all font-mono">
                                {order.ngoAddress}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2.5 sm:min-w-44">
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(order.orderId)}
                              disabled={isCurrentCancelling && (isCancelPending || isCancelConfirming)}
                              className="btn-danger text-center"
                            >
                              {isCurrentCancelling && (isCancelPending || isCancelConfirming)
                                ? "Cancelling..."
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
                              <span>Polygonscan</span>
                              <span className="text-[#A65E3A]">↗</span>
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
