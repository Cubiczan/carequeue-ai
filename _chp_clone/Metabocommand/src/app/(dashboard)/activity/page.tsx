import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActivityView } from "./activity-view";
import type { ActivityHistoryEntry, UserRole } from "@/lib/supabase/types";

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile?.role) redirect("/role-not-assigned");

  const { data: records } = await supabase
    .from("activity_history")
    .select("*")
    .eq("user_role", profile.role)
    .order("timestamp", { ascending: false })
    .limit(1000);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity History Log</h1>
        <p className="text-sm text-slate-500 mt-1">
          All user-initiated activities for the{" "}
          {profile.role === "finance" ? "Finance" : "Operations"} workspace
        </p>
      </div>
      <ActivityView
        initialRecords={(records ?? []) as ActivityHistoryEntry[]}
        role={profile.role as UserRole}
      />
    </div>
  );
}
