"use client";

import { RiskLevel, RISK_CONFIG, getVerdict } from "@/lib/metacomp";
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskVerdictProps {
  level: RiskLevel;
}

export function RiskVerdict({ level }: RiskVerdictProps) {
  const verdict = getVerdict(level);
  const config = RISK_CONFIG[level];

  const ShieldIcon =
    level === "Low"
      ? ShieldCheck
      : level === "Medium"
      ? Shield
      : level === "High"
      ? ShieldAlert
      : ShieldX;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border p-5",
      config.bg, config.border
    )}>
      {/* Background glow */}
      <div
        className={cn(
          "absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-15",
          level === "Low" && "bg-emerald-500",
          level === "Medium" && "bg-amber-500",
          level === "High" && "bg-orange-500",
          level === "Severe" && "bg-red-500"
        )}
      />

      <div className="relative">
        <div className="flex items-start gap-3 mb-3">
          <ShieldIcon className={cn("h-6 w-6 mt-0.5", config.text)} />
          <div>
            <h3 className={cn("text-sm font-bold", config.text)}>
              {verdict.title}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {verdict.description}
            </p>
          </div>
        </div>

        <div className={cn(
          "mt-4 p-3 rounded-lg border",
          level === "Severe"
            ? "bg-red-500/10 border-red-500/20"
            : level === "High"
            ? "bg-orange-500/10 border-orange-500/20"
            : level === "Medium"
            ? "bg-amber-500/10 border-amber-500/20"
            : "bg-emerald-500/10 border-emerald-500/20"
        )}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Recommendation
          </div>
          <p className={cn("text-xs font-medium leading-relaxed", config.text)}>
            {verdict.recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}
