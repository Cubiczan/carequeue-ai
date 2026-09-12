"use client";

import { useState } from "react";
import { Network, validateAddress } from "@/lib/metacomp";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WalletSearchProps {
  network: Network;
  onSearch: (address: string) => void;
  isLoading: boolean;
}

export function WalletSearch({ network, onSearch, isLoading }: WalletSearchProps) {
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validationError = validateAddress(network, address.trim());
    if (validationError) {
      setError(validationError);
      return;
    }
    onSearch(address.trim());
  };

  const placeholders: Record<Network, string> = {
    Ethereum: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    Bitcoin: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    Tron: "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7",
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-slate-500" />
          <input
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setError(null);
            }}
            placeholder={placeholders[network]}
            className={cn(
              "w-full pl-12 pr-32 py-3.5 bg-slate-800/80 border rounded-xl text-sm font-mono text-slate-200 placeholder:text-slate-600 transition-all duration-200 focus:outline-none focus:ring-2",
              error
                ? "border-red-500/50 focus:ring-red-500/20"
                : "border-slate-700/50 focus:border-emerald-500/40 focus:ring-emerald-500/20"
            )}
          />
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "absolute right-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
              isLoading
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning
              </span>
            ) : (
              "Analyze"
            )}
          </button>
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}
    </form>
  );
}
