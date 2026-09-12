"use client";

/**
 * WalletConnectButton — Polished Phantom wallet button for SwarmFi
 *
 * Features:
 * - Phantom branding when disconnected
 * - Shows truncated address + SOL balance when connected
 * - Dropdown: Copy Address, Explorer, Disconnect
 * - Arcium encryption badge
 * - Custom styling matching SwarmFi design system
 */

import React, { useState, useRef, useEffect } from "react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  Wallet,
  Copy,
  ExternalLink,
  LogOut,
  ChevronDown,
  Shield,
  CheckCircle,
  Zap,
} from "lucide-react";
import { useSolanaWallet } from "@/lib/wallet";

export default function WalletConnectButton() {
  const { isConnected, address, solBalance, disconnect, connect } = useSolanaWallet();
  const { setVisible } = useWalletModal();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const truncatedAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : "";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClick = () => {
    if (isConnected) {
      setDropdownOpen(!dropdownOpen);
    } else {
      try {
        setVisible(true);
      } catch {
        connect();
      }
    }
  };

  if (!isConnected) {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-semibold hover:from-cyan-400 hover:to-purple-400 transition-all shadow-lg shadow-cyan-500/20"
      >
        {/* Phantom logo SVG */}
        <svg width="18" height="18" viewBox="0 0 109 109" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="54.5" cy="54.5" r="54" stroke="white" strokeWidth="2" strokeOpacity="0.3"/>
          <path d="M81.5 53.5C81.5 69.3 68.8 82 53 82C37.2 82 24.5 69.3 24.5 53.5C24.5 37.7 37.2 25 53 25C68.8 25 81.5 37.7 81.5 53.5Z" fill="white"/>
          <path d="M82.5 52L56 80L39.5 63.5" stroke="#AB9FF2" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Connect Phantom
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/80 border border-border hover:border-cyan-500/30 transition-all text-sm group"
      >
        {/* Connected indicator dot */}
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-50" />
        </div>

        {/* Balance */}
        <span className="text-white font-medium">{solBalance.toFixed(2)} SOL</span>

        {/* Divider */}
        <div className="w-px h-4 bg-slate-600" />

        {/* Address */}
        <span className="text-slate-300 font-mono text-xs">{truncatedAddress}</span>

        {/* Arcium badge */}
        <Shield className="w-3.5 h-3.5 text-purple-400" />

        {/* Chevron */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
            dropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 glass-card p-2 z-50 shadow-xl shadow-black/40">
          {/* Wallet info header */}
          <div className="px-3 py-2 mb-1">
            <div className="text-xs text-slate-400 mb-1">Connected Wallet</div>
            <div className="text-sm text-white font-mono break-all">{address}</div>
          </div>

          <div className="border-t border-border my-1" />

          {/* Actions */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Copy Address"}
          </button>

          <a
            href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            View on Explorer
          </a>

          <a
            href={`https://solana.fm/address/${address}?cluster=devnet-solana`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all"
          >
            <Zap className="w-4 h-4" />
            SolanaFM
          </a>

          <div className="border-t border-border my-1" />

          <button
            onClick={() => {
              disconnect();
              setDropdownOpen(false);
            }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
