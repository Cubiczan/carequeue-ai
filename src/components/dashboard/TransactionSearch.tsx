"use client";

import { useState } from "react";
import { Network } from "@/lib/metacomp";
import { TransactionCheckInput, TransactionCheckResponse } from "@/lib/metacomp";
import { Loader2, Search, Hash, ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RISK_CONFIG } from "@/lib/metacomp";

interface TransactionSearchProps {
  network: Network;
}

interface TxRow extends TransactionCheckInput {
  id: string;
}

export function TransactionSearch({ network }: TransactionSearchProps) {
  const [transactions, setTransactions] = useState<TxRow[]>([
    {
      id: crypto.randomUUID(),
      hash: "",
      asset: "ETH",
      direction: "received",
      from: "",
      to: "",
    },
  ]);
  const [results, setResults] = useState<TransactionCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRow = () => {
    setTransactions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        hash: "",
        asset: network === "Bitcoin" ? "BTC" : network === "Tron" ? "TRX" : "ETH",
        direction: "received",
        from: "",
        to: "",
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (transactions.length <= 1) return;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const updateRow = (id: string, field: keyof TransactionCheckInput, value: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleCheck = async () => {
    const validTxs = transactions.filter((t) => t.hash.trim());
    if (validTxs.length === 0) {
      setError("At least one transaction hash is required");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/metacomp/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network,
          transactionDetails: validTxs.map(({ id, ...rest }) => rest),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transaction check failed");
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Transaction rows */}
      <div className="space-y-3">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                  Transaction Hash
                </label>
                <div className="relative">
                  <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    value={tx.hash}
                    onChange={(e) => updateRow(tx.id, "hash", e.target.value)}
                    placeholder="0x..."
                    className="pl-8 h-8 bg-slate-900/50 border-slate-700/50 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                    Asset
                  </label>
                  <Input
                    value={tx.asset}
                    onChange={(e) => updateRow(tx.id, "asset", e.target.value)}
                    placeholder="ETH"
                    className="h-8 bg-slate-900/50 border-slate-700/50 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                    Direction
                  </label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateRow(tx.id, "direction", "received")}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] font-medium border transition-all ${
                        tx.direction === "received"
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                          : "bg-slate-900/50 border-slate-700/50 text-slate-500 hover:text-slate-400"
                      }`}
                    >
                      <ArrowDown className="h-3 w-3" />
                      In
                    </button>
                    <button
                      onClick={() => updateRow(tx.id, "direction", "sent")}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] font-medium border transition-all ${
                        tx.direction === "sent"
                          ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400"
                          : "bg-slate-900/50 border-slate-700/50 text-slate-500 hover:text-slate-400"
                      }`}
                    >
                      <ArrowUp className="h-3 w-3" />
                      Out
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                    From
                  </label>
                  <Input
                    value={tx.from}
                    onChange={(e) => updateRow(tx.id, "from", e.target.value)}
                    placeholder="0x..."
                    className="h-8 bg-slate-900/50 border-slate-700/50 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                    To
                  </label>
                  <Input
                    value={tx.to}
                    onChange={(e) => updateRow(tx.id, "to", e.target.value)}
                    placeholder="0x..."
                    className="h-8 bg-slate-900/50 border-slate-700/50 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={() => removeRow(tx.id)}
                disabled={transactions.length <= 1}
                className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={addRow}
          className="border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Transaction
        </Button>
        <Button
          onClick={handleCheck}
          disabled={isLoading}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Check Transactions
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {results && results.data && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Results</h3>
          {results.data.transactions.map((tx, idx) => {
            const riskCfg = RISK_CONFIG[tx.riskLevel];
            return (
              <div
                key={idx}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <code className="text-xs font-mono text-slate-400">
                    {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                  </code>
                  <Badge
                    variant="outline"
                    className={`${riskCfg.bg} ${riskCfg.border} ${riskCfg.text} text-[10px]`}
                  >
                    {tx.riskLevel}
                  </Badge>
                </div>
                {tx.alerts && tx.alerts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tx.alerts.map((alert, aIdx) => (
                      <Badge
                        key={aIdx}
                        variant="outline"
                        className="bg-red-500/10 border-red-500/20 text-red-400 text-[10px]"
                      >
                        {alert}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
