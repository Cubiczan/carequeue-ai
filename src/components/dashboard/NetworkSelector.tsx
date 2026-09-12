"use client";

import { Network, NETWORK_OPTIONS } from "@/lib/metacomp";
import { Hexagon, Coins, Triangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkSelectorProps {
  selected: Network;
  onSelect: (network: Network) => void;
}

const icons = {
  hexagon: Hexagon,
  bitcoin: Coins,
  triangle: Triangle,
};

export function NetworkSelector({ selected, onSelect }: NetworkSelectorProps) {
  return (
    <div className="flex gap-2">
      {NETWORK_OPTIONS.map((opt) => {
        const Icon = icons[opt.icon as keyof typeof icons];
        const isActive = selected === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10"
                : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300 hover:border-slate-600"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
