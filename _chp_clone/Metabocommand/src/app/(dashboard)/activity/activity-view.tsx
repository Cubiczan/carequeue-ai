"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckboxList } from "@/components/ui/checkbox-list";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { formatDateTime, getInitials, avatarColor, cn } from "@/lib/utils";
import type { ActivityHistoryEntry, UserRole } from "@/lib/supabase/types";

const PAGE_SIZE = 50;

interface ActivityViewProps {
  initialRecords: ActivityHistoryEntry[];
  role: UserRole;
}

export function ActivityView({ initialRecords, role }: ActivityViewProps) {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [exportError, setExportError] = useState<string | null>(null);

  const filterOptions = useMemo(() => {
    const users = new Set<string>();
    const activityTypes = new Set<string>();
    for (const r of initialRecords) {
      users.add(r.user_display_name);
      activityTypes.add(r.activity_type);
    }
    return {
      users: Array.from(users).sort(),
      activityTypes: Array.from(activityTypes).sort(),
    };
  }, [initialRecords]);

  const filtered = useMemo(() => {
    return initialRecords.filter((r) => {
      if (selectedUsers.size > 0 && !selectedUsers.has(r.user_display_name)) return false;
      if (selectedActivityTypes.size > 0 && !selectedActivityTypes.has(r.activity_type)) return false;
      if (dateFrom && r.timestamp < dateFrom) return false;
      if (dateTo && r.timestamp > `${dateTo}T23:59:59Z`) return false;
      return true;
    });
  }, [initialRecords, selectedUsers, selectedActivityTypes, dateFrom, dateTo]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visible.length < filtered.length;

  function clearFilters() {
    setSelectedUsers(new Set());
    setSelectedActivityTypes(new Set());
    setDateFrom("");
    setDateTo("");
    setVisibleCount(PAGE_SIZE);
  }

  function handleExport() {
    setExportError(null);
    if (filtered.length === 0) {
      setExportError("No records to export under the current filter.");
      setTimeout(() => setExportError(null), 4000);
      return;
    }
    const headers = [
      "Timestamp",
      "User Display Name",
      "User Email",
      "Activity Type",
      "Activity Description",
      "Contextual Reference",
    ];
    const rows = filtered.map((r) => [
      r.timestamp,
      r.user_display_name,
      r.user_email,
      r.activity_type,
      r.description,
      r.contextual_reference ?? "",
    ]);
    const csv = buildCsv(headers, rows);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`activity-history-${role}-${today}.csv`, csv);
  }

  const activeFilterCount =
    selectedUsers.size +
    selectedActivityTypes.size +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-end gap-4">
            <CheckboxList
              label="User"
              options={filterOptions.users}
              selected={selectedUsers}
              onChange={(next) => {
                setSelectedUsers(next);
                setVisibleCount(PAGE_SIZE);
              }}
            />
            <CheckboxList
              label="Activity Type"
              options={filterOptions.activityTypes}
              selected={selectedActivityTypes}
              onChange={(next) => {
                setSelectedActivityTypes(next);
                setVisibleCount(PAGE_SIZE);
              }}
            />
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1">From</div>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="h-9 w-40"
              />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1">To</div>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="h-9 w-40"
              />
            </div>
            {activeFilterCount > 0 && (
              <Button size="sm" variant="outline" onClick={clearFilters}>
                Clear filters ({activeFilterCount})
              </Button>
            )}
            <div className="ml-auto">
              <Button size="sm" onClick={handleExport} disabled={filtered.length === 0}>
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>
          {exportError && (
            <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {exportError}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-slate-600">
        <span className="font-medium text-slate-900">{filtered.length}</span> activity record{filtered.length === 1 ? "" : "s"} match the current filters
      </div>

      <div className="space-y-2">
        {visible.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 flex items-start gap-3">
              <div
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0",
                  avatarColor(r.user_email)
                )}
              >
                {getInitials(r.user_display_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-900">{r.user_display_name}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-semibold text-slate-700">{r.activity_type}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500">{formatDateTime(r.timestamp)}</span>
                </div>
                <p className="text-sm text-slate-700 mt-1">{r.description}</p>
                {r.contextual_reference && (
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Ref: {r.contextual_reference}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center">
              <div className="text-sm font-medium text-slate-700">
                No activity records found for the selected filters
              </div>
              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-3"
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              Load more ({filtered.length - visible.length} remaining)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
