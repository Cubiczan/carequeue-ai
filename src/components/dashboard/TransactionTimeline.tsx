"use client";

import { Transaction, truncateAddress, formatUSD } from "@/lib/metacomp";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, Clock } from "lucide-react";

interface TransactionTimelineProps {
  transactions: Transaction[];
}

export function TransactionTimeline({ transactions }: TransactionTimelineProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Transaction Timeline</h3>
        <div className="flex items-center justify-center h-24 text-slate-500 text-sm">
          <Clock className="h-4 w-4 mr-2" />
          No transaction data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Transaction Timeline</h3>
      <div className="space-y-0 max-h-96 overflow-y-auto pr-1">
        {transactions.map((tx, idx) => {
          const isSent = tx.direction === "sent";
          return (
            <div key={idx} className="relative flex gap-3 pb-4 last:pb-0">
              {/* Timeline line */}
              {idx < transactions.length - 1 && (
                <div className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-700/50" />
              )}

              {/* Dot */}
              <div
                className={cn(
                  "relative z-10 mt-1 w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0",
                  tx.isHighRisk
                    ? "bg-red-500/20 border border-red-500/40"
                    : isSent
                    ? "bg-cyan-500/20 border border-cyan-500/40"
                    : "bg-emerald-500/20 border border-emerald-500/40"
                )}
              >
                {tx.isHighRisk ? (
                  <AlertTriangle className="h-3 w-3 text-red-400" />
                ) : isSent ? (
                  <ArrowUpRight className="h-3 w-3 text-cyan-400" />
                ) : (
                  <ArrowDownLeft className="h-3 w-3 text-emerald-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    tx.isHighRisk ? "text-red-400" : isSent ? "text-cyan-400" : "text-emerald-400"
                  )}>
                    {isSent ? "Sent" : "Received"} {tx.asset}
                  </span>
                  {tx.isHighRisk && (
                    <span className="text-[9px] bg-red-500/15 border border-red-500/30 text-red-400 px-1.5 py-0.5 rounded font-semibold">
                      HIGH RISK
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono text-slate-500 truncate">
                  {truncateAddress(tx.hash, 8)}
                </div>
                <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-600">
                  <span>From: <span className="text-slate-400 font-mono">{truncateAddress(tx.from, 4)}</span></span>
                  <span>To: <span className="text-slate-400 font-mono">{truncateAddress(tx.to, 4)}</span></span>
                  {tx.value !== undefined && (
                    <span className="text-slate-400">{formatUSD(tx.value)}</span>
                  )}
                </div>
                {tx.timestamp && (
                  <div className="text-[10px] text-slate-600 mt-1">{tx.timestamp}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
