"use client";

import { DirectFlowItem } from "@/lib/metacomp";
import { formatUSD } from "@/lib/metacomp";
import { cn } from "@/lib/utils";
import { AlertTriangle, Shield } from "lucide-react";

interface ExposureChartProps {
  title: string;
  items: DirectFlowItem[];
}

export function ExposureChart({ title, items }: ExposureChartProps) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
          <Shield className="h-4 w-4 mr-2" />
          No exposure detected
        </div>
      </div>
    );
  }

  const maxVal = Math.max(...items.map((i) => i.totalValueUsd), 1);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">{title}</h3>
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {items.map((item, idx) => {
          const width = Math.max((item.totalValueUsd / maxVal) * 100, 2);
          return (
            <div key={idx} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {item.isHighRisk ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                  ) : (
                    <Shield className="h-3.5 w-3.5 text-emerald-400/50" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    item.isHighRisk ? "text-red-300" : "text-slate-400"
                  )}>
                    {item.tagTypeVerbose}
                  </span>
                </div>
                <span className={cn(
                  "text-xs font-mono",
                  item.isHighRisk ? "text-red-300" : "text-slate-400"
                )}>
                  {formatUSD(item.totalValueUsd)}
                </span>
              </div>
              <div className="h-2 bg-slate-700/30 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    item.isHighRisk
                      ? "bg-gradient-to-r from-red-500 to-red-400"
                      : "bg-gradient-to-r from-slate-500 to-slate-400"
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
