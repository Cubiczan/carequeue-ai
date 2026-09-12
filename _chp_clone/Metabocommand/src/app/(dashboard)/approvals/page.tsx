import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ApprovalQueue } from "./approval-queue";
import type { ApprovalItem, UserRole } from "@/lib/supabase/types";

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, avatar_url")
    .eq("id", user.id)
    .single();
  if (!profile?.role) redirect("/role-not-assigned");

  const { data: items } = await supabase
    .from("approval_items")
    .select("*")
    .eq("queue", profile.role)
    .order("status", { ascending: true })
    .order("submitted_at", { ascending: false });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Approval Queue — {profile.role === "finance" ? "Finance" : "Operations"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review and decide on agent action proposals
        </p>
      </div>
      <ApprovalQueue
        initialItems={(items ?? []) as ApprovalItem[]}
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
