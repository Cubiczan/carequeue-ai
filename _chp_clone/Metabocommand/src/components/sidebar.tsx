"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  History,
  Settings,
  User,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, getInitials, avatarColor } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/types";

interface SidebarProps {
  role: UserRole;
  displayName: string;
  email: string;
}

export function Sidebar({ role, displayName, email }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const dashboardHref = role === "finance" ? "/finance" : "/operations";
  const dashboardLabel = role === "finance" ? "Finance Dashboard" : "Operations Dashboard";

  const navItems = [
    { href: dashboardHref, label: dashboardLabel, icon: LayoutDashboard },
    { href: "/approvals", label: "Approval Queue", icon: CheckSquare },
    { href: "/agent-log", label: "Agent Action Log", icon: FileText },
    { href: "/activity", label: "Activity History", icon: History },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/profile", label: "Profile", icon: User },
  ];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.from("activity_history").insert({
      user_display_name: displayName,
      user_email: email,
      user_role: role,
      activity_type: "Logout",
      description: "User logged out",
    });
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="text-sm font-semibold text-slate-900">MetaboCommand</div>
        <div className="text-xs text-slate-500 capitalize mt-0.5">{role} workspace</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold",
              avatarColor(email)
            )}
          >
            {getInitials(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{displayName}</div>
            <div className="text-xs text-slate-500 truncate">{email}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-2 w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
