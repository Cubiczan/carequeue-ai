import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const prefsSchema = z.object({
  approvals: z.boolean(),
  agent_updates: z.boolean(),
  activity: z.boolean(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = prefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, email, role")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ notification_prefs: parsed.data })
    .eq("id", profile.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("activity_history").insert({
    user_id: profile.id,
    user_display_name: profile.display_name,
    user_email: profile.email,
    user_role: profile.role,
    activity_type: "Notification Preferences Updated",
    description: `Updated notification preferences: approvals=${parsed.data.approvals}, agent_updates=${parsed.data.agent_updates}, activity=${parsed.data.activity}`,
  });

  return NextResponse.json({ ok: true });
}
