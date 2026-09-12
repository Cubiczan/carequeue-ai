"use client";

/**
 * TransactionStatus — Shows real-time Solana transaction progress
 *
 * States: idle → signing → sending → confirming → confirmed | failed
 * Includes link to Solana Explorer for verified transactions.
 */

import React, { useState, useCallback } from "react";
import {
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Shield,
  RotateCcw,
} from "lucide-react";

export type TxStatus = "idle" | "signing" | "sending" | "confirming" | "confirmed" | "failed";

interface TransactionStatusProps {
  status: TxStatus;
  signature?: string;
  error?: string;
  explorerUrl?: string;
  onRetry?: () => void;
  label?: string;
}

const stateConfig: Record<TxStatus, { label: string; color: string; icon: React.ElementType; spinning?: boolean }> = {
  idle: { label: "Ready", color: "text-slate-400", icon: Shield },
  signing: { label: "Awaiting wallet signature...", color: "text-amber-400", icon: Shield, spinning: true },
  sending: { label: "Sending transaction...", color: "text-cyan-400", icon: Loader2, spinning: true },
  confirming: { label: "Confirming on Solana...", color: "text-cyan-400", icon: Loader2, spinning: true },
  confirmed: { label: "Transaction confirmed!", color: "text-green-400", icon: CheckCircle },
  failed: { label: "Transaction failed", color: "text-red-400", icon: XCircle },
};

export default function TransactionStatus({
  status,
  signature,
  error,
  explorerUrl,
  onRetry,
  label,
}: TransactionStatusProps) {
  if (status === "idle") return null;

  const config = stateConfig[status];
  const Icon = config.icon;

  return (
    <div className="glass-card p-4 space-y-3">
      {/* Label */}
      {label && (
        <div className="text-xs text-slate-400 font-medium">{label}</div>
      )}

      <div className="flex items-center gap-3">
        <div className={`${config.color}`}>
          <Icon
            className={`w-5 h-5 ${config.spinning ? "animate-spin" : ""}`}
          />
        </div>
        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
      </div>

      {/* Signature */}
      {signature && (
        <div className="bg-slate-800/50 rounded-lg p-2.5">
          <div className="text-xs text-slate-400 mb-1">Transaction Signature</div>
          <div className="text-xs text-slate-300 font-mono break-all">{signature}</div>
        </div>
      )}

      {/* Error */}
      {error && status === "failed" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
          <div className="text-xs text-red-400">{error}</div>
        </div>
      )}

      {/* Explorer link */}
      {explorerUrl && status === "confirmed" && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View on Solana Explorer
        </a>
      )}

      {/* Retry button */}
      {status === "failed" && onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Retry Transaction
        </button>
      )}

      {/* Progress bar for in-flight transactions */}
      {(status === "signing" || status === "sending" || status === "confirming") && (
        <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 animate-pulse"
            style={{ width: status === "confirming" ? "75%" : status === "sending" ? "50%" : "25%" }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing transaction status in modals.
 * Provides a simple state machine: idle → signing → sending → confirming → confirmed | failed
 */
export function useTransactionStatus() {
  const [status, setStatus] = useState<TxStatus>("idle");
  const [signature, setSignature] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const reset = useCallback(() => {
    setStatus("idle");
    setSignature(undefined);
    setError(undefined);
  }, []);

  const setSigning = useCallback(() => {
    setStatus("signing");
    setSignature(undefined);
    setError(undefined);
  }, []);

  const setSending = useCallback(() => {
    setStatus("sending");
    setSignature(undefined);
    setError(undefined);
  }, []);

  const setConfirming = useCallback((sig: string) => {
    setStatus("confirming");
    setSignature(sig);
    setError(undefined);
  }, []);

  const setConfirmed = useCallback((sig: string) => {
    setStatus("confirmed");
    setSignature(sig);
    setError(undefined);
  }, []);

  const setFailed = useCallback((err: string) => {
    setStatus("failed");
    setError(err);
  }, []);

  return { status, signature, error, reset, setSigning, setSending, setConfirming, setConfirmed, setFailed };
}
