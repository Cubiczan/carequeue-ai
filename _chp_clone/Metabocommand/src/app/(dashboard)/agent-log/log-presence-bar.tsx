"use client";

import { cn, getInitials, avatarColor } from "@/lib/utils";

export type LogActivityStatus = "idle" | "reviewing" | "filtering";

interface PresenceEntry {
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  activity_status: LogActivityStatus;
}

const statusLabel: Record<LogActivityStatus, string> = {
  idle: "Idle",
  reviewing: "Reviewing log",
  filtering: "Filtering logs",
};

const statusColor: Record<LogActivityStatus, string> = {
  idle: "bg-slate-400",
  reviewing: "bg-blue-500",
  filtering: "bg-yellow-500",
};

export function LogPresenceBar({
  presences,
  currentUserId,
}: {
  presences: PresenceEntry[];
  currentUserId: string;
}) {
  if (presences.length === 0) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">
        Currently viewing
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {presences.map((p) => {
          const isMe = p.user_id === currentUserId;
          return (
            <div
              key={p.user_id}
              className="flex items-center gap-2"
              title={`${p.display_name} — ${statusLabel[p.activity_status]}`}
            >
              <div className="relative">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold",
                    avatarColor(p.email)
                  )}
                >
                  {getInitials(p.display_name)}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
                    statusColor[p.activity_status]
                  )}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-900">
                  {p.display_name} {isMe && <span className="text-slate-500">(You)</span>}
                </span>
                <span className="text-[11px] text-slate-500">
                  {statusLabel[p.activity_status]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
