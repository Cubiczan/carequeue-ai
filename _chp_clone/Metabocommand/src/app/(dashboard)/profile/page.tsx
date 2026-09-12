import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileView } from "./profile-view";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/role-not-assigned");

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Account details, password, and notification preferences
        </p>
      </div>
      <ProfileView
        displayName={profile.display_name}
        email={profile.email}
        role={profile.role}
        notificationPrefs={profile.notification_prefs ?? {
          approvals: true,
          agent_updates: true,
          activity: false,
        }}
      />
    </div>
  );
}
