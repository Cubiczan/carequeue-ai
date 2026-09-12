import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsView } from "./settings-view";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile?.role) redirect("/role-not-assigned");

  const [agentsResult, slackResult] = await Promise.all([
    supabase.from("agents").select("*").order("queue").order("name"),
    supabase.from("slack_settings").select("*").order("queue"),
  ]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Data sources, agent thresholds, and Slack integration
        </p>
      </div>

      <SettingsView
        agents={agentsResult.data ?? []}
        slackSettings={slackResult.data ?? []}
      />
    </div>
  );
}
