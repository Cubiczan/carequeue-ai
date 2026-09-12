import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import type { UserRole } from "@/lib/supabase/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile?.role) redirect("/role-not-assigned");

  return (
    <div className="flex-1 flex bg-slate-50">
      <Sidebar role={profile.role as UserRole} displayName={profile.display_name} email={profile.email} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
