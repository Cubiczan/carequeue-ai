import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgentLogView } from "./agent-log-view";
import type { AgentActionLogEntry, UserRole } from "@/lib/supabase/types";

export default async function AgentLogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, avatar_url")
    .eq("id", user.id)
    .single();
  if (!profile?.role) redirect("/role-not-assigned");

  const { data: records } = await supabase
    .from("agent_action_log")
    .select("*")
    .eq("queue", profile.role)
    .order("timestamp", { ascending: false })
    .limit(500);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Agent Action Log</h1>
        <p className="text-sm text-slate-500 mt-1">
          Chronological record of all agent actions for the{" "}
          {profile.role === "finance" ? "Finance" : "Operations"} workspace
        </p>
      </div>

      <AgentLogView
        initialRecords={(records ?? []) as AgentActionLogEntry[]}
        role={profile.role as UserRole}
        currentUser={{
          id: profile.id,
          displayName: profile.display_name,
          email: profile.email,
          avatarUrl: profile.avatar_url,
        }}
      />
    </div>
  );
}
