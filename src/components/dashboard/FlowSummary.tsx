"use client";

import { WalletExtra } from "@/lib/metacomp";
import { formatUSD } from "@/lib/metacomp";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlowSummaryProps {
  extra: WalletExtra;
}

export function FlowSummary({ extra }: FlowSummaryProps) {
  const total = Math.max(extra.totalIncoming, extra.totalOutgoing, 1);

  const cards = [
    {
      label: "Total Incoming",
      value: extra.totalIncoming,
      icon: ArrowDownLeft,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      iconBg: "bg-emerald-500/20",
      barColor: "bg-gradient-to-r from-emerald-500 to-emerald-400",
      percent: (extra.totalIncoming / total) * 100,
    },
    {
      label: "Total Outgoing",
      value: extra.totalOutgoing,
      icon: ArrowUpRight,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      iconBg: "bg-cyan-500/20",
      barColor: "bg-gradient-to-r from-cyan-500 to-cyan-400",
      percent: (extra.totalOutgoing / total) * 100,
    },
    {
      label: "Wallet Balance",
      value: extra.walletBalance,
      icon: Wallet,
      color: "text-violet-400",
      bgColor: "bg-violet-500/10",
      iconBg: "bg-violet-500/20",
      barColor: "bg-gradient-to-r from-violet-500 to-violet-400",
      percent: extra.totalIncoming > 0 ? (extra.walletBalance / extra.totalIncoming) * 100 : 0,
    },
  ];

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Flow Summary</h3>
      <div className="space-y-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={cn("p-3 rounded-lg", card.bgColor)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-md", card.iconBg)}>
                    <Icon className={cn("h-3.5 w-3.5", card.color)} />
                  </div>
                  <span className="text-xs text-slate-400">{card.label}</span>
                </div>
                <span className={cn("text-sm font-mono font-bold", card.color)}>
                  {formatUSD(card.value)}
                </span>
              </div>
              <div className="h-1.5 bg-slate-900/30 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000 ease-out", card.barColor)}
                  style={{ width: `${Math.min(card.percent, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity window */}
      {extra.earliestTransactionTime && extra.latestTransactionTime && (
        <div className="mt-4 pt-4 border-t border-slate-700/30">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>First activity: <span className="text-slate-400">{extra.earliestTransactionTime}</span></span>
            <span>Last: <span className="text-slate-400">{extra.latestTransactionTime}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
