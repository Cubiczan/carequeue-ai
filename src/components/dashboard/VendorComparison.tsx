"use client";

import { VendorPlatform, VENDOR_NAMES, getVendorHighRiskCount } from "@/lib/metacomp";
import { formatUSD } from "@/lib/metacomp";
import { AlertTriangle, ShieldCheck, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

interface VendorComparisonProps {
  vendors: VendorPlatform[];
}

export function VendorComparison({ vendors }: VendorComparisonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {vendors.map((vendor) => {
        const name = VENDOR_NAMES[vendor.platform] || vendor.platform;
        const alert = vendor.platformWalletAlert;
        const highRiskCount = getVendorHighRiskCount(vendor);

        return (
          <div
            key={vendor.platform}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5"
          >
            {/* Vendor header */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-slate-200">{name}</h4>
              <div className="flex items-center gap-1.5">
                {alert.hasSevereDirectAlert && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 border border-red-500/30 text-red-400">
                    <AlertOctagon className="h-3 w-3" />
                    SEVERE
                  </span>
                )}
                {alert.hasDirectAlert && !alert.hasSevereDirectAlert && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/15 border border-orange-500/30 text-orange-400">
                    <AlertTriangle className="h-3 w-3" />
                    DIRECT ALERT
                  </span>
                )}
                {alert.hasAlert && !alert.hasDirectAlert && !alert.hasSevereDirectAlert && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    ALERT
                  </span>
                )}
                {!alert.hasAlert && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    CLEAR
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <div className="text-[10px] text-slate-500 mb-1">Incoming</div>
                <div className="text-xs font-mono text-emerald-400">{formatUSD(vendor.totalIncoming)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-500 mb-1">Outgoing</div>
                <div className="text-xs font-mono text-cyan-400">{formatUSD(vendor.totalOutgoing)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-500 mb-1">Balance</div>
                <div className="text-xs font-mono text-violet-400">{formatUSD(vendor.walletBalance)}</div>
              </div>
            </div>

            {/* High risk count */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
              <span className="text-[10px] text-slate-500">High-Risk Categories</span>
              <span className={cn(
                "text-xs font-mono font-bold",
                highRiskCount > 0 ? "text-red-400" : "text-emerald-400"
              )}>
                {highRiskCount}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
