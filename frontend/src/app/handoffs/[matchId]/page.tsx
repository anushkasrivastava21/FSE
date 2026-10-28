"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, usePublicClient, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { fetchHandoffsByMatchId, prepareRecordHandoffTx } from "../../../lib/api";

type Handoff = {
  id: number;
  matchId: string;
  stage: number;
  actor: string;
  timestamp: string;
  txHash: string;
  createdAt: string;
};

type HandoffResponse = {
  matchId: string;
  data: Handoff[];
  total: number;
};

const STAGES = [
  {
    value: 0,
    label: "Picked Up",
    description: "Surplus food has been collected directly from the donor facility.",
  },
  {
    value: 1,
    label: "In Transit",
    description: "Consignment is under active transport toward the verified NGO kitchen.",
  },
  {
    value: 2,
    label: "Delivered",
    description: "Food delivered to destination pantry. Food Credit Token minted.",
  },
];

function getStage(value: number) {
  return (
    STAGES.find((stage) => stage.value === value) ?? {
      value,
      label: `Stage (${value})`,
      description: "Unrecognized custody state.",
    }
  );
}

export default function HandoffDetailPage({
  params,
}: {
  params: { matchId: string };
}) {
  const matchId = decodeURIComponent(params.matchId);

  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { sendTransactionAsync, data: txHash, isPending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const loadHandoffs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response: HandoffResponse = await fetchHandoffsByMatchId(matchId);
      setHandoffs(response.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load custody trail.",
      );
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadHandoffs();
  }, [loadHandoffs]);

  useEffect(() => {
    if (isSuccess) {
      loadHandoffs();
    }
  }, [isSuccess, loadHandoffs]);

  // Deduplicate and sort handoffs by stage
  const uniqueHandoffs = Array.from(
    new Map(handoffs.map((h) => [h.stage, h])).values(),
  ).sort((a, b) => a.stage - b.stage);

  const highestRecordedStage =
    uniqueHandoffs.length > 0
      ? Math.max(...uniqueHandoffs.map((h) => h.stage))
      : -1;

  const nextStage = highestRecordedStage + 1;
  const delivered = uniqueHandoffs.some((handoff) => handoff.stage === 2);

  async function handleRecordStage() {
    if (!address || nextStage > 2) return;
    setError("");
    try {
      const tx = await prepareRecordHandoffTx({
        matchId,
        stage: nextStage,
        actor: address,
      });

      const nonce =
        publicClient && address
          ? await publicClient.getTransactionCount({ address })
          : undefined;

      await sendTransactionAsync({
        to: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        ...(nonce !== undefined ? { nonce } : {}),
      });
    } catch (err: any) {
      console.error(err);
      setError(
        err?.shortMessage || err?.message || "Failed to record handoff.",
      );
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
            <Link
              href="/ngo/orders"
              className="font-mono-wabi text-xs text-[#8B7E6A] uppercase tracking-wider hover:text-[#2C2620] transition-colors"
            >
              Custody
            </Link>
            <span className="text-[#8B7E6A] mx-2">/</span>
            <span className="font-mono-wabi text-xs text-[#4A4238] uppercase tracking-wider">
              Handoff Detail
            </span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="mb-8 pb-4 border-b border-[#C8BFB0]/40">
          <div className="text-[10px] font-mono-wabi text-[#A65E3A] uppercase tracking-widest mb-1">
            Settlement Layer / Custody Verification
          </div>
          <h1 className="font-serif-wabi text-3xl sm:text-4xl font-bold text-[#2C2620] mb-1">
            Custody Handoff Trail
          </h1>
          <p className="font-serif-wabi text-base text-[#8B7E6A]">
            Append-only physical custody progression recorded on-chain by authorized transfer actors.
          </p>
        </div>

        <div className="card p-5 mb-6 bg-[#E4DDD1]/50">
          <span className="label !mb-0.5">Match Protocol Identifier</span>
          <span className="font-mono-wabi text-xs text-[#2C2620] break-all">
            {matchId}
          </span>
        </div>

        {error && (
          <div className="card border-[#A65E3A]/40 bg-[#A65E3A]/10 p-4 mb-6 text-xs font-mono-wabi text-[#A65E3A]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="card text-center py-12 animate-pulse">
            <p className="font-serif-wabi text-base text-[#8B7E6A]">
              Retrieving custody trail from smart contract events...
            </p>
          </div>
        ) : (
          <>
            {!delivered && (
              <button
                onClick={handleRecordStage}
                disabled={isPending || isConfirming || !address}
                className="btn-primary w-full mb-8 py-3.5 text-xs font-mono-wabi uppercase tracking-wider"
              >
                {isPending
                  ? "Confirm in Wallet..."
                  : isConfirming
                  ? "Recording on Blockchain..."
                  : `+ Record Next Stage: ${STAGES[nextStage]?.label || "Next"}`}
              </button>
            )}

            {uniqueHandoffs.length === 0 ? (
              <div className="card text-center py-16 mb-8">
                <h2 className="font-serif-wabi text-2xl font-bold text-[#2C2620] mb-2">
                  No Handoff Events Recorded
                </h2>
                <p className="font-serif-wabi text-base text-[#8B7E6A] max-w-md mx-auto">
                  The custody trail will be initiated once the first stage (Picked Up) is signed by the courier or NGO.
                </p>
              </div>
            ) : (
              <div className="card p-6 mb-8">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#C8BFB0]/40">
                  <div>
                    <span className="label !mb-0.5">Custody Progression</span>
                    <span className="font-serif-wabi text-2xl font-bold text-[#2C2620]">
                      {delivered ? "Fully Delivered & Settled" : `${uniqueHandoffs.length} of 3 Stages Completed`}
                    </span>
                  </div>
                  <span className={delivered ? "badge-settled" : "badge-matched"}>
                    {delivered ? "Settled" : "In Transit"}
                  </span>
                </div>

                <div className="space-y-4">
                  {STAGES.map((stage) => {
                    const recorded = uniqueHandoffs.find(
                      (handoff) => handoff.stage === stage.value,
                    );

                    return (
                      <div
                        key={stage.value}
                        className={`flex gap-4 p-4 rounded-sm border transition-colors ${
                          recorded
                            ? "bg-[#EEE9E0] border-[#8B7E6A]"
                            : "bg-[#EEE9E0]/40 border-[#C8BFB0]/50"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 shrink-0 rounded-sm flex items-center justify-center font-mono-wabi text-xs font-bold ${
                            recorded
                              ? "bg-[#4A4238] text-[#EEE9E0]"
                              : "bg-[#C8BFB0]/40 text-[#8B7E6A]"
                          }`}
                        >
                          {recorded ? "✓" : stage.value + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-serif-wabi font-semibold text-lg text-[#2C2620]">
                            {stage.label}
                          </div>
                          <div className="font-serif-wabi text-xs text-[#8B7E6A] mt-0.5">
                            {stage.description}
                          </div>

                          {recorded && (
                            <div className="mt-3 pt-3 border-t border-[#C8BFB0]/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono-wabi">
                              <div>
                                <span className="text-[#8B7E6A] block text-[10px] uppercase tracking-wider">
                                  Signing Actor
                                </span>
                                <span className="text-[#2C2620] break-all">
                                  {recorded.actor}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#8B7E6A] block text-[10px] uppercase tracking-wider">
                                  Timestamp
                                </span>
                                <span className="text-[#2C2620]">
                                  {new Date(Number(recorded.timestamp) * 1000).toLocaleString()}
                                </span>
                              </div>
                              {recorded.txHash && (
                                <div className="sm:col-span-2">
                                  <span className="text-[#8B7E6A] block text-[10px] uppercase tracking-wider">
                                    Polygon Transaction
                                  </span>
                                  <a
                                    href={`https://amoy.polygonscan.com/tx/${recorded.txHash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#A65E3A] hover:underline break-all"
                                  >
                                    {recorded.txHash} ↗
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
