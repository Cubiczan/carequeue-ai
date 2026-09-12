"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Landmark,
  Bot,
  Settings,
  Coins,
  Gift,
} from "lucide-react";

interface SidebarProps {
  items?: { href: string; label: string; icon: React.ElementType }[];
}

export default function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();

  const defaultItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/prediction-markets", label: "Markets", icon: BarChart3 },
    { href: "/token", label: "$SWARM Token", icon: Coins },
    { href: "/fees", label: "Fee Sharing", icon: Gift },
    { href: "/vaults", label: "Vaults", icon: Landmark },
    { href: "/agents", label: "Agents", icon: Bot },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const navItems = items || defaultItems;

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen border-r border-border bg-card/50 pt-20 px-3 py-6 fixed left-0 top-0">
      <div className="space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const isBagsPage = item.href === "/token" || item.href === "/fees";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? isBagsPage
                    ? "bg-purple-500/10 text-purple-400 border-l-2 border-purple-400"
                    : "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              {isBagsPage && (
                <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400">
                  Bags
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bags Integration Badge */}
      <div className="mt-auto px-3">
        <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-purple-400">Bags Program</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Powered by Bags SDK — $SWARM token with on-chain fee-sharing for oracle providers
          </p>
        </div>
      </div>
    </aside>
  );
}
