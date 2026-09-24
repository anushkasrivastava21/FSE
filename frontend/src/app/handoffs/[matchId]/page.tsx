"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
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
    description: "Food has been collected from the donor.",
  },
  {
    value: 1,
    label: "In Transit",
    description: "Food is being transported to the NGO.",
  },
  {
    value: 2,
    label: "Delivered",
    description: "Food has reached the destination.",
  },
];

function getStage(value: number) {
  return (
    STAGES.find((stage) => stage.value === value) ?? {
      value,
      label: `Unknown Stage (${value})`,
      description: "Unrecognized custody stage.",
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
  const { sendTransactionAsync, data: txHash, isPending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const loadHandoffs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response: HandoffResponse =
        await fetchHandoffsByMatchId(matchId);

      setHandoffs(response.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load custody trail.",
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

  const delivered = handoffs.some((handoff) => handoff.stage === 2);
  const nextStage = handoffs.length;

  async function handleRecordStage() {
    if (!address || nextStage > 2) return;
    try {
      const tx = await prepareRecordHandoffTx({
        matchId,
        stage: nextStage,
        actor: address,
      });
      await sendTransactionAsync({ to: tx.to, data: tx.data });
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to record handoff");
    }
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/ngo/orders"
          className="text-surface-200/60 hover:text-white transition"
        >
          ← Back to NGO Orders
        </Link>

        <div className="mt-8 mb-8">
          <div className="text-brand-400 text-sm font-semibold uppercase tracking-wider mb-2">
            Match & Custody
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            Handoff Detail
          </h1>

          <p className="text-surface-200/60">
            Complete immutable custody trail for this matched food
            transfer.
          </p>
        </div>

        <div className="card mb-6">
          <div className="text-xs text-surface-200/40 mb-2">
            Match ID
          </div>

          <div className="font-mono text-sm break-all">
            {matchId}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-6 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="card text-center py-12 text-surface-200/50">
            Loading custody trail...
          </div>
        ) : handoffs.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4">🚚</div>

            <h2 className="text-xl font-bold mb-2">
              No handoffs recorded yet
            </h2>

            <p className="text-surface-200/50">
              The custody trail will appear here once the first handoff
              is recorded on-chain.
            </p>
          </div>
        ) : (
          <>
            <div className="card mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-sm text-surface-200/50">
                    Custody progress
                  </div>

                  <div className="text-2xl font-bold mt-1">
                    {delivered ? "Delivered" : `${handoffs.length} stage recorded`}
                  </div>
                </div>

                <div className="text-3xl">
                  {delivered ? "✓" : "🚚"}
                </div>
              </div>

              {!delivered && (
                <button
                  onClick={handleRecordStage}
                  disabled={isPending || isConfirming || !address}
                  className="btn-primary w-full mb-6 py-3"
                >
                  {isPending ? "Confirm in wallet..." : isConfirming ? "Recording on-chain..." : `Record Next Stage: ${STAGES[nextStage]?.label}`}
                </button>
              )}

              <div className="space-y-4">
                {STAGES.map((stage) => {
                  const recorded = handoffs.find(
                    (handoff) => handoff.stage === stage.value,
                  );

                  return (
                    <div
                      key={stage.value}
                      className={`flex gap-4 rounded-xl border p-4 ${
                        recorded
                          ? "border-brand-500/30 bg-brand-500/5"
                          : "border-surface-700/40 bg-surface-800/20"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold ${
                          recorded
                            ? "bg-brand-500 text-white"
                            : "bg-surface-700 text-surface-200/40"
                        }`}
                      >
                        {recorded ? "✓" : stage.value + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">
                          {stage.label}
                        </div>

                        <div className="text-sm text-surface-200/50 mt-1">
                          {stage.description}
                        </div>

                        {recorded && (
                          <div className="mt-4 space-y-3 text-sm">
                            <div>
                              <div className="text-xs text-surface-200/40 mb-1">
                                Actor
                              </div>

                              <div className="font-mono text-xs break-all">
                                {recorded.actor}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-surface-200/40 mb-1">
                                Recorded
                              </div>

                              <div>
                                {new Date(
                                  Number(recorded.timestamp) * 1000,
                                ).toLocaleString()}
                              </div>
                            </div>

                            {recorded.txHash && (
                              <div>
                                <div className="text-xs text-surface-200/40 mb-1">
                                  Transaction
                                </div>

                                <a
                                  href={`https://amoy.polygonscan.com/tx/${recorded.txHash}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-mono text-xs text-brand-400 hover:text-brand-300 break-all"
                                >
                                  {recorded.txHash}
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

            <div>
              <h2 className="text-xl font-bold mb-4">
                Recorded ledger events
              </h2>

              <div className="space-y-3">
                {handoffs.map((handoff) => {
                  const stage = getStage(handoff.stage);

                  return (
                    <div
                      key={handoff.id}
                      className="rounded-xl border border-surface-700/40 bg-surface-800/20 p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="font-semibold">
                            {stage.label}
                          </div>

                          <div className="text-xs text-surface-200/50 mt-1">
                            Event #{handoff.id}
                          </div>
                        </div>

                        <div className="text-sm text-surface-200/60">
                          {new Date(
                            Number(handoff.timestamp) * 1000,
                          ).toLocaleString()}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs text-surface-200/40 mb-1">
                          Actor
                        </div>

                        <div className="font-mono text-xs break-all">
                          {handoff.actor}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="mt-8 text-xs text-surface-200/40 leading-relaxed">
          Handoff records are read from the backend index of Settlement
          contract events. The custody trail is append-only: Picked Up,
          In Transit, and Delivered are permanent ledger events.
        </div>
      </div>
    </main>
  );
}
